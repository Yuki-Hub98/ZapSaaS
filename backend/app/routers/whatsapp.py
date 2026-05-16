from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.db.session import get_db
from app.db.models.user import User
from app.core.deps import get_current_company_user
from app.whatsapp.service import WhatsAppService
from app.whatsapp.waha_provider import WahaProvider
from app.core.config import settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


def get_whatsapp_service() -> WhatsAppService:
    provider = WahaProvider(
        base_url=settings.WAHA_API_URL,
        api_key=settings.WAHA_API_KEY,
    )
    return WhatsAppService(provider=provider)


@router.get("/status")
async def get_status(
    user: User = Depends(get_current_company_user),
    svc: WhatsAppService = Depends(get_whatsapp_service),
):
    info = await svc.get_connection_info(str(user.company_id))
    return info


@router.post("/connect")
async def connect(
    user: User = Depends(get_current_company_user),
    svc: WhatsAppService = Depends(get_whatsapp_service),
):
    # Inicia a sessão no WAHA
    await svc.provider.start_session()
    # Aguarda ficar em SCAN_QR_CODE
    await asyncio.sleep(3)
    # Retorna status + QR
    info = await svc.get_connection_info(str(user.company_id))
    return info


@router.delete("/disconnect")
async def disconnect(
    user: User = Depends(get_current_company_user),
    svc: WhatsAppService = Depends(get_whatsapp_service),
):
    ok = await svc.disconnect(str(user.company_id))
    return {"disconnected": ok}