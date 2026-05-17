import asyncio, os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('backend/.env')

async def main():
    from backend.backend.services.alpaca import get_bars
    from backend.backend.services.quant_service import QuantService

    print("Fetching AAPL bars (90 days)...")
    bars = await get_bars("AAPL", timeframe="1Day", limit=90)
    closes = [b["close"] for b in bars if "close" in b]
    print(f"Bars returned: {len(bars)}")
    print(f"Closes extracted: {len(closes)}")
    if closes:
        print(f"Latest close: ${closes[-1]:.2f}")
    else:
        print("ERROR: No closes! Checking bar keys...")
        if bars:
            print(f"First bar keys: {list(bars[0].keys())}")
            print(f"First bar: {bars[0]}")

    print("\nRunning forecast...")
    svc = QuantService()
    result = await svc.run_ensemble_forecast("AAPL")
    print(f"Forecast result: {result}")

asyncio.run(main())
