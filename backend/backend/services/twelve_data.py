import httpx
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

TWELVE_DATA_KEY = os.environ.get("TWELVE_DATA_KEY", "")

async def get_quote(symbol: str) -> Optional[Dict]:
    """Tier 2 fallback for global quotes"""
    if not TWELVE_DATA_KEY: return None
    
    url = f"https://api.twelvedata.com/quote?symbol={symbol}&apikey={TWELVE_DATA_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if "price" in data:
                return {
                    "price": float(data.get("price", 0)),
                    "change_pct": float(data.get("percent_change", 0)),
                    "volume": int(data.get("volume", 0)),
                    "source": "twelve_data"
                }
        except Exception as e:
            logger.error(f"Twelve Data quote error: {e}")
    return None
