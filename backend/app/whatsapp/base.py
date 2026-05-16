from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class TextMessage:
    company_id: str
    to: str          # número destino: "5511999990000"
    body: str


@dataclass
class MediaMessage:
    company_id: str
    to: str
    url: str
    caption: Optional[str] = None


@dataclass
class SendResult:
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class WhatsAppProvider(ABC):
    """
    Interface que todos os providers precisam implementar.
    O resto do sistema só conhece essa classe — nunca o provider concreto.
    """

    @abstractmethod
    async def send_text(self, msg: TextMessage) -> SendResult:
        ...

    @abstractmethod
    async def send_media(self, msg: MediaMessage) -> SendResult:
        ...

    @abstractmethod
    async def get_session_status(self, company_id: str) -> str:
        """Retorna: 'connected' | 'disconnected' | 'qr_pending'"""
        ...

    @abstractmethod
    async def get_qr_code(self, company_id: str) -> Optional[str]:
        """Retorna base64 do QR Code ou None se já conectado."""
        ...

    @abstractmethod
    async def disconnect(self, company_id: str) -> bool:
        ...