import asyncio
from redis.asyncio import Redis

async def main():
    r = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        result = await r.ping()
        print(f"PING: {result}")
        result = await r.blmove('test:queue', 'test:progress', timeout=5)
        print(f"BLMOVE: {result}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
    finally:
        await r.aclose()

asyncio.run(main())
