import asyncio
from redis.asyncio import Redis

async def main():
    # Test with explicit socket_timeout=None
    r = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True, socket_timeout=None)
    try:
        result = await r.blpop('test:ta', timeout=10)
        print(f"BLPOP(timeout=10, socket_timeout=None): {result}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
    finally:
        await r.aclose()

    # Test with explicit socket_timeout=30
    r2 = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True, socket_timeout=30)
    try:
        result = await r2.blpop('test:tb', timeout=10)
        print(f"BLPOP(timeout=10, socket_timeout=30): {result}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
    finally:
        await r2.aclose()

    # Test with explicit socket_timeout=0 (no timeout)
    r3 = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True, socket_timeout=0)
    try:
        result = await r3.blpop('test:tc', timeout=10)
        print(f"BLPOP(timeout=10, socket_timeout=0): {result}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
    finally:
        await r3.aclose()

asyncio.run(main())
