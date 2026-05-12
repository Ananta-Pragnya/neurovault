import httpx
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

POLYGON_API_KEY = os.environ.get("POLYGON_API_KEY", "your_key_here")
BASE_URL = "https://api.polygon.io"

async def fetch_quote(ticker: str) -> Optional[Dict]:
    """Fetch real-time price, % change, volume, high, low"""
    url = f"{BASE_URL}/v2/aggs/ticker/{ticker}/prev?adjusted=true&apiKey={POLYGON_API_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if data.get("results"):
                res = data["results"][0]
                prev_close = res.get("c")
                # Since this is prev day, we use it as current base
                return {
                    "ticker": ticker,
                    "price": prev_close,
                    "change_pct": round(((res.get("c") - res.get("o")) / res.get("o")) * 100, 2) if res.get("o") else 0,
                    "volume": res.get("v"),
                    "high": res.get("h"),
                    "low": res.get("l"),
                    "timestamp": datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Polygon fetch_quote error for {ticker}: {e}")
    return None

async def fetch_candles(ticker: str, timeframe: str = "day", limit: int = 90) -> List[Dict]:
    """OHLCV candlestick data for charting"""
    to_date = datetime.now().strftime('%Y-%m-%d')
    from_date = (datetime.now() - timedelta(days=limit)).strftime('%Y-%m-%d')
    
    url = f"{BASE_URL}/v2/aggs/ticker/{ticker}/range/1/{timeframe}/{from_date}/{to_date}?adjusted=true&sort=asc&limit={limit}&apiKey={POLYGON_API_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if data.get("results"):
                return [
                    {
                        "time": r.get("t"),
                        "open": r.get("o"),
                        "high": r.get("h"),
                        "low": r.get("l"),
                        "close": r.get("c"),
                        "volume": r.get("v")
                    } for r in data["results"]
                ]
        except Exception as e:
            logger.error(f"Polygon fetch_candles error for {ticker}: {e}")
    return []

async def search_tickers(query: str) -> List[Dict]:
    """Ticker search autocomplete"""
    url = f"{BASE_URL}/v3/reference/tickers?search={query}&active=true&sort=ticker&order=asc&limit=10&apiKey={POLYGON_API_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if data.get("results"):
                return [
                    {
                        "ticker": r.get("ticker"),
                        "name": r.get("name"),
                        "market": r.get("market"),
                        "locale": r.get("locale")
                    } for r in data["results"]
                ]
        except Exception as e:
            logger.error(f"Polygon search_tickers error: {e}")
    return []
