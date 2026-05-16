import asyncio
import httpx
from app.whatsapp.base import (
    WhatsAppProvider, TextMessage, MediaMessage, SendResult
)


class EvolutionProvider(WhatsAppProvider):
    """
    Provider MVP usando Evolution API v2.0.10 (Baileys por baixo).
    Fluxo v2.0.10:
      1. POST /instance/create        → cria instância
      2. GET  /instance/connect       → retorna QR Code
      3. GET  /instance/connectionState → verifica status
      4. DELETE /instance/logout      → desconecta
      5. DELETE /instance/delete      → remove instância
    """

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "apikey": api_key,
            "Content-Type": "application/json",
        }

    async def _create_instance(self, company_id: str) -> bool:
        url = f"{self.base_url}/instance/create"
        payload = {"instanceName": company_id}
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.post(url, json=payload, headers=self.headers)
                return res.status_code in (200, 201)
            except Exception:
                return False

    async def get_session_status(self, company_id: str) -> str:
        url = f"{self.base_url}/instance/connectionState/{company_id}"
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                res = await client.get(url, headers=self.headers)
                if res.status_code == 404:
                    return "disconnected"
                res.raise_for_status()
                state = res.json().get("instance", {}).get("state", "")
                return "connected" if state == "open" else "disconnected"
            except Exception:
                return "disconnected"

    async def get_qr_code(self, company_id: str) -> str | None:
        url = f"{self.base_url}/instance/connect/{company_id}"
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.get(url, headers=self.headers)
                if res.status_code == 404:
                    created = await self._create_instance(company_id)
                    if not created:
                        return None
                    await asyncio.sleep(3)
                    res = await client.get(url, headers=self.headers)
                res.raise_for_status()
                data = res.json()
                qr = data.get("base64")
                if not qr:
                    return None
                if qr.startswith("data:image"):
                    qr = qr.split(",", 1)[1]
                return qr
            except Exception:
                return None

    async def disconnect(self, company_id: str) -> bool:
        url = f"{self.base_url}/instance/logout/{company_id}"
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                res = await client.delete(url, headers=self.headers)
                return res.status_code in (200, 201, 400)
            except Exception:
                return False

    async def send_text(self, msg: TextMessage) -> SendResult:
        url = f"{self.base_url}/message/sendText/{msg.company_id}"
        payload = {
            "number": msg.to,
            "text": msg.body,  # ← v2.0.10 usa "text" direto, não "textMessage"
        }
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.post(url, json=payload, headers=self.headers)
                res.raise_for_status()
                data = res.json()
                return SendResult(success=True, message_id=data.get("key", {}).get("id"))
            except httpx.HTTPStatusError as e:
                return SendResult(success=False, error=str(e))

    async def send_media(self, msg: MediaMessage) -> SendResult:
        url = f"{self.base_url}/message/sendMedia/{msg.company_id}"
        payload = {
            "number": msg.to,
            "options": {"delay": 800},
            "mediaMessage": {
                "mediatype": "image",
                "media": msg.url,
                "caption": msg.caption or "",
            },
        }
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.post(url, json=payload, headers=self.headers)
                res.raise_for_status()
                data = res.json()
                return SendResult(success=True, message_id=data.get("key", {}).get("id"))
            except httpx.HTTPStatusError as e:
                return SendResult(success=False, error=str(e))