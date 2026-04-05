"""
One-time script to create the initial admin user.
Run inside the backend container after first `docker compose up`:

    docker compose exec backend python -m backend.create_admin
"""
import asyncio
import os
import sys

async def main():
    username = os.getenv("ADMIN_USERNAME", "admin")
    email = os.getenv("ADMIN_EMAIL", "admin@homelab.local")
    password = os.getenv("ADMIN_PASSWORD", "")

    if not password:
        print("ERROR: Set ADMIN_PASSWORD environment variable", file=sys.stderr)
        sys.exit(1)

    from backend.core.database import AsyncSessionLocal
    from backend.core.auth import hash_password
    from backend.models.user import User, UserRole
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            print(f"User '{username}' already exists. Skipping.")
            return
        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.admin,
        )
        db.add(user)
        await db.commit()
        print(f"Admin user '{username}' created successfully.")


if __name__ == "__main__":
    asyncio.run(main())
