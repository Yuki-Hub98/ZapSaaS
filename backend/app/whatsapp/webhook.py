from fastapi import APIRouter, Request, HTTPException, Depends
from app.whatsapp.service import WhatsAppService
from app.whatsapp.waha_provider import WahaProvider
from app.core.config import settings
from app.bot.flow import BotFlow
from app.db.session import get_db
from app.db.models.whatsapp_session import WhatsAppSession
from sqlalchemy import select
import json
import time
from app.db.models.user import Company

router = APIRouter(prefix="/webhook", tags=["webhook"])

async def get_company_id_by_session(session_name: str) -> str | None:
    async for db in get_db():
        result = await db.execute(
            select(WhatsAppSession).where(WhatsAppSession.session_name == session_name)
        )
        ws = result.scalar_one_or_none()
        return str(ws.company_id) if ws else None


def get_whatsapp_service() -> WhatsAppService:
    return WhatsAppService(
            WahaProvider(
                base_url=settings.WAHA_API_URL,
                api_key=settings.WAHA_API_KEY,
        )
    )


@router.post("/whatsapp")
async def receive_message(
    request: Request,
    svc: WhatsAppService = Depends(get_whatsapp_service),
):
    payload = await request.json()
    # ── Normalização WAHA ──────────────────────────────────────────────
    if "payload" in payload and "session" in payload:
        event = payload.get("event", "")
        if event != "message":
            return {"ok": True}

        data = payload["payload"]
        session_name = payload.get("session")
        company_id = await get_company_id_by_session(session_name)

        if not company_id:
            return {"ok": True}

        if not await get_bot_active(company_id):
            return {"ok": True}

        from_me = data.get("fromMe", False)
        sender = data.get("from", "")
        body = data.get("body", "").strip()

        # Ignora grupos, @lid e mensagens próprias
        if "@g.us" in sender or from_me or not body:
            return {"ok": True}

        msg_timestamp = data.get("timestamp", 0)
        if time.time() - msg_timestamp > 30:
            return {"ok": True}

    elif "data" in payload:
        event = payload.get("event", "")
        if event not in ("MESSAGES_UPSERT", "messages.upsert"):
            return {"ok": True}

        data = payload["data"]
        print("[DATA]: ", data)
        company_id = payload.get("instance")
        remote_jid = data.get("key", {}).get("remoteJid", "")
        from_me = data.get("key", {}).get("fromMe", False)

        # Ignora grupos, @lid e mensagens próprias
        if "@g.us" in remote_jid:
            return {"ok": True}
        if "@lid" in remote_jid:
            return {"ok": True}
        if from_me:
            return {"ok": True}

        sender = remote_jid
        body = (
            data.get("message", {}).get("conversation", "") or
            data.get("message", {}).get("extendedTextMessage", {}).get("text", "")
        ).strip()

        if not body:
            return {"ok": True}

    elif "entry" in payload:
        try:
            entry = payload["entry"][0]["changes"][0]["value"]
            msg = entry["messages"][0]
            company_id = entry["metadata"]["phone_number_id"]
            sender = msg["from"]
            body = msg.get("text", {}).get("body", "").strip()
        except (KeyError, IndexError):
            return {"ok": True}

    else:
        return {"ok": True}

    flow = BotFlow(company_id=company_id, sender=sender, svc=svc)
    push_name = data.get("_data", {}).get("notifyName", "") or payload.get("me", {}).get("pushName", "")
    await flow.process(body, push_name=push_name)

    return {"ok": True}

@router.get("/whatsapp")
async def verify_webhook(request: Request):
    params = dict(request.query_params)
    verify_token = "SEU_VERIFY_TOKEN_AQUI"
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == verify_token
    ):
        return int(params["hub.challenge"])
    raise HTTPException(status_code=403, detail="Token inválido")


async def get_bot_active(company_id: str) -> bool:
    async for db in get_db():
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        return company.bot_active if company else True
    return True
