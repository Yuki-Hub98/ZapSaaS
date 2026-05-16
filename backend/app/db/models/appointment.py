import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Client(Base):
    """Cliente final que agenda pelo WhatsApp."""
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)  # número WhatsApp
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Appointment(Base):
    """Agendamento criado pelo bot do WhatsApp."""
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False
    )
    client_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False
    )
    service_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("services.id"), nullable=False
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Status do agendamento
    # pending → confirmed → done | cancelled
    status: Mapped[str] = mapped_column(String(20), default="pending")

    # Valor snapshot no momento do agendamento (não muda se o preço mudar depois)
    price_snapshot: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Pagamento
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | confirmed | failed

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)