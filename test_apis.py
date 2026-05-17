import os, httpx, asyncio
from dotenv import load_dotenv
load_dotenv('backend/.env')

KEY  = os.getenv('ALPACA_API_KEY','')
SEC  = os.getenv('ALPACA_SECRET_KEY','')
FRED = os.getenv('FRED_API_KEY','')

headers = {'APCA-API-KEY-ID': KEY, 'APCA-API-SECRET-KEY': SEC}

async def test():
    async with httpx.AsyncClient(timeout=10) as c:
        # Alpaca LIVE endpoint (what backend uses)
        r1 = await c.get(
            'https://data.alpaca.markets/v2/stocks/snapshots',
            headers=headers,
            params={'symbols': 'AAPL', 'feed': 'iex'}
        )
        print(f'Alpaca LIVE: {r1.status_code}')
        if r1.status_code == 200:
            snap = list(r1.json().values())
            price = snap[0].get('latestTrade', {}).get('p', '?') if snap else '?'
            print(f'  AAPL = ${price}')
        else:
            print(f'  Error: {r1.text[:200]}')

        # FRED observations (what backend uses)
        r2 = await c.get(
            'https://api.stlouisfed.org/fred/series/observations',
            params={'series_id': 'FEDFUNDS', 'api_key': FRED, 'file_type': 'json', 'limit': 1, 'sort_order': 'desc'}
        )
        print(f'FRED observations: {r2.status_code}')
        if r2.status_code == 200:
            obs = r2.json().get('observations', [{}])
            print(f'  Fed Rate = {obs[0].get("value","?")}%')
        else:
            print(f'  Error: {r2.text[:200]}')

asyncio.run(test())
