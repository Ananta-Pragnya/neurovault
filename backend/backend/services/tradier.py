import httpx
import os
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

TRADIER_API_KEY = os.environ.get("TRADIER_API_KEY", "your_key_here")
BASE_URL = "https://api.tradier.com/v1"

async def get_expirations(ticker: str) -> List[str]:
    """List of available expiry dates"""
    url = f"{BASE_URL}/markets/options/expirations?symbol={ticker}"
    headers = {"Authorization": f"Bearer {TRADIER_API_KEY}", "Accept": "application/json"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("expirations") and data["expirations"].get("date"):
                return data["expirations"]["date"]
        except Exception as e:
            logger.error(f"Tradier expirations error for {ticker}: {e}")
    return []

async def get_options_chain(ticker: str, expiry: str) -> List[Dict]:
    """Full options chain: calls + puts with strike, bid, ask, volume, OI"""
    url = f"{BASE_URL}/markets/options/chains?symbol={ticker}&expiration={expiry}"
    headers = {"Authorization": f"Bearer {TRADIER_API_KEY}", "Accept": "application/json"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("options") and data["options"].get("option"):
                opts = data["options"]["option"]
                # In case it returns a single dict instead of a list
                if isinstance(opts, dict):
                    opts = [opts]
                return [
                    {
                        "symbol": o.get("symbol"),
                        "strike": o.get("strike"),
                        "option_type": o.get("option_type"),
                        "bid": o.get("bid"),
                        "ask": o.get("ask"),
                        "volume": o.get("volume"),
                        "open_interest": o.get("open_interest")
                    } for o in opts
                ]
        except Exception as e:
            logger.error(f"Tradier options chain error for {ticker} exp {expiry}: {e}")
    return []
