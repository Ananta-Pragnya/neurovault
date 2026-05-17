import asyncio, os, httpx, json
from dotenv import load_dotenv
load_dotenv('backend/.env')

KEY = os.getenv('ALPACA_API_KEY','')
SEC = os.getenv('ALPACA_SECRET_KEY','')
headers = {'APCA-API-KEY-ID': KEY, 'APCA-API-SECRET-KEY': SEC}

async def main():
    async with httpx.AsyncClient(timeout=10) as c:
        # Single-symbol endpoint
        r = await c.get(
            'https://data.alpaca.markets/v2/stocks/AAPL/bars',
            headers=headers,
            params={'timeframe': '1Day', 'limit': 90, 'sort': 'asc'}
        )
        print(f"Status: {r.status_code}")
        data = r.json()
        print(f"Full response: {json.dumps(data)[:500]}")

asyncio.run(main())
