from app.whatsapp.base import WhatsAppProvider, TextMessage, MediaMessage, SendResult


class WhatsAppService:
    """
    Camada de negócio do WhatsApp.
    Toda lógica de alto nível fica aqui — os routers só chamam esse serviço.
    O provider concreto (Evolution ou Cloud API) é injetado no construtor.
    """

    def __init__(self, provider: WhatsAppProvider):
        self.provider = provider

    async def send_text(self, company_id: str, to: str, body: str) -> SendResult:
        msg = TextMessage(company_id=company_id, to=to, body=body)
        return await self.provider.send_text(msg)

    async def send_appointment_confirmation(
        self,
        company_id: str,
        to: str,
        client_name: str,
        service: str,
        datetime_str: str,
        price: float,
        pix_key: str,
    ) -> SendResult:
        body = (
            f"✅ *Agendamento confirmado!*\n\n"
            f"Olá, *{client_name}*!\n\n"
            f"📋 Serviço: {service}\n"
            f"📅 Data: {datetime_str}\n"
            f"💰 Valor: R$ {price:.2f}\n\n"
            f"Pix para pagamento:\n`{pix_key}`\n\n"
            f"Até lá! 😊"
        )
        return await self.send_text(company_id, to, body)

    async def send_reminder(
        self,
        company_id: str,
        to: str,
        client_name: str,
        service: str,
        datetime_str: str,
    ) -> SendResult:
        body = (
            f"🔔 *Lembrete de agendamento*\n\n"
            f"Olá, *{client_name}*! Lembrando do seu horário:\n\n"
            f"📋 {service}\n"
            f"📅 {datetime_str}\n\n"
            f"Até amanhã! 👋"
        )
        return await self.send_text(company_id, to, body)

    async def send_menu(self, company_id: str, to: str, company_name: str) -> SendResult:
        body = (
            f"Olá! Bem-vindo ao *{company_name}* 👋\n\n"
            f"Como posso te ajudar?\n\n"
            f"1️⃣ Agendar horário\n"
            f"2️⃣ Ver serviços e valores\n"
            f"3️⃣ Meus agendamentos\n"
            f"4️⃣ Falar com atendente\n\n"
            f"_Digite o número da opção._"
        )
        return await self.send_text(company_id, to, body)

    async def get_connection_info(self, company_id: str) -> dict:
        status = await self.provider.get_session_status(company_id)
        qr = None
        if status == "qr_pending":
            qr = await self.provider.get_qr_code(company_id)
        return {"status": status, "qr_code": qr}

    async def disconnect(self, company_id: str) -> bool:
        return await self.provider.disconnect(company_id)