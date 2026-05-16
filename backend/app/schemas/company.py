from datetime import datetime
from pydantic import BaseModel, EmailStr


class CreateCompanyRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    pix_key: str | None = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    pix_key: str | None
    active: bool
    created_at: datetime  # ← era str, agora datetime

    model_config = {"from_attributes": True}


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int