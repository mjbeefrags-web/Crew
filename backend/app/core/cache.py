"""Small read-through cache for public catalog responses.

Redis is used when configured (compose/staging/production). A short-lived
process-local copy sits in front of it: the API normally runs in a different
region from Neon and Upstash, where every network round trip costs ~100-150ms.
Serving repeat reads from memory removes those round trips entirely. Redis is
still the source of truth between workers, and a pub/sub message invalidates
every worker's local copy as soon as an admin edit clears the catalog.
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
INVALIDATION_CHANNEL = "catalog:invalidate"
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
        self._invalidation_task: asyncio.Task[None] | None = None

    def _remember(self, key: str, payload: bytes | str, ttl: int) -> None:
        value = payload.encode() if isinstance(payload, str) else payload
        self.memory[key] = (time.time() + ttl, value)

    def _forget(self, prefix: str = CACHE_PREFIX) -> None:
        for key in [key for key in self.memory if key.startswith(prefix)]:
            self.memory.pop(key, None)

    async def get(self, key: str) -> Any | None:
        entry = self.memory.get(key)
        if entry is not None:
            expires_at, payload = entry
            if expires_at > time.time():
                self.hits += 1
                return orjson.loads(payload)
            self.memory.pop(key, None)

        payload: bytes | str | None = None
        if self.redis is not None:
            try:
                payload = await self.redis.get(key)
            except Exception:
                payload = None

        if payload is None:
            self.misses += 1
            # Do not SREM on every miss: that was an extra cross-region round
            # trip. Tracking keys left behind by expired values are harmless;
            # clear_prefix() removes them in one pipelined delete.
            return None

        self.hits += 1
        self._remember(key, payload, DEFAULT_TTL)
        return orjson.loads(payload)

    async def set(self, key: str, payload: bytes, ttl: int = DEFAULT_TTL) -> None:
        self._remember(key, payload, ttl)
        if self.redis is None:
            return
        try:
            # One round trip for both commands instead of two.
            pipe = self.redis.pipeline(transaction=False)
            pipe.set(key, payload, ex=ttl)
            pipe.sadd(KEY_SET, key)
            await pipe.execute()
        except Exception:
            pass

    async def clear_prefix(self, prefix: str = CACHE_PREFIX) -> None:
        self._forget(prefix)
        if self.redis is None:
            return
        try:
            keys = await self.redis.smembers(KEY_SET)
            tracked = [
                key
                for key in keys
                if isinstance(key, str) and key.startswith(prefix)
            ]
            if tracked:
                pipe = self.redis.pipeline(transaction=False)
                pipe.delete(*tracked)
                pipe.srem(KEY_SET, *tracked)
                await pipe.execute()
            else:
                async for key in self.redis.scan_iter(match=f"{prefix}*"):
                    await self.redis.delete(key)
        except Exception:
            pass
        try:
            # Tell every worker to drop its memory copy, even if the Redis
            # delete above failed.
            await self.redis.publish(INVALIDATION_CHANNEL, prefix)
        except Exception:
            pass

    async def start(self) -> None:
        """Listen for cross-worker invalidations. Safe to call more than once."""
        if self.redis is None or self._invalidation_task is not None:
            return
        self._invalidation_task = asyncio.create_task(self._listen())

    async def close(self) -> None:
        task = self._invalidation_task
        if task is None:
            return
        self._invalidation_task = None
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

    async def _listen(self) -> None:
        while True:
            pubsub = None
            try:
                pubsub = self.redis.pubsub()
                await pubsub.subscribe(INVALIDATION_CHANNEL)
                async for message in pubsub.listen():
                    if message.get("type") != "message":
                        continue
                    data = message.get("data")
                    prefix = data.decode() if isinstance(data, bytes) else str(data)
                    if prefix.startswith(CACHE_PREFIX):
                        self._forget(prefix)
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(1)
            finally:
                if pubsub is not None:
                    try:
                        await pubsub.close()
                    except Exception:
                        pass


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
