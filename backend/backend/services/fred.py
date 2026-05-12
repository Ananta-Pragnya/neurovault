"""
FRED Service — macroeconomic data with 1-hour TTL cache.

Series fetched:
  FEDFUNDS  → Federal Funds Rate
  CPIAUCSL  → CPI (inflation)
  DGS10     → 10-Year Treasury Yield
  GDP       → GDP Growth (quarterly)
  VIXCLS    → VIX (market volatility)
  T10Y2Y    → 10Y-2Y Yield Curve Spread

Returns a flat dict that the frontend MacroPanel consumes directly.
"""

import os
import httpx
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"
FRED_TTL  = 3600  # 1 hour

_SERIES = {
    "fed_rate":   "FEDFUNDS",
    "cpi":        "CPIAUCSL",
    "yield_10y":  "DGS10",
    "gdp_growth": "GDP",
    "vix":        "VIXCLS",
    "yield_curve": "T10Y2Y",
}

_fred_cache: dict = {"data": None, "ts": 0.0}


async def _fetch_series(series_id: str, api_key: str) -> Optional[float]:
    """Fetch the most recent observation for a single FRED series."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.get(
                FRED_BASE,
                params={
                    "series_id":        series_id,
                    "api_key":          api_key,
                    "file_type":        "json",
                    "sort_order":       "desc",
                    "limit":            1,
                    "observation_start": "2020-01-01",
                },
            )
            res.raise_for_status()
            obs = res.json().get("observations", [])
            if obs:
                val = obs[0].get("value", ".")
                return float(val) if val != "." else None
    except Exception as e:
        logger.warning(f"[FRED] Series {series_id} failed: {e}")
    return None


async def get_macro_data() -> dict:
    """
    Return flat macro snapshot. Cached 1 hour.
    Returns null values (not hardcoded numbers) on FRED failure.
    """
    global _fred_cache

    now = time.time()
    if _fred_cache["data"] and now - _fred_cache["ts"] < FRED_TTL:
        return _fred_cache["data"]

    api_key = os.getenv("FRED_API_KEY", "")
    if not api_key or api_key == "your_fred_key_here":
        logger.warning("[FRED] FRED_API_KEY not set — returning null macro data")
        return {
            k: None for k in _SERIES.keys()
        } | {"stale": True, "error": "FRED_API_KEY not configured", "last_updated": None}

    import asyncio
    results = await asyncio.gather(
        *[_fetch_series(sid, api_key) for sid in _SERIES.values()],
        return_exceptions=True,
    )

    data: dict = {}
    for key, val in zip(_SERIES.keys(), results):
        data[key] = val if not isinstance(val, Exception) else None

    from datetime import datetime
    data["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    data["stale"]        = False

    _fred_cache = {"data": data, "ts": now}
    return data
