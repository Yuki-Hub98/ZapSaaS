import json
import redis.asyncio as redis
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.whatsapp.service import WhatsAppService
from app.core.config import settings
from app.db.session import get_db
from app.db.models.service import Service
from app.db.models.appointment import Appointment, Client
from zoneinfo import ZoneInfo

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

STEP_MENU      = "menu"
STEP_NOME      = "nome"
STEP_TELEFONE = "telefone"
STEP_SERVICO   = "servico"
STEP_DIA       = "dia"
STEP_HORARIO   = "horario"
STEP_CONFIRMAR = "confirmar"


class BotFlow:
    def __init__(self, company_id: str, sender: str, svc: WhatsAppService):
        self.company_id = company_id
        self.sender = sender
        self.svc = svc
        self.state_key = f"state:{company_id}:{sender}"

    async def get_state(self) -> dict:
        try:
            raw = await redis_client.get(self.state_key)
            return json.loads(raw) if raw else {"step": STEP_MENU}
        except Exception:
            return {"step": STEP_MENU}

    async def set_state(self, state: dict, ttl: int = 3600):
        try:
            await redis_client.setex(self.state_key, ttl, json.dumps(state))
        except Exception:
            pass

    async def reset(self):
        try:
            await redis_client.delete(self.state_key)
        except Exception:
            pass

    async def _send(self, text: str):
        await self.svc.send_text(self.company_id, self.sender, text)

    async def process(self, body: str, push_name: str = ""):
        print(f"[BOT] Mensagem recebida: company={self.company_id} sender={self.sender} body={body}")
        state = await self.get_state()
        step = state.get("step", STEP_MENU)
        body_lower = body.strip().lower()

        # Salva push_name no estado se ainda não tiver
        if push_name and not state.get("push_name"):
            state["push_name"] = push_name
            await self.set_state(state)

        if body_lower in {"menu", "0", "oi", "olá", "ola", "inicio", "início", "hi", "hello"}:
            await self.reset()
            await self._send_menu()
            return

        if step == STEP_MENU:
            await self._handle_menu(body_lower, state)
        elif step == STEP_NOME:
            await self._handle_nome(body.strip(), state)
        elif step == STEP_TELEFONE:
            await self._handle_telefone(body.strip(), state)
        elif step == STEP_SERVICO:
            await self._handle_servico(body_lower, state)
        elif step == STEP_DIA:
            await self._handle_dia(body_lower, state)
        elif step == STEP_HORARIO:
            await self._handle_horario(body_lower, state)
        elif step == STEP_CONFIRMAR:
            await self._handle_confirmar(body_lower, state)
        else:
            await self._send_menu()

    async def _send_menu(self):
        await self._send(
            "Olá! Bem-vindo ao nosso salão 👋\n\n"
            "Como posso te ajudar?\n\n"
            "1️⃣ Agendar horário\n"
            "2️⃣ Ver serviços e valores\n"
            "3️⃣ Meus agendamentos\n"
            "4️⃣ Falar com atendente\n\n"
            "_Digite o número da opção._"
        )

    async def _handle_menu(self, body: str, state: dict):
        if body == "1":
            await self.set_state({"step": STEP_NOME})
            await self._send("Para agendar, primeiro preciso saber seu nome. 😊\n\nComo você se chama?")
        elif body == "2":
            servicos = await self._get_servicos()
            if not servicos:
                await self._send("Nenhum serviço cadastrado no momento.\n\nDigite *0* para voltar ao menu.")
                return
            texto = "💰 *Nossos serviços:*\n\n"
            for s in servicos:
                texto += f"• {s['name']} — R$ {s['price']:.2f} ({s['duration_minutes']}min)\n"
            texto += "\nDigite *0* para voltar ao menu."
            await self._send(texto)
        elif body == "3":
            await self._send("📅 Em breve você poderá ver seus agendamentos aqui!\n\nDigite *0* para voltar ao menu.")
        elif body == "4":
            await self._send("👤 Aguarde, em breve um atendente irá falar com você.")
        else:
            await self._send_menu()

    async def _handle_nome(self, nome: str, state: dict):
        if len(nome) < 2:
            await self._send("Por favor, digite seu nome completo. 😊")
            return
        state["step"] = STEP_TELEFONE
        state["nome"] = nome
        await self.set_state(state)
        await self._send(
            f"Prazer, *{nome}*! 😊\n\n"
            f"Qual é o seu número de WhatsApp?\n"
            f"_Ex: 92999999999_"
        )

    async def _handle_telefone(self, telefone: str, state: dict):
        # valida mínimo 10 dígitos
        nums = "".join(filter(str.isdigit, telefone))
        if len(nums) < 10:
            await self._send("Por favor, digite um número válido. Ex: 92999999999")
            return

        state["step"] = STEP_SERVICO
        state["telefone"] = nums
        await self.set_state(state)

        servicos = await self._get_servicos()
        if not servicos:
            await self._send("Desculpe, não há serviços disponíveis.\n\nDigite *0* para voltar ao menu.")
            await self.reset()
            return

        state["servicos"] = servicos
        await self.set_state(state)

        texto = f"📋 *Escolha o serviço:*\n\n"
        for i, s in enumerate(servicos, 1):
            texto += f"{i}️⃣ {s['name']} — R$ {s['price']:.2f} ({s['duration_minutes']}min)\n"
        texto += "\nDigite o número do serviço ou *0* para voltar ao menu."
        await self._send(texto)

    async def _handle_servico(self, body: str, state: dict):
        servicos = state.get("servicos", [])
        try:
            idx = int(body) - 1
            if idx < 0 or idx >= len(servicos):
                raise ValueError
        except ValueError:
            await self._send(f"Por favor, digite um número entre 1 e {len(servicos)}.")
            return

        servico = servicos[idx]
        state["step"] = STEP_DIA
        state["servico"] = servico
        await self.set_state(state)

        # Mostra próximos 5 dias úteis
        dias = self._get_proximos_dias(5)
        state["dias"] = dias
        await self.set_state(state)

        texto = f"✅ *{servico['name']}* selecionado!\n\n📅 *Escolha o dia:*\n\n"
        for i, d in enumerate(dias, 1):
            texto += f"{i}️⃣ {d['label']}\n"
        texto += "\nDigite o número do dia ou *0* para voltar ao menu."
        await self._send(texto)

    async def _handle_dia(self, body: str, state: dict):
        dias = state.get("dias", [])
        try:
            idx = int(body) - 1
            if idx < 0 or idx >= len(dias):
                raise ValueError
        except ValueError:
            await self._send(f"Por favor, digite um número entre 1 e {len(dias)}.")
            return

        dia = dias[idx]
        state["step"] = STEP_HORARIO
        state["dia"] = dia
        await self.set_state(state)

        # Horários disponíveis (9h às 18h de hora em hora)
        horarios = self._get_horarios_disponiveis(dia["date"])
        if not horarios:
            await self._send("Não há horários disponíveis neste dia. Escolha outro dia.\n\nDigite *0* para voltar ao menu.")
            state["step"] = STEP_DIA
            await self.set_state(state)
            return

        state["horarios"] = horarios
        await self.set_state(state)

        texto = f"📅 *{dia['label']}*\n\n⏰ *Horários disponíveis:*\n\n"
        for i, h in enumerate(horarios, 1):
            texto += f"{i}️⃣ {h}\n"
        texto += "\nDigite o número do horário ou *0* para voltar ao menu."
        await self._send(texto)

    async def _handle_horario(self, body: str, state: dict):
        horarios = state.get("horarios", [])
        try:
            idx = int(body) - 1
            if idx < 0 or idx >= len(horarios):
                raise ValueError
        except ValueError:
            await self._send(f"Por favor, digite um número entre 1 e {len(horarios)}.")
            return

        horario = horarios[idx]
        state["step"] = STEP_CONFIRMAR
        state["horario"] = horario
        await self.set_state(state)

        servico = state["servico"]
        dia = state["dia"]
        nome = state["nome"]

        await self._send(
            f"📋 *Confirme seu agendamento:*\n\n"
            f"👤 Nome: *{nome}*\n"
            f"✂️ Serviço: *{servico['name']}*\n"
            f"📅 Dia: *{dia['label']}*\n"
            f"⏰ Horário: *{horario}*\n"
            f"💰 Valor: *R$ {servico['price']:.2f}*\n\n"
            f"Digite *1* para confirmar ou *0* para cancelar."
        )

    async def _handle_confirmar(self, body: str, state: dict):
        if body != "1":
            await self.reset()
            await self._send("Agendamento cancelado. Digite *0* para voltar ao menu.")
            return

        # Salva no banco
        try:
            await self._salvar_agendamento(state)
            nome = state["nome"]
            servico = state["servico"]
            dia = state["dia"]
            horario = state["horario"]
            await self._send(
                f"✅ *Agendamento confirmado!*\n\n"
                f"Olá, *{nome}*! Seu horário está marcado.\n\n"
                f"✂️ {servico['name']}\n"
                f"📅 {dia['label']} às {horario}\n"
                f"💰 R$ {servico['price']:.2f}\n\n"
                f"Até lá! 😊\n\n"
                f"_Para remarcar ou cancelar, entre em contato._"
            )
        except Exception as e:
            print(f"[BOT] Erro ao salvar agendamento: {e}")
            await self._send("Desculpe, ocorreu um erro ao confirmar o agendamento. Tente novamente.")
        finally:
            await self.reset()

    async def _get_servicos(self) -> list:
        async for db in get_db():
            result = await db.execute(
                select(Service).where(
                    Service.company_id == self.company_id,
                    Service.active == True
                )
            )
            servicos = result.scalars().all()
            return [
                {
                    "id": str(s.id),
                    "name": s.name,
                    "price": float(s.price),
                    "duration_minutes": s.duration_minutes,
                }
                for s in servicos
            ]
        return []

    def _get_proximos_dias(self, n: int) -> list:
        dias = []
        manaus_tz = ZoneInfo("America/Manaus")
        hoje = datetime.now(manaus_tz).date()
        d = hoje + timedelta(days=1)
        dias_semana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        while len(dias) < n:
            if d.weekday() < 6:
                label = f"{dias_semana[d.weekday()]}, {d.strftime('%d/%m')}"
                dias.append({"date": d.isoformat(), "label": label})
            d += timedelta(days=1)
        return dias

    def _get_horarios_disponiveis(self, date_str: str) -> list:
        # Horários fixos por enquanto (9h às 17h)
        return ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]

    async def _salvar_agendamento(self, state: dict):
        nome = state["nome"]
        servico = state["servico"]
        dia = state["dia"]
        horario = state["horario"]

        # Monta datetime do agendamento
        date = datetime.fromisoformat(dia["date"])
        hour, minute = map(int, horario.split(":"))

        # Salva no horário de Manaus (UTC-4)
        manaus_tz = ZoneInfo("America/Manaus")
        scheduled_at = datetime(
            date.year, date.month, date.day,
            hour, minute, tzinfo=manaus_tz
        )

        async for db in get_db():
            # Busca ou cria cliente
            from sqlalchemy import select as sa_select
            result = await db.execute(
                sa_select(Client).where(
                    Client.company_id == self.company_id,
                    Client.phone == self.sender
                )
            )
            client = result.scalar_one_or_none()

            if not client:
                client = Client(
                    company_id=self.company_id,
                    name=nome,
                    phone=state.get("telefone", self.sender),
                )
                db.add(client)
                await db.flush()

            # Cria agendamento
            appointment = Appointment(
                company_id=self.company_id,
                client_id=client.id,
                service_id=servico["id"],
                scheduled_at=scheduled_at,
                price_snapshot=servico["price"],
                status="pending",
                payment_status="pending",
            )
            db.add(appointment)
            await db.commit()
            print(f"[BOT] Agendamento salvo: {appointment.id}")
            return