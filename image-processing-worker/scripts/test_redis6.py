import asyncio
from redis.asyncio import Redis

async def test_timeout(timeout_val):
    # Default Redis.from_url() - no explicit socket_timeout
    r = Redis.from_url('redis://redis:6379', decode_responses=True, socket_keepalive=True)
    try:
        start = asyncio.get_event_loop().time()
        result = await r.blpop(f'test:t{timeout_val}', timeout=timeout_val)
        elapsed = asyncio.get_event_loop().time() - start
        print(f"Default: BLPOP(timeout={timeout_val}): result={result}, elapsed={elapsed:.2f}s")
    except Exception as e:
        elapsed = asyncio.get_event_loop().time() - start
        print(f"Default: BLPOP(timeout={timeout_val}) ERROR after {elapsed:.2f}s: {type(e).__name__}: {e}")
    finally:
        await r.aclose()

async def main():
    for t in [4, 5, 6, 10]:
        await test_timeout(t)

asyncio.run(main())
