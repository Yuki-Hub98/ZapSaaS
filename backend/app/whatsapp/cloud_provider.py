import httpx
from app.whatsapp.base import (
    WhatsAppProvider, TextMessage, MediaMessage, SendResult
)

META_API = "https://graph.facebook.com/v19.0"


class CloudAPIProvider(WhatsAppProvider):
    """
    Provider oficial Meta — WhatsApp Cloud API.
    Ative isso quando tiver clientes pagantes e quiser estabilidade total.
    Mesma interface que EvolutionProvider — troca sem alterar nada além
    da injeção de dependência em main.py.
    """

    def __init__(self, token: str, phone_number_id: str):
        self.token = token
        self.phone_number_id = phone_number_id
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def send_text(self, msg: TextMessage) -> SendResult:
        url = f"{META_API}/{self.phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": msg.to,
            "type": "text",
            "text": {"body": msg.body},
        }
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.post(url, json=payload, headers=self.headers)
                res.raise_for_status()
                data = res.json()
                return SendResult(
                    success=True,
                    message_id=data["messages"][0]["id"]
                )
            except httpx.HTTPStatusError as e:
                return SendResult(success=False, error=str(e))

    async def send_media(self, msg: MediaMessage) -> SendResult:
        url = f"{META_API}/{self.phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": msg.to,
            "type": "image",
            "image": {"link": msg.url, "caption": msg.caption or ""},
        }
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.post(url, json=payload, headers=self.headers)
                res.raise_for_status()
                data = res.json()
                return SendResult(
                    success=True,
                    message_id=data["messages"][0]["id"]
                )
            except httpx.HTTPStatusError as e:
                return SendResult(success=False, error=str(e))

    async def get_session_status(self, company_id: str) -> str:
        # Cloud API não tem sessão — número sempre conectado se configurado
        return "connected"

    async def get_qr_code(self, company_id: str) -> str | None:
        # Cloud API não usa QR Code
        return None

    async def disconnect(self, company_id: str) -> bool:
        # Cloud API não tem disconnect
        return True