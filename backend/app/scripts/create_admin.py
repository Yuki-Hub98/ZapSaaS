"""
Script para criar o primeiro usuário SUPER_ADMIN.
Rode uma vez após as migrações:

  docker-compose exec backend python -m app.scripts.create_admin
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.core.security import hash_password


async def main():
    async with AsyncSessionLocal() as db:
        admin = User(
            name="Super Admin",
            email="admin@zapsaas.com",
            hashed_password=hash_password("admin123"),
            role="SUPER_ADMIN",
            company_id=None,
        )
        db.add(admin)
        await db.commit()
        print("✅ Super Admin criado!")
        print("   Email: admin@zapsaas.com")
        print("   Senha: admin123")
        print("   ⚠️  Troque a senha em produção!")


asyncio.run(main())