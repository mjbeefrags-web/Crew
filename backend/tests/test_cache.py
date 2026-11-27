import pytest

from app.core.cache import CACHE_PREFIX, KEY_SET, ResponseCache


class StubPipeline:
    def __init__(self, redis: "StubRedis") -> None:
        self.redis = redis

    def set(self, key: str, value: bytes, ex: int | None = None) -> "StubPipeline":
        self.redis.calls.append(("set", key))
        self.redis.data[key] = value
        return self

    def sadd(self, key: str, member: str) -> "StubPipeline":
        self.redis.calls.append(("sadd", key))
        self.redis.keys.add(member)
        return self

    def delete(self, *keys: str) -> "StubPipeline":
        self.redis.calls.append(("delete", *keys))
        for key in keys:
            self.redis.data.pop(key, None)
        return self

    def srem(self, key: str, *members: str) -> "StubPipeline":
        self.redis.calls.append(("srem", key, *members))
        for member in members:
            self.redis.keys.discard(member)
        return self

    async def execute(self) -> list[object]:
        self.redis.calls.append(("execute",))
        return [True]


class StubRedis:
    def __init__(self) -> None:
        self.data: dict[str, bytes] = {}
        self.keys: set[str] = set()
        self.calls: list[tuple[object, ...]] = []

    async def get(self, key: str) -> bytes | None:
        self.calls.append(("get", key))
        return self.data.get(key)

    def pipeline(self, transaction: bool = False) -> StubPipeline:
        self.calls.append(("pipeline", transaction))
        return StubPipeline(self)

    async def smembers(self, key: str) -> set[str]:
        self.calls.append(("smembers", key))
        return set(self.keys)

    async def delete(self, *keys: str) -> int:
        self.calls.append(("delete", *keys))
        return 0

    async def srem(self, key: str, *members: str) -> int:
        self.calls.append(("srem", key, *members))
        return 0

    async def publish(self, channel: str, message: str) -> int:
        self.calls.append(("publish", channel, message))
        return 1


@pytest.mark.asyncio
async def test_memory_copy_serves_repeat_reads_without_redis():
    redis = StubRedis()
    writer = ResponseCache(redis)
    await writer.set("catalog:one", b'{"v":1}')

    reader = ResponseCache(redis)
    assert await reader.get("catalog:one") == {"v": 1}
    first_gets = [call for call in redis.calls if call[0] == "get"]
    assert len(first_gets) == 1

    assert await reader.get("catalog:one") == {"v": 1}
    assert [call for call in redis.calls if call[0] == "get"] == first_gets


@pytest.mark.asyncio
async def test_write_uses_one_pipelined_round_trip():
    redis = StubRedis()
    cache = ResponseCache(redis)
    await cache.set("catalog:two", b'{"v":2}', ttl=60)

    assert redis.calls == [
        ("pipeline", False),
        ("set", "catalog:two"),
        ("sadd", KEY_SET),
        ("execute",),
    ]


@pytest.mark.asyncio
async def test_invalidate_clears_memory_and_redis_keys():
    redis = StubRedis()
    cache = ResponseCache(redis)
    await cache.set("catalog:three", b'{"v":3}')
    assert await cache.get("catalog:three") == {"v": 3}

    await cache.clear_prefix()
    assert await cache.get("catalog:three") is None
    assert ("publish", "catalog:invalidate", CACHE_PREFIX) in redis.calls
    assert ("delete", "catalog:three") in redis.calls
