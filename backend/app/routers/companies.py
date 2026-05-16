from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import httpx
from app.db.models.service import Service, BusinessHours, BlockedDate
from app.db.models.appointment import Appointment, Client
from app.db.session import get_db
from app.db.models.user import User, Company
from app.core.deps import get_current_super_admin, get_current_company_user
from app.core.security import hash_password
from app.core.config import settings
from app.schemas.company import CreateCompanyRequest, CompanyResponse, CompanyListResponse
from app.whatsapp.evolution_provider import EvolutionProvider
from pydantic import BaseModel

router = APIRouter(prefix="/companies", tags=["companies"])

class BotSettingsUpdate(BaseModel):
    bot_active: bool

def get_evolution() -> EvolutionProvider:
    return EvolutionProvider(
        base_url=settings.EVOLUTION_API_URL,
        api_key=settings.EVOLUTION_API_KEY,
    )


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    body: CreateCompanyRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
    evolution: EvolutionProvider = Depends(get_evolution),
):
    # Verifica se email já existe
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    # Cria empresa
    company = Company(
        name=body.name,
        email=body.email,
        phone=body.phone,
        pix_key=body.pix_key,
    )
    db.add(company)
    await db.flush()

    # Cria usuário COMPANY_ADMIN
    user = User(
        company_id=company.id,
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role="COMPANY_ADMIN",
    )
    db.add(user)
    await db.commit()
    await db.refresh(company)

    # Cria instância na Evolution automaticamente
    try:
        await evolution._create_instance(str(company.id))
    except Exception:
        pass  # não falha o cadastro se a Evolution estiver fora

    return company


@router.get("", response_model=CompanyListResponse)
async def list_companies(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
):
    result = await db.execute(select(Company).order_by(Company.created_at.desc()))
    companies = result.scalars().all()
    total = await db.execute(select(func.count()).select_from(Company))

    return CompanyListResponse(
        items=list(companies),
        total=total.scalar_one(),
    )


@router.patch("/{company_id}/toggle", response_model=CompanyResponse)
async def toggle_company(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
    evolution: EvolutionProvider = Depends(get_evolution),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    company.active = not company.active
    await db.commit()
    await db.refresh(company)

    try:
        if not company.active:
            # Suspender → desconecta o WhatsApp
            await evolution.disconnect(company_id)
        else:
            # Reativar → recria instância se não existir
            await evolution._create_instance(company_id)
    except Exception:
        pass

    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
    evolution: EvolutionProvider = Depends(get_evolution),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    # Desconecta e deleta instância na Evolution
    try:
        await evolution.disconnect(company_id)
        async with httpx.AsyncClient(timeout=10) as client:
            await client.delete(
                f"{settings.EVOLUTION_API_URL}/instance/delete/{company_id}",
                headers={"apikey": settings.EVOLUTION_API_KEY},
            )
    except Exception:
        pass

    # Deleta na ordem correta respeitando foreign keys:
    # 1. Agendamentos (referencia clients e services)
    appointments = (await db.execute(
        select(Appointment).where(Appointment.company_id == company_id)
    )).scalars().all()
    for a in appointments:
        await db.delete(a)

    # 2. Clientes
    clients = (await db.execute(
        select(Client).where(Client.company_id == company_id)
    )).scalars().all()
    for c in clients:
        await db.delete(c)

    # 3. Serviços
    services = (await db.execute(
        select(Service).where(Service.company_id == company_id)
    )).scalars().all()
    for s in services:
        await db.delete(s)

    # 4. Horários e datas bloqueadas
    hours = (await db.execute(
        select(BusinessHours).where(BusinessHours.company_id == company_id)
    )).scalars().all()
    for h in hours:
        await db.delete(h)

    blocked = (await db.execute(
        select(BlockedDate).where(BlockedDate.company_id == company_id)
    )).scalars().all()
    for b in blocked:
        await db.delete(b)

    # 5. Usuários
    users = (await db.execute(
        select(User).where(User.company_id == company_id)
    )).scalars().all()
    for u in users:
        await db.delete(u)

    # 6. Empresa
    await db.delete(company)
    await db.commit()

@router.patch("/me/bot-settings")
async def update_bot_settings(
    body: BotSettingsUpdate,
    user: User = Depends(get_current_company_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.id == user.company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    company.bot_active = body.bot_active
    await db.commit()
    return {"bot_active": company.bot_active}

@router.get("/me/bot-settings")
async def get_bot_settings(
    user: User = Depends(get_current_company_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.id == user.company_id)
    )
    company = result.scalar_one_or_none()
    return {"bot_active": company.bot_active if company else True}