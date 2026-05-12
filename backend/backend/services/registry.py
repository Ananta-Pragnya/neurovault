import logging
from typing import Dict, Any, List, Optional
from . import polygon, finnhub, alpaca, alpha_vantage, twelve_data
from ..cache import cache

logger = logging.getLogger(__name__)

class Registry:
    """Unified API Registry with Tiered Fallbacks"""

    @staticmethod
    async def get_quote(symbol: str) -> Dict[str, Any]:
        """
        Cascade: Alpaca (P1) -> Polygon (P2) -> Finnhub (P3) -> Twelve Data (P7) -> Cache (L4)
        """
        # 1. Try Alpaca (Primary as requested)
        try:
            res = await alpaca.get_quote(symbol)
            if res and not res.get("error"):
                # Provider is already set in alpaca.get_quote
                return res
        except Exception as e:
            logger.warning(f"Alpaca failed for {symbol}: {e}")

        # 2. Try Polygon (Secondary)
        try:
            res = await polygon.fetch_quote(symbol)
            if res and not res.get("error"):
                res["provider"] = "polygon"
                res["fallback"] = True
                return res
        except Exception as e:
            logger.warning(f"Polygon failed for {symbol}: {e}")

        # 3. Try Finnhub (Market Data Fallback)
        try:
            res = await finnhub.get_quote(symbol) # Ensure finnhub has get_quote
            if res:
                res["provider"] = "finnhub"
                res["fallback"] = True
                return res
        except:
            pass

        # 3. Try Alpaca / Twelve Data (Tier 2)
        for provider in [alpaca, twelve_data, alpha_vantage]:
            try:
                # Alpaca/Twelve/Alpha usually have slightly different return shapes
                # We normalize them here or in their services
                res = await provider.get_quote(symbol)
                if res:
                    res["ticker"] = symbol
                    res["provider"] = provider.__name__.split('.')[-1]
                    res["fallback"] = True
                    return res
            except:
                continue

        # 4. Final Fallback: Last Known Cached Value (L4)
        cached = await cache.get(f"quote:{symbol}")
        if cached:
            cached["provider"] = "cached"
            cached["stale"] = True
            return cached

        return {"error": True, "message": "Market Data Connection Timeout (Alpaca)", "ticker": symbol}

    @staticmethod
    async def get_macro() -> Dict[str, Any]:
        """FRED (P4) -> Cache"""
        # FRED is usually stable, but we should handle XML/JSON issues
        from . import fred
        try:
            res = await fred.get_macro_snapshot()
            if res: return res
        except:
            pass
        return await cache.get("macro:snapshot") or {}
