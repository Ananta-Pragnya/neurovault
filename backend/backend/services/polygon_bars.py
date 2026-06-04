"""
Polygon.io free-tier OHLCV bars service.
Free tier: 2+ years of daily data, no streaming.
Add POLYGON_API_KEY to backend/.env to activate.
"""

import os
import httpx
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

POLYGON_KEY = os.getenv("POLYGON_API_KEY", "")


def _yf_to_polygon_symbol(symbol: str) -> str:
    """Map common symbols to Polygon format."""
    mapping = {"BTC/USD": "X:BTCUSD", "ETH/USD": "X:ETHUSD", "SOL/USD": "X:SOLUSD"}
    return mapping.get(symbol, symbol.replace("/", ""))


async def get_bars_polygon(symbol: str, days: int = 60) -> list[dict]:
    """
    Fetch daily OHLCV bars from Polygon.io free tier.
    Returns [] if no API key or request fails.
    """
    if not POLYGON_KEY:
        return []

    poly_sym = _yf_to_polygon_symbol(symbol)
    to_date = datetime.utcnow().date()
    from_date = to_date - timedelta(days=days + 30)  # buffer for weekends/holidays

    url = f"https://api.polygon.io/v2/aggs/ticker/{poly_sym}/range/1/day/{from_date}/{to_date}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url, params={
                "adjusted": "true",
                "sort": "asc",
                "limit": days + 30,
                "apiKey": POLYGON_KEY,
            })
            if res.status_code == 403:
                logger.warning("[Polygon] API key invalid or subscription limit reached")
                return []
            res.raise_for_status()
            data = res.json()

        results = data.get("results", [])
        if not results:
            return []

        bars = []
        for r in results[-days:]:
            dt = datetime.fromtimestamp(r["t"] / 1000).date()
            bars.append({
                "t":      str(dt),
                "open":   r.get("o", 0),
                "high":   r.get("h", 0),
                "low":    r.get("l", 0),
                "close":  r.get("c", 0),
                "c":      r.get("c", 0),
                "volume": r.get("v", 0),
            })
        logger.info(f"[Polygon] {len(bars)} bars for {symbol}")
        return bars

    except Exception as e:
        logger.warning(f"[Polygon] get_bars failed for {symbol}: {e}")
        return []
