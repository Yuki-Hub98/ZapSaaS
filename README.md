# ZapSaaS — WhatsApp Bot SaaS

Sistema SaaS multi-tenant para agendamentos via WhatsApp bot.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind v4
- **Backend**: FastAPI + PostgreSQL + Redis + Alembic
- **WhatsApp**: WAHA (devlikeapro/waha) — Core gratuito
- **Infra**: Docker Compose

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Portas livres: `5173` (frontend), `8000` (backend), `8080` (WAHA), `5432` (PostgreSQL), `6379` (Redis)

---

## Configuração

### 1. Clone e configure o `.env`

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
# PostgreSQL
POSTGRES_USER=saas_user
POSTGRES_PASSWORD=minhasenhaforte123
POSTGRES_DB=saas_db
DATABASE_URL=postgresql+asyncpg://saas_user:minhasenhaforte123@postgres:5432/saas_db

# Redis
REDIS_URL=redis://redis:6379

# JWT
SECRET_KEY=sua-chave-secreta-aqui

# WAHA
WAHA_API_URL=http://waha:3000
WAHA_API_KEY=umasenhaqualquer123
```

---

### 2. Suba os containers

```bash
docker-compose up -d
```

Aguarde todos os containers subirem:

```bash
docker-compose ps
```

---

### 3. Rode as migrations do banco de dados

```bash
docker-compose exec backend alembic upgrade head
```

Isso aplica todas as migrations em ordem:
- `956e8f9e5bc4` — Usuários e empresas
- `da4e28a3edbb` — Serviços, agendamentos e horários
- `003_whatsapp_sessions` — Sessões WhatsApp
- `004_add_bot_active_to_companies` — Campo bot_active

---

### 4. Crie o usuário Super Admin

```bash
docker-compose exec backend python scripts/create_admin.py
```

Credenciais padrão:
- Email: `admin@zapsaas.com`
- Senha: `admin123`

---

### 5. Configure o WAHA (webhook)

O container `waha-setup` faz isso automaticamente ao subir. Verifique:

```bash
docker-compose logs waha-setup
```

Se precisar reconfigurar manualmente após restart:

```bash
docker-compose up -d --force-recreate waha-setup
```

---

### 6. Acesse o painel

```
http://localhost:5173
```

---

## Seed de dados para testes

### Inserir empresa de teste

```bash
docker-compose exec -T postgres psql -U saas_user -d saas_db -c "
INSERT INTO companies (id, name, email, phone, active, created_at)
VALUES (
  'd0a291a6-8b5c-4855-aeab-99a3d543f642',
  'Salão Maria',
  'salao@email.com',
  '92999999999',
  true,
  now()
) ON CONFLICT DO NOTHING;
"
```

### Inserir mapeamento de sessão WhatsApp

```bash
docker-compose exec -T postgres psql -U saas_user -d saas_db -c "
INSERT INTO whatsapp_sessions (id, session_name, company_id, provider)
VALUES (
  gen_random_uuid(),
  'default',
  'd0a291a6-8b5c-4855-aeab-99a3d543f642',
  'waha'
) ON CONFLICT DO NOTHING;
"
```

### Inserir serviços de exemplo

```bash
docker-compose exec -T postgres psql -U saas_user -d saas_db -c "
INSERT INTO services (id, company_id, name, duration_minutes, price, active, created_at) VALUES
  (gen_random_uuid(), 'd0a291a6-8b5c-4855-aeab-99a3d543f642', 'Corte Feminino', 60, 80.00, true, now()),
  (gen_random_uuid(), 'd0a291a6-8b5c-4855-aeab-99a3d543f642', 'Coloração', 120, 200.00, true, now()),
  (gen_random_uuid(), 'd0a291a6-8b5c-4855-aeab-99a3d543f642', 'Escova', 45, 60.00, true, now()),
  (gen_random_uuid(), 'd0a291a6-8b5c-4855-aeab-99a3d543f642', 'Manicure', 45, 35.00, true, now());
"
```

---

## Conectando o WhatsApp

1. Acesse o painel da empresa
2. Vá em **WhatsApp**
3. Clique em **Conectar WhatsApp**
4. Escaneie o QR Code com o celular
5. O bot começará a responder automaticamente

---

## Fluxo do bot

```
Cliente: "oi"
Bot: Menu (1-Agendar, 2-Serviços, 3-Agendamentos, 4-Atendente)

Cliente: "1"
Bot: "Qual é o seu nome?"

Cliente: "João"
Bot: "Qual é o seu número de WhatsApp?"

Cliente: "92999999999"
Bot: Lista de serviços

Cliente: "1" (Corte Feminino)
Bot: Lista de dias disponíveis

Cliente: "1" (Segunda, 13/05)
Bot: Lista de horários

Cliente: "2" (10:00)
Bot: Confirmação do agendamento

Cliente: "1"
Bot: "Agendamento confirmado! ✅"
```

---

## Estrutura do projeto

```
project/
├── backend/
│   ├── app/
│   │   ├── bot/           # Fluxo do bot
│   │   ├── core/          # Config, segurança, deps
│   │   ├── db/            # Models e session
│   │   ├── routers/       # Endpoints da API
│   │   ├── schemas/       # Schemas Pydantic
│   │   └── whatsapp/      # Provider WAHA
│   ├── alembic/           # Migrations
│   └── scripts/           # Scripts utilitários
├── frontend/
│   └── src/
│       ├── pages/         # Páginas do painel
│       ├── components/    # Componentes reutilizáveis
│       ├── hooks/         # Hooks customizados
│       └── auth/          # Autenticação
└── docker-compose.yml
```

---

## Comandos úteis

```bash
# Ver logs do backend
docker-compose logs -f backend

# Ver logs do bot
docker-compose logs -f backend | grep "BOT"

# Ver logs do WAHA
docker-compose logs -f waha

# Restartar apenas o backend
docker-compose restart backend

# Acessar o banco
docker-compose exec postgres psql -U saas_user -d saas_db

# Reconfigurar webhook após restart do WAHA
docker-compose up -d --force-recreate waha-setup

# Rodar migrations
docker-compose exec backend alembic upgrade head
```

---

## Credenciais padrão

| Serviço | URL | Usuário | Senha |
|---------|-----|---------|-------|
| Painel | http://localhost:5173 | admin@zapsaas.com | admin123 |
| WAHA Dashboard | http://localhost:8080/dashboard | admin | admin123 |
| API Docs | http://localhost:8000/docs | — | — |

---

## Limitações conhecidas

- **WAHA Core**: suporta apenas 1 sessão (`default`) — multi-tenant requer WAHA Plus ($19/mês)
- **@lid**: usuários Android com privacidade avançada — WAHA resolve automaticamente para envio
- **Webhook**: some ao reiniciar o WAHA — use `docker-compose up -d --force-recreate waha-setup`
- **Fuso horário**: sistema configurado para `America/Manaus` (UTC-4)
