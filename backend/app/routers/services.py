from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.service import Service, BusinessHours, BlockedDate
from app.core.deps import get_current_company_user
from app.schemas.service import (
    CreateServiceRequest, UpdateServiceRequest, ServiceResponse,
    BusinessHoursRequest, BusinessHoursResponse,
    BlockedDateRequest, BlockedDateResponse,
)

router = APIRouter(prefix="/services", tags=["services"])
hours_router = APIRouter(prefix="/business-hours", tags=["business-hours"])
blocked_router = APIRouter(prefix="/blocked-dates", tags=["blocked-dates"])


# ── Serviços ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ServiceResponse])
async def list_services(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    result = await db.execute(
        select(Service)
        .where(Service.company_id == user.company_id)
        .order_by(Service.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    body: CreateServiceRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    service = Service(
        company_id=user.company_id,
        name=body.name,
        price=body.price,
        duration_minutes=body.duration_minutes,
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    body: UpdateServiceRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.company_id == user.company_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(service, field, value)

    await db.commit()
    await db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.company_id == user.company_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    await db.delete(service)
    await db.commit()


# ── Horários de funcionamento ─────────────────────────────────────────────────

@hours_router.get("", response_model=list[BusinessHoursResponse])
async def get_business_hours(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    result = await db.execute(
        select(BusinessHours)
        .where(BusinessHours.company_id == user.company_id)
        .order_by(BusinessHours.weekday)
    )
    hours = result.scalars().all()
    return [BusinessHoursResponse.from_model(h) for h in hours]


@hours_router.put("", response_model=list[BusinessHoursResponse])
async def upsert_business_hours(
    body: list[BusinessHoursRequest],
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    """Salva todos os horários de uma vez (upsert por weekday)."""
    for item in body:
        result = await db.execute(
            select(BusinessHours).where(
                BusinessHours.company_id == user.company_id,
                BusinessHours.weekday == item.weekday,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.is_open = item.is_open
            existing.open_time = item.open_time
            existing.close_time = item.close_time
            existing.slot_duration = item.slot_duration
        else:
            db.add(BusinessHours(
                company_id=user.company_id,
                weekday=item.weekday,
                is_open=item.is_open,
                open_time=item.open_time,
                close_time=item.close_time,
                slot_duration=item.slot_duration,
            ))

    await db.commit()

    result = await db.execute(
        select(BusinessHours)
        .where(BusinessHours.company_id == user.company_id)
        .order_by(BusinessHours.weekday)
    )
    hours = result.scalars().all()
    return [BusinessHoursResponse.from_model(h) for h in hours]


# ── Datas bloqueadas ──────────────────────────────────────────────────────────

@blocked_router.get("", response_model=list[BlockedDateResponse])
async def list_blocked_dates(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    result = await db.execute(
        select(BlockedDate)
        .where(BlockedDate.company_id == user.company_id)
        .order_by(BlockedDate.date)
    )
    return result.scalars().all()


@blocked_router.post("", response_model=BlockedDateResponse, status_code=status.HTTP_201_CREATED)
async def add_blocked_date(
    body: BlockedDateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    blocked = BlockedDate(
        company_id=user.company_id,
        date=body.date,
        reason=body.reason,
    )
    db.add(blocked)
    await db.commit()
    await db.refresh(blocked)
    return blocked


@blocked_router.delete("/{blocked_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_blocked_date(
    blocked_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    result = await db.execute(
        select(BlockedDate).where(
            BlockedDate.id == blocked_id,
            BlockedDate.company_id == user.company_id,
        )
    )
    blocked = result.scalar_one_or_none()
    if not blocked:
        raise HTTPException(status_code=404, detail="Data não encontrada")

    await db.delete(blocked)
    await db.commit()