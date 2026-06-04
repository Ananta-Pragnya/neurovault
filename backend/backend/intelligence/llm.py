"""
NeuroVault — Streaming LLM analysis for the AssistantDrawer SSE endpoint.

Reference: MASTER_PROMPT_STOCK_TRACKER.md STEP 9 (intelligence/llm.py).
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)


async def stream_ticker_analysis(
    ticker: str,
    user_message: str,
    history: list[dict],
) -> AsyncGenerator[str, None]:
    """
    Load current signal context for `ticker` then stream a Claude response.
    Designed to be consumed by the SSE endpoint as:

        async for chunk in stream_ticker_analysis(...):
            yield f"data: {chunk}\\n\\n"
    """
    from backend.backend.services.alpaca import get_bars
    from backend.backend.services.intelligence import fetch_and_score_news
    from backend.backend.lib.indicators import (
        calc_rsi, calc_macd, calc_bollinger_bands, calc_atr,
        composite_score, detect_anomaly, dict_bars_to_ohlcv,
    )
    from backend.backend.services.claude import stream_analysis

    # ── Load context ───────────────────────────────────────────────────────
    composite_s = 0.0
    signal_label = "hold"
    rsi_val = 50.0
    macd_hist = 0.0
    bb_pct_b = 0.5
    atr_pct = 0.0
    anomaly_price = False
    anomaly_volume = False
    headlines: list[str] = []

    try:
        raw_bars = await get_bars(ticker, timeframe="1Day", limit=60)
        closes = [b["close"] for b in raw_bars if "close" in b]
        ohlcv_bars = dict_bars_to_ohlcv(raw_bars)

        if len(closes) >= 14:
            rsi_r  = calc_rsi(closes)[-1]
            macd_r = calc_macd(closes)[-1]
            bb_r   = calc_bollinger_bands(closes)[-1]
            atr_r  = calc_atr(ohlcv_bars)[-1] if ohlcv_bars else None
            comp   = composite_score(closes)

            rsi_val      = rsi_r.value
            macd_hist    = macd_r.histogram
            bb_pct_b     = bb_r.percent_b if bb_r else 0.5
            atr_pct      = atr_r.percent if atr_r else 0.0
            composite_s  = comp.score
            signal_label = comp.signal

            pz, anomaly_price  = detect_anomaly(closes)
            volumes = [b.get("volume", 0) for b in raw_bars]
            vz, anomaly_volume = detect_anomaly(volumes) if volumes else (0.0, False)
    except Exception as exc:
        logger.warning(f"Context load failed for {ticker}: {exc}")

    try:
        news = await fetch_and_score_news(ticker)
        headlines = [a["headline"] for a in news.get("articles", [])[:3]]
    except Exception:
        pass

    # ── Stream Claude ──────────────────────────────────────────────────────
    async for chunk in stream_analysis(
        ticker=ticker,
        user_message=user_message,
        history=history,
        composite_score=composite_s,
        signal_label=signal_label,
        rsi=rsi_val,
        macd_hist=macd_hist,
        bb_pct_b=bb_pct_b,
        atr_pct=atr_pct,
        recent_headlines=headlines,
        anomaly_price=anomaly_price,
        anomaly_volume=anomaly_volume,
    ):
        yield chunk
