from datetime import datetime
from pydantic import BaseModel, field_validator


# ── Serviços ──────────────────────────────────────────────────────────────────

class CreateServiceRequest(BaseModel):
    name: str
    price: float
    duration_minutes: int

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Preço deve ser maior que zero")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def duration_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Duração deve ser maior que zero")
        return v


class UpdateServiceRequest(BaseModel):
    name: str | None = None
    price: float | None = None
    duration_minutes: int | None = None
    active: bool | None = None


class ServiceResponse(BaseModel):
    id: str
    company_id: str
    name: str
    price: float
    duration_minutes: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Horários de funcionamento ─────────────────────────────────────────────────

WEEKDAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


class BusinessHoursRequest(BaseModel):
    weekday: int        # 0=segunda ... 6=domingo
    is_open: bool
    open_time: str | None = None    # "09:00"
    close_time: str | None = None   # "18:00"
    slot_duration: int = 30


class BusinessHoursResponse(BaseModel):
    id: str
    company_id: str
    weekday: int
    weekday_name: str
    is_open: bool
    open_time: str | None
    close_time: str | None
    slot_duration: int

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, obj: object) -> "BusinessHoursResponse":
        return cls(
            id=obj.id,  # type: ignore
            company_id=obj.company_id,  # type: ignore
            weekday=obj.weekday,  # type: ignore
            weekday_name=WEEKDAY_NAMES[obj.weekday],  # type: ignore
            is_open=obj.is_open,  # type: ignore
            open_time=obj.open_time,  # type: ignore
            close_time=obj.close_time,  # type: ignore
            slot_duration=obj.slot_duration,  # type: ignore
        )


# ── Datas bloqueadas ──────────────────────────────────────────────────────────

class BlockedDateRequest(BaseModel):
    date: str       # "2025-12-25"
    reason: str | None = None


class BlockedDateResponse(BaseModel):
    id: str
    company_id: str
    date: str
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}