from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models.appointment import Appointment, Client
from app.db.models.service import Service
from app.db.models.user import User
from app.core.deps import get_current_company_user
from pydantic import BaseModel

router = APIRouter(prefix="/appointments", tags=["appointments"])

class UpdateAppointment(BaseModel):
    status: str | None = None
    payment_status: str | None = None

@router.get("")
async def list_appointments(
    user: User = Depends(get_current_company_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment, Client, Service)
        .join(Client, Client.id == Appointment.client_id)
        .join(Service, Service.id == Appointment.service_id)
        .where(Appointment.company_id == user.company_id)
        .order_by(Appointment.scheduled_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(a.id),
            "client_name": c.name,
            "client_phone": c.phone,
            "service_name": s.name,
            "scheduled_at": a.scheduled_at.isoformat(),
            "status": a.status,
            "payment_status": a.payment_status,
            "price": float(a.price_snapshot),
        }
        for a, c, s in rows
    ]


@router.patch("/{appointment_id}")
async def update_appointment(
        appointment_id: str,
        body: UpdateAppointment,
        user: User = Depends(get_current_company_user),
        db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.company_id == user.company_id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    if body.status:
        appointment.status = body.status
    if body.payment_status:
        appointment.payment_status = body.payment_status

    await db.commit()
    return {"ok": True}