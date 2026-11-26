"""Create or reset an administrator account.

Usage:
    python -m app.create_admin --email admin@crewww.local --password '...'
    docker compose exec api python -m app.create_admin --email ... --password ...

The password is never echoed when it is prompted interactively. Re-running the
command for an existing account requires ``--force`` and resets the password and
role in place.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import User


def _prompt_password() -> str:
    first = getpass.getpass("Admin password (min 12 characters): ")
    second = getpass.getpass("Confirm password: ")
    if first != second:
        raise SystemExit("Passwords do not match.")
    return first


async def create_admin(
    *,
    email: str,
    password: str,
    first_name: str = "Store",
    last_name: str = "Administrator",
    force: bool = False,
) -> tuple[str, bool]:
    """Create (or force-reset) an admin. Returns (email, created)."""
    email = email.strip().lower()
    if len(password) < 12:
        raise SystemExit("Password must be at least 12 characters.")
    if "@" not in email:
        raise SystemExit("A valid email address is required.")

    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            user = await session.scalar(select(User).where(User.email == email))
            created = user is None
            if user is None:
                session.add(
                    User(
                        email=email,
                        password_hash=hash_password(password),
                        first_name=first_name,
                        last_name=last_name,
                        role="admin",
                        is_active=True,
                        email_verified=True,
                    )
                )
            else:
                if not force:
                    raise SystemExit(
                        f"{email} already exists. Re-run with --force to reset its password."
                    )
                user.password_hash = hash_password(password)
                user.role = "admin"
                user.is_active = True
                user.email_verified = True
                user.first_name = first_name
                user.last_name = last_name
            await session.commit()
    finally:
        await engine.dispose()
    return email, created


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create a Crewww administrator account.")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument(
        "--password",
        help="Admin password (min 12 chars). Prompted when omitted.",
    )
    parser.add_argument("--first-name", default="Store")
    parser.add_argument("--last-name", default="Administrator")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Reset the password and promote an existing account",
    )
    args = parser.parse_args(argv)

    password = args.password or _prompt_password()
    email, created = asyncio.run(
        create_admin(
            email=args.email,
            password=password,
            first_name=args.first_name,
            last_name=args.last_name,
            force=args.force,
        )
    )
    action = "Created" if created else "Updated"
    print(f"{action} admin: {email}")
    print("Sign in at /login, then open /admin.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
