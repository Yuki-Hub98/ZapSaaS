from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.appointment import Appointment, Client
from app.db.models.service import Service
from app.core.deps import get_current_company_user

router = APIRouter(prefix="/metrics", tags=["metrics"])

MANAUS_TZ = ZoneInfo("America/Manaus")


def now_manaus() -> datetime:
    return datetime.now(MANAUS_TZ)


def start_of_day_manaus() -> datetime:
    now = now_manaus()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def start_of_month_manaus() -> datetime:
    now = now_manaus()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


# Converte scheduled_at para Manaus no PostgreSQL
def at_manaus(col):
    return func.timezone("America/Manaus", col)


@router.get("/dashboard")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_company_user),
):
    today_start = start_of_day_manaus()
    month_start = start_of_month_manaus()
    thirty_days_ago = now_manaus() - timedelta(days=30)
    company_id = user.company_id

    # ── Receita hoje ──────────────────────────────────────────────────────────
    revenue_today = await db.execute(
        select(func.coalesce(func.sum(Appointment.price_snapshot), 0))
        .where(
            Appointment.company_id == company_id,
            Appointment.status == "done",
            at_manaus(Appointment.scheduled_at) >= today_start,
        )
    )

    # ── Receita do mês ────────────────────────────────────────────────────────
    revenue_month = await db.execute(
        select(func.coalesce(func.sum(Appointment.price_snapshot), 0))
        .where(
            Appointment.company_id == company_id,
            Appointment.status == "done",
            at_manaus(Appointment.scheduled_at) >= month_start,
        )
    )

    # ── Agendamentos hoje ─────────────────────────────────────────────────────
    today_end = today_start + timedelta(days=1)
    appointments_today = await db.execute(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.company_id == company_id,
            at_manaus(Appointment.scheduled_at) >= today_start,
            at_manaus(Appointment.scheduled_at) < today_end,
            Appointment.status != "cancelled",
        )
    )

    # ── Agendamentos do mês ───────────────────────────────────────────────────
    appointments_month = await db.execute(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.company_id == company_id,
            at_manaus(Appointment.scheduled_at) >= month_start,
            Appointment.status != "cancelled",
        )
    )

    # ── Pagamentos pendentes ──────────────────────────────────────────────────
    pending_payments = await db.execute(
        select(func.coalesce(func.sum(Appointment.price_snapshot), 0))
        .where(
            Appointment.company_id == company_id,
            Appointment.payment_status == "pending",
            Appointment.status != "cancelled",
        )
    )

    # ── Novos clientes do mês ─────────────────────────────────────────────────
    new_clients = await db.execute(
        select(func.count())
        .select_from(Client)
        .where(
            Client.company_id == company_id,
            func.timezone("America/Manaus", Client.created_at) >= month_start,
        )
    )

    # ── Serviço mais vendido ──────────────────────────────────────────────────
    top_service = await db.execute(
        select(Service.name, func.count(Appointment.id).label("total"))
        .join(Appointment, Appointment.service_id == Service.id)
        .where(
            Appointment.company_id == company_id,
            at_manaus(Appointment.scheduled_at) >= month_start,
            Appointment.status != "cancelled",
        )
        .group_by(Service.name)
        .order_by(func.count(Appointment.id).desc())
        .limit(1)
    )
    top_service_row = top_service.first()

    # ── Receita por dia (últimos 30 dias) ─────────────────────────────────────
    date_col = func.date(at_manaus(Appointment.scheduled_at)).label("date")
    daily_revenue = await db.execute(
        select(
            date_col,
            func.coalesce(func.sum(Appointment.price_snapshot), 0).label("revenue"),
        )
        .where(
            Appointment.company_id == company_id,
            Appointment.status == "done",
            at_manaus(Appointment.scheduled_at) >= thirty_days_ago,
        )
        .group_by(date_col)
        .order_by(date_col)
    )

    # ── Serviços mais vendidos (top 5) ────────────────────────────────────────
    top_services = await db.execute(
        select(Service.name, func.count(Appointment.id).label("total"))
        .join(Appointment, Appointment.service_id == Service.id)
        .where(
            Appointment.company_id == company_id,
            at_manaus(Appointment.scheduled_at) >= month_start,
            Appointment.status != "cancelled",
        )
        .group_by(Service.name)
        .order_by(func.count(Appointment.id).desc())
        .limit(5)
    )

    # ── Agendamentos por hora (heatmap) ───────────────────────────────────────
    hour_col = func.extract("hour", at_manaus(Appointment.scheduled_at)).label("hour")
    hourly = await db.execute(
        select(
            hour_col,
            func.count(Appointment.id).label("total"),
        )
        .where(
            Appointment.company_id == company_id,
            Appointment.status != "cancelled",
        )
        .group_by(hour_col)
        .order_by(hour_col)
    )

    # ── Ticket médio ──────────────────────────────────────────────────────────
    ticket_medio = await db.execute(
        select(func.coalesce(func.avg(Appointment.price_snapshot), 0))
        .where(
            Appointment.company_id == company_id,
            Appointment.status == "done",
            at_manaus(Appointment.scheduled_at) >= month_start,
        )
    )

    return {
        "kpis": {
            "revenue_today": float(revenue_today.scalar()),
            "revenue_month": float(revenue_month.scalar()),
            "appointments_today": appointments_today.scalar(),
            "appointments_month": appointments_month.scalar(),
            "pending_payments": float(pending_payments.scalar()),
            "new_clients_month": new_clients.scalar(),
            "top_service": top_service_row[0] if top_service_row else None,
            "ticket_medio": float(ticket_medio.scalar()),
        },
        "daily_revenue": [
            {"date": str(row.date), "revenue": float(row.revenue)}
            for row in daily_revenue.all()
        ],
        "top_services": [
            {"name": row.name, "total": row.total}
            for row in top_services.all()
        ],
        "hourly_appointments": [
            {"hour": int(row.hour), "total": row.total}
            for row in hourly.all()
        ],
    }