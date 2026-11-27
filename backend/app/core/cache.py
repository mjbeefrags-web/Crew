"""Small read-through cache for public catalog responses.

Redis is used when configured (compose/staging/production). Local development
and tests transparently fall back to a process-local TTL cache, so the API
never takes a dependency on a running Redis for correctness.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from functools import wraps
from typing import Any

import orjson
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from redis.asyncio import Redis

CACHE_PREFIX = "catalog:"
KEY_SET = "catalog:keys"
# Catalog data changes through admin writes, which invalidate this prefix.
# A longer TTL keeps repeat visits fast without serving stale data after edits.
DEFAULT_TTL = 300


class ResponseCache:
    def __init__(self, redis: Redis | None) -> None:
        self.redis = redis
        self.memory: dict[str, tuple[float, bytes]] = {}
        self.lock = asyncio.Lock()
        self.hits = 0
        self.misses = 0

    async def get(self, key: str) -> Any | None:
        payload: bytes | str | None = None
        if self.redis is not None:
            try:
                payload = await self.redis.get(key)
            except Exception:
                payload = None
        if payload is None:
            entry = self.memory.get(key)
            if entry is not None:
                expires_at, payload = entry
                if expires_at <= time.time():
                    self.memory.pop(key, None)
                    payload = None
        if payload is None:
            self.misses += 1
            return None
        self.hits += 1
        return orjson.loads(payload)

    async def set(self, key: str, payload: bytes, ttl: int = DEFAULT_TTL) -> None:
        if self.redis is None:
            # Only use the process-local cache when Redis is not configured.
            # With several Uvicorn workers a local copy cannot be invalidated
            # by another worker, and unbounded query strings would leak memory.
            self.memory[key] = (time.time() + ttl, payload)
            return
        try:
            await self.redis.setex(key, ttl, payload)
            # Track keys explicitly so invalidation is one DEL, not SCAN.
            await self.redis.sadd(KEY_SET, key)
        except Exception:
            pass

    async def clear_prefix(self, prefix: str = CACHE_PREFIX) -> None:
        if self.redis is not None:
            try:
                keys = await self.redis.smembers(KEY_SET)
                tracked = [
                    key
                    for key in keys
                    if isinstance(key, str) and key.startswith(prefix)
                ]
                if tracked:
                    await self.redis.delete(*tracked)
                else:
                    async for key in self.redis.scan_iter(match=f"{prefix}*"):
                        await self.redis.delete(key)
                if tracked:
                    await self.redis.srem(KEY_SET, *tracked)
            except Exception:
                pass
        for key in [key for key in self.memory if key.startswith(prefix)]:
            self.memory.pop(key, None)


def cache_for(request: Request) -> ResponseCache:
    cache: ResponseCache | None = getattr(request.app.state, "catalog_cache", None)
    if cache is None:
        cache = ResponseCache(getattr(request.app.state, "redis", None))
        request.app.state.catalog_cache = cache
    return cache


def cached(ttl: int = DEFAULT_TTL):
    """Cache a public GET handler by its query string."""

    def decorate(handler: Callable[..., Awaitable[Any]]):
        @wraps(handler)
        async def wrapper(request: Request, *args: Any, **kwargs: Any) -> Any:
            cache = cache_for(request)
            key = f"{CACHE_PREFIX}{handler.__name__}:{request.url.path}:{request.url.query}"
            hit = await cache.get(key)
            if hit is not None:
                return hit
            value = await handler(request, *args, **kwargs)
            payload = orjson.dumps(
                jsonable_encoder(value), option=orjson.OPT_NON_STR_KEYS
            )
            await cache.set(key, payload, ttl)
            return value

        return wrapper

    return decorate


async def invalidate_catalog(request: Request) -> None:
    await cache_for(request).clear_prefix()
