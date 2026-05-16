import httpx
from app.whatsapp.base import WhatsAppProvider, TextMessage, MediaMessage, SendResult
import asyncio
import base64


class WahaProvider(WhatsAppProvider):
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "X-Api-Key": api_key,
            "Content-Type": "application/json",
        }

    async def start_session(self) -> bool:
            # Para a sessão atual se estiver rodando
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{self.base_url}/api/sessions/default/stop",
                    headers=self.headers
                )
            await asyncio.sleep(2)
            # Inicia nova sessão
            async with httpx.AsyncClient(timeout=10) as client:
                try:
                    res = await client.post(
                        f"{self.base_url}/api/sessions/default/start",
                        headers=self.headers
                    )
                    return res.status_code in (200, 201)
                except Exception:
                    return False

    async def get_session_status(self, company_id: str) -> str:
        session_name = "default"  # Core só tem default
        url = f"{self.base_url}/api/sessions/{session_name}"
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                res = await client.get(url, headers=self.headers)
                if res.status_code == 404:
                    return "disconnected"
                data = res.json()
                status = data.get("status", "")
                if status == "WORKING":
                    return "connected"
                elif status == "SCAN_QR_CODE":
                    return "qr_pending"
                elif status == "STARTING":
                    return "qr_pending"
                else:
                    return "disconnected"
            except Exception:
                return "disconnected"

    async def get_qr_code(self, company_id: str) -> str | None:
        session_name = "default"
        url = f"{self.base_url}/api/{session_name}/auth/qr?format=image"
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.get(url, headers=self.headers)
                if res.status_code != 200:
                    return None
                # Converte PNG para base64
                img_base64 = base64.b64encode(res.content).decode("utf-8")
                return img_base64
            except Exception:
                return None

    async def disconnect(self, company_id: str) -> bool:
        # url = f"{self.base_url}/api/sessions/{company_id}/stop"
        url = f"{self.base_url}/api/sessions/default/stop"
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                res = await client.post(url, headers=self.headers)
                return res.status_code in (200, 201)
            except Exception:
                return False

    async def send_text(self, msg: TextMessage) -> SendResult:
        url = f"{self.base_url}/api/sendText"
        payload = {
            "chatId": msg.to,
            "text": msg.body,
            "session": "default", # WAHA Core só tem sessão default, para ativar sessão de varios usuarios precisa ter o Plus
        }
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                res = await client.post(url, json=payload, headers=self.headers)
                res.raise_for_status()
                data = res.json()
                return SendResult(success=True, message_id=data.get("id"))
            except httpx.HTTPStatusError as e:
                return SendResult(success=False, error=str(e))

    async def send_media(self, msg: MediaMessage) -> SendResult:
        return SendResult(success=False, error="Not implemented")

    async def _create_instance(self, company_id: str) -> bool:
        return True  # WAHA Core só tem sessão default