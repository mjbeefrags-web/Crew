from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

# SQLite (local dev and unit tests) does not use the same pool implementation as
# PostgreSQL, so pool sizing is only applied to server databases.
_engine_options: dict[str, object] = {
    "pool_pre_ping": True,
    "echo": settings.db_echo,
}
if not settings.database_url.startswith("sqlite"):
    _engine_options.update(
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle_seconds,
        pool_timeout=settings.db_pool_timeout_seconds,
        pool_use_lifo=True,
    )

engine = create_async_engine(settings.database_url, **_engine_options)
SessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session
