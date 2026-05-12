import httpx
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "")

async def get_quote(symbol: str) -> Optional[Dict]:
    """Tier 2 fallback for quotes"""
    if not ALPHA_VANTAGE_KEY: return None
    
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={ALPHA_VANTAGE_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            quote = data.get("Global Quote", {})
            if quote:
                return {
                    "price": float(quote.get("05. price", 0)),
                    "change_pct": float(quote.get("10. change percent", "0%").replace("%", "")),
                    "volume": int(quote.get("06. volume", 0)),
                    "source": "alpha_vantage"
                }
        except Exception as e:
            logger.error(f"Alpha Vantage quote error: {e}")
    return None

async def get_indicators(symbol: str) -> Dict:
    """Technical indicators: RSI, MACD"""
    # RSI
    rsi = await _fetch_indicator(symbol, "RSI")
    # MACD
    macd = await _fetch_indicator(symbol, "MACD")
    
    return {
        "rsi": rsi,
        "macd": macd
    }

async def _fetch_indicator(symbol: str, func: str) -> Optional[float]:
    url = f"https://www.alphavantage.co/query?function={func}&symbol={symbol}&interval=daily&time_period=14&series_type=close&apikey={ALPHA_VANTAGE_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            data = response.json()
            # Alpha Vantage returns complex nested JSON for indicators
            # We just want the most recent value
            key = f"Technical Analysis: {func}"
            if key in data:
                latest_date = sorted(data[key].keys())[-1]
                val = data[key][latest_date]
                if func == "RSI": return float(val.get("RSI", 0))
                if func == "MACD": return float(val.get("MACD", 0))
        except:
            pass
    return None
