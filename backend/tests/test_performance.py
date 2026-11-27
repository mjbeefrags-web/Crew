import os
import time

import pytest
from sqlalchemy import text

from app.db.session import engine


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, int(len(ordered) * fraction) - 1)]


@pytest.mark.asyncio
async def test_public_read_latency(client) -> None:
    durations: list[float] = []
    for _ in range(20):
        started = time.perf_counter()
        response = await client.get("/api/v1/products?pageSize=24")
        durations.append((time.perf_counter() - started) * 1000)
        assert response.status_code == 200
    assert percentile(durations, 0.95) < 250


@pytest.mark.asyncio
async def test_cached_read_latency(client) -> None:
    await client.get("/api/v1/products?pageSize=24")
    durations: list[float] = []
    for _ in range(20):
        started = time.perf_counter()
        response = await client.get("/api/v1/products?pageSize=24")
        durations.append((time.perf_counter() - started) * 1000)
        assert response.status_code == 200
    assert percentile(durations, 0.95) < 100


@pytest.mark.skipif(
    not os.getenv("DATABASE_URL", "").startswith("postgres"),
    reason="EXPLAIN checks require the PostgreSQL test database",
)
@pytest.mark.asyncio
async def test_catalog_query_uses_indexes() -> None:
    async with engine.connect() as connection:
        plan = await connection.execute(
            text(
                "EXPLAIN SELECT id FROM products "
                "WHERE status = 'active' ORDER BY created_at DESC LIMIT 24"
            )
        )
        description = " ".join(str(row[0]) for row in plan.all())
    assert "Seq Scan" not in description
