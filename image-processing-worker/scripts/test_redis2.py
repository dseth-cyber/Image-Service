import asyncio
from redis.asyncio import Redis

async def main():
    # Test with BLPOP instead
    r = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        print("Testing BLPOP...")
        result = await r.blpop('test:queue2', timeout=5)
        print(f"BLPOP: {result}")
    except Exception as e:
        print(f"BLPOP ERROR: {type(e).__name__}: {e}")
    finally:
        await r.aclose()

    # Test with BRPOPLPUSH
    r2 = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        print("Testing BRPOPLPUSH...")
        result = await r2.brpoplpush('test:queue3', 'test:progress3', timeout=5)
        print(f"BRPOPLPUSH: {result}")
    except Exception as e:
        print(f"BRPOPLPUSH ERROR: {type(e).__name__}: {e}")
    finally:
        await r2.aclose()

    # Test with XREAD (streams)
    r3 = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        print("Testing XREAD...")
        result = await r3.xread({'test:stream': '$'}, block=5000, count=1)
        print(f"XREAD: {result}")
    except Exception as e:
        print(f"XREAD ERROR: {type(e).__name__}: {e}")
    finally:
        await r3.aclose()

asyncio.run(main())
