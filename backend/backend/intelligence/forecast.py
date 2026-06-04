"""
NeuroVault — Claude-powered forecast with Redis caching.

Integrates the new indicators.py engine + claude.py streaming for
the /api/forecast/{symbol} endpoint.

Reference: MASTER_PROMPT_STOCK_TRACKER.md STEP 9 (intelligence/forecast.py).
"""

from __future__ import annotations

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Cache TTL for forecasts (seconds)
FORECAST_TTL = 300  # 5 minutes


async def get_cached_forecast(ticker: str) -> Optional[str]:
    """Try Redis first, then in-memory cache."""
    try:
        from backend.backend.cache.cache import unified_cache
        return unified_cache.get(f"forecast:{ticker}")
    except Exception:
        return None


async def set_cached_forecast(ticker: str, text: str) -> None:
    try:
        from backend.backend.cache.cache import unified_cache
        unified_cache.set(f"forecast:{ticker}", text, ttl=FORECAST_TTL)
    except Exception as exc:
        logger.debug(f"Cache set failed for forecast:{ticker}: {exc}")


async def generate_ticker_forecast(ticker: str, force_refresh: bool = False) -> dict:
    """
    Full forecast pipeline:
      1. Load bars from Alpaca
      2. Run indicator engine (RSI, MACD, BB, ATR)
      3. Load recent news headlines
      4. Call Claude for 3-sentence forecast
      5. Cache result for 5 minutes

    Returns dict with forecast text + signal breakdown.
    """
    from backend.backend.services.alpaca import get_bars
    from backend.backend.services.intelligence import fetch_and_score_news
    from backend.backend.lib.indicators import (
        calc_rsi, calc_macd, calc_bollinger_bands, calc_atr,
        composite_score, detect_anomaly, dict_bars_to_ohlcv,
    )
    from backend.backend.services.claude import generate_forecast

    # ── Check cache ────────────────────────────────────────────────────────
    if not force_refresh:
        cached = await get_cached_forecast(ticker)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                return {"forecast": cached, "cached": True}

    # ── Load bars ──────────────────────────────────────────────────────────
    try:
        raw_bars = await get_bars(ticker, timeframe="1Day", limit=60)
    except Exception as exc:
        logger.warning(f"get_bars failed for {ticker}: {exc}")
        raw_bars = []

    closes = [b["close"] for b in raw_bars if "close" in b]
    ohlcv_bars = dict_bars_to_ohlcv(raw_bars)

    if len(closes) < 14:
        return {
            "ticker": ticker,
            "forecast": f"Insufficient price history for {ticker}.",
            "composite_score": 0.0,
            "signal": "hold",
            "cached": False,
        }

    # ── Compute indicators ─────────────────────────────────────────────────
    rsi_results  = calc_rsi(closes)
    macd_results = calc_macd(closes)
    bb_results   = calc_bollinger_bands(closes)
    atr_results  = calc_atr(ohlcv_bars) if ohlcv_bars else []

    rsi_r    = rsi_results[-1]
    macd_r   = macd_results[-1]
    bb_r     = bb_results[-1]
    atr_r    = atr_results[-1] if atr_results else None

    composite = composite_score(closes)

    # Dominant signal by highest abs score
    scores = {
        "RSI": abs(rsi_r.score),
        "MACD": abs(macd_r.score),
        "Bollinger Bands": abs(bb_r.score) if bb_r else 0.0,
    }
    dominant = max(scores, key=scores.get)

    # Anomaly check
    price_z, price_anomaly = detect_anomaly(closes)
    volumes = [b.get("volume", 0) for b in raw_bars]
    vol_z, vol_anomaly = detect_anomaly(volumes) if volumes else (0.0, False)

    # ── Load news ──────────────────────────────────────────────────────────
    headlines: list[str] = []
    try:
        news_data = await fetch_and_score_news(ticker)
        headlines = [a["headline"] for a in news_data.get("articles", [])[:3]]
    except Exception:
        pass

    # ── Call Claude ────────────────────────────────────────────────────────
    forecast_text = await generate_forecast(
        ticker=ticker,
        composite_score=composite.score,
        dominant_indicator=dominant,
        rsi=rsi_r.value,
        macd_hist=macd_r.histogram,
        bb_pct_b=bb_r.percent_b if bb_r else 0.5,
        recent_headlines=headlines,
    )

    result = {
        "ticker": ticker,
        "forecast": forecast_text,
        "composite_score": composite.score,
        "signal": composite.signal,
        "rsi": rsi_r.value,
        "rsi_signal": rsi_r.signal,
        "macd_histogram": macd_r.histogram,
        "macd_signal": macd_r.signal,
        "bb_percent_b": bb_r.percent_b if bb_r else None,
        "bb_signal": bb_r.signal if bb_r else None,
        "atr_percent": atr_r.percent if atr_r else None,
        "dominant_indicator": dominant,
        "anomaly_price": price_anomaly,
        "anomaly_volume": vol_anomaly,
        "price_z_score": round(price_z, 2),
        "volume_z_score": round(vol_z, 2),
        "cached": False,
    }

    await set_cached_forecast(ticker, json.dumps(result))
    return result
