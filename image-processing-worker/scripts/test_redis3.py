import asyncio
from redis.asyncio import Redis

async def main():
    r = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        print("Testing BLPOP with 1s timeout...")
        result = await r.blpop('test:qx', timeout=1)
        print(f"BLPOP(1s): {result}")
    except Exception as e:
        print(f"BLPOP(1s) ERROR: {type(e).__name__}: {e}")
    finally:
        await r.aclose()

    r2 = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        print("Testing BLPOP with 3s timeout...")
        result = await r2.blpop('test:qy', timeout=3)
        print(f"BLPOP(3s): {result}")
    except Exception as e:
        print(f"BLPOP(3s) ERROR: {type(e).__name__}: {e}")
    finally:
        await r2.aclose()

    r3 = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        print("Testing GET (non-blocking)...")
        result = await r3.get('test:nonexistent')
        print(f"GET: {result}")
    except Exception as e:
        print(f"GET ERROR: {type(e).__name__}: {e}")
    finally:
        await r3.aclose()

asyncio.run(main())
