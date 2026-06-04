"""
QuantService — Real Technical Analysis Ensemble.

FIX 3: Replaces the fake random.uniform "models" (LSTM/SVR/RF) with
real signal computation:
  • Signal 1 — SMA 20/50 crossover (was fake "LSTM")
  • Signal 2 — RSI momentum       (was fake "SVR")
  • Signal 3 — Bollinger position  (was fake "RandomForest")

All signals computed from real Alpaca OHLCV bars pulled in one API call.
Ensemble confidence = agreement between the three signals.
"""

import os
import json
import logging
import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)


# ── Technical Indicator Functions ─────────────────────────────────

def compute_sma(prices: List[float], window: int) -> float:
    if len(prices) < window:
        return prices[-1] if prices else 0.0
    return float(sum(prices[-window:]) / window)


def compute_rsi(prices: List[float], period: int = 14) -> float:
    if len(prices) < period + 1:
        return 50.0  # neutral when insufficient data
    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    gains  = [d if d > 0 else 0.0 for d in deltas]
    losses = [-d if d < 0 else 0.0 for d in deltas]
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100.0 - (100.0 / (1.0 + rs)), 2)


def compute_momentum(prices: List[float], period: int = 10) -> float:
    if len(prices) < period + 1:
        return 0.0
    return round((prices[-1] - prices[-period]) / prices[-period] * 100, 4)


def compute_std(prices: List[float]) -> float:
    n = len(prices)
    if n < 2:
        return 0.0
    mean = sum(prices) / n
    variance = sum((p - mean) ** 2 for p in prices) / (n - 1)
    return math.sqrt(variance)


def compute_bollinger_signal(prices: List[float], window: int = 20) -> float:
    """
    Returns position within Bollinger Bands scaled to [-1, +1].
    +1 = price at upper band (overbought), -1 = lower band (oversold).
    """
    if len(prices) < window:
        return 0.0
    recent = prices[-window:]
    mean   = sum(recent) / window
    std    = compute_std(recent)
    if std == 0:
        return 0.0
    z_score = (prices[-1] - mean) / std
    # Clip to ±2 std and normalise to [-1, 1]
    return max(-1.0, min(1.0, z_score / 2.0))


def _clip(value: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


# ── Main Service Class ────────────────────────────────────────────
class QuantService:

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        # Cross-brain: sentiment adjustments from MarketIntel news signals
        self.sentiment_adjustments: Dict[str, float] = {}

    # ── Lifecycle ──────────────────────────────────────────────────
    async def initialize(self):
        """Subscribe to Signal Bus after event loop is running."""
        from backend.backend.bus.bus import bus, BusEvent
        bus.subscribe(BusEvent.SENTIMENT_BEARISH, self._on_bearish)
        bus.subscribe(BusEvent.SENTIMENT_BULLISH, self._on_bullish)
        logger.info("QuantService initialised — listening on sentiment bus channels.")

    def _on_bearish(self, data: Dict[str, Any]):
        symbol = data.get("symbol", "")
        if symbol:
            self.sentiment_adjustments[symbol] = -0.15

    def _on_bullish(self, data: Dict[str, Any]):
        symbol = data.get("symbol", "")
        if symbol:
            self.sentiment_adjustments[symbol] = 0.05

    # ── Real Price History ─────────────────────────────────────────
    async def _get_price_history(self, symbol: str, days: int = 60) -> List[float]:
        """Fetch real closing prices from Alpaca in one API call, cached."""
        from backend.backend.services.alpaca import get_bars
        from backend.backend.cache.cache import unified_cache

        cache_key = f"bars:{symbol}:{days}"
        cached = unified_cache.get(cache_key)
        if cached:
            return cached

        try:
            bars   = await get_bars(symbol, timeframe="1Day", limit=days)
            closes = [b["close"] for b in bars if "close" in b]
            if closes:
                unified_cache.set(cache_key, closes)
                return closes
        except Exception as e:
            logger.warning(f"get_bars failed for {symbol}: {e}")
        return []

    # ── Real Ensemble Forecast ─────────────────────────────────────
    async def run_ensemble_forecast(self, symbol: str) -> Dict[str, Any]:  # noqa: C901
        """
        Three-signal real TA ensemble.
        Replaces the old random.uniform fake models completely.
        """
        from backend.backend.bus.bus import bus, BusEvent

        prices = await self._get_price_history(symbol, days=90)
        if len(prices) < 5:
            return {
                "error":  "Insufficient price history",
                "symbol": symbol,
                "source": "alpaca",
            }

        last_close = prices[-1]

        # ── NEW: Import indicator engine for MACD + ATR ─────────────
        try:
            from backend.backend.lib.indicators import calc_macd, detect_anomaly
            macd_results = calc_macd(prices)
            macd_r       = macd_results[-1] if macd_results else None
            macd_hist    = macd_r.histogram if macd_r else 0.0
            macd_score   = macd_r.score     if macd_r else 0.0
            price_z, price_anomaly = detect_anomaly(prices)
        except Exception as _e:
            logger.warning(f"Indicator engine import failed: {_e}")
            macd_hist = 0.0; macd_score = 0.0; price_anomaly = False; price_z = 0.0

        # ── Signal 1: SMA 20/50 crossover (was fake "LSTM") ────────
        sma_20 = compute_sma(prices, 20)
        sma_50 = compute_sma(prices, min(50, len(prices)))
        sma_signal = 1.0 if sma_20 > sma_50 else -1.0

        # ── Signal 2: RSI momentum (was fake "SVR") ─────────────────
        rsi = compute_rsi(prices)
        if rsi > 70:
            rsi_signal = -0.8   # overbought → bearish
        elif rsi < 30:
            rsi_signal = 0.8    # oversold  → bullish
        else:
            rsi_signal = (50.0 - rsi) / 50.0  # neutral zone scaled

        # ── Signal 3: Bollinger mean-reversion (was fake "RF") ─────
        boll_raw    = compute_bollinger_signal(prices)
        boll_signal = -boll_raw  # invert: overbought → bearish

        # ── Weighted ensemble composite ─────────────────────────────
        composite = (
            sma_signal  * 0.40 +
            rsi_signal  * 0.35 +
            boll_signal * 0.25
        )
        composite = round(_clip(composite), 4)

        # ── Price target (momentum-adjusted) ────────────────────────
        momentum     = compute_momentum(prices)
        base_move    = last_close * (composite * 0.03)   # max ±3%
        price_target = round(last_close + base_move, 2)

        # ── Confidence: agreement between the three signals ─────────
        signals_list = [sma_signal, rsi_signal, boll_signal]
        mean_s = sum(signals_list) / 3
        std_s  = compute_std(signals_list) if len(signals_list) > 1 else 0.0
        # High std → signals disagree → low confidence
        raw_conf  = 1.0 - (std_s / 2.0)
        confidence = round(_clip(raw_conf, 0.10, 0.95) * 100, 1)

        # ── Determine direction ──────────────────────────────────────
        if composite > 0.10:
            direction = "bullish"
        elif composite < -0.10:
            direction = "bearish"
        else:
            direction = "neutral"

        # ── Optional Gemini analysis layer (if key present) ─────────
        market_analysis = (
            f"SMA crossover {'golden' if sma_signal > 0 else 'death'} cross detected. "
            f"RSI at {rsi:.1f} indicates "
            f"{'overbought conditions' if rsi > 70 else 'oversold conditions' if rsi < 30 else 'neutral momentum'}. "
            f"Bollinger Band position at {boll_raw:+.2f}σ."
        )
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                recent = [{"d": datetime.now().strftime("%Y-%m-%d"), "c": p}
                          for p in prices[-10:]]
                prompt = (
                    f"Act as a senior quantitative analyst. Analyze the following 10-day "
                    f"closing prices for {symbol}: {json.dumps(recent)}. "
                    f"Current Price: {last_close}. Ensemble target: {price_target:.2f}. "
                    f"RSI={rsi:.1f}, SMA signal={sma_signal:+.2f}, Composite={composite:+.4f}. "
                    "Provide: 1. Trend (Bullish/Bearish/Sideways), 2. A 2-sentence rationale. "
                    "Return JSON ONLY: { \"trend\": string, \"analysis\": string }"
                )
                model    = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                parsed = json.loads(response.text)
                market_analysis = parsed.get("analysis", market_analysis)
            except Exception as e:
                logger.warning(f"Gemini layer skipped for {symbol}: {e}")

        # ── Cross-brain sentiment adjustment ─────────────────────────
        adj        = self.sentiment_adjustments.get(symbol, 0.0)
        confidence = round(_clip((confidence / 100 + adj), 0.10, 0.95) * 100, 1)
        if adj != 0:
            market_analysis = f"[Sentiment Sync +{adj:+.0%}] {market_analysis}"

        result = {
            "symbol":       symbol,
            "last_close":   last_close,
            "price_target": price_target,
            "direction":    direction,
            "composite":    composite,
            "confidence":   confidence,
            "signals": {
                "sma_trend":    {"value": round(sma_signal, 4),   "label": f"SMA 20/50 ({'golden' if sma_signal > 0 else 'death'} cross)"},
                "rsi_momentum": {"value": round(rsi_signal, 4),   "label": f"RSI {rsi:.1f}"},
                "bollinger":    {"value": round(boll_signal, 4),  "label": f"Bollinger {boll_raw:+.2f}σ"},
                "macd":         {"value": round(macd_score, 4),   "label": f"MACD hist {macd_hist:+.4f}"},
            },
            "sma_20":        round(sma_20, 2),
            "sma_50":        round(sma_50, 2),
            "rsi":           rsi,
            "macd_histogram": round(macd_hist, 4),
            "momentum_pct":  momentum,
            "anomaly_flag":  price_anomaly,
            "price_z_score": round(price_z, 3),
            "market_analysis": market_analysis,
            "source":        "real_ta",
        }

        # Publish to bus so MarketIntel / portfolio engine can react
        bus.publish(BusEvent.FORECAST_UPDATED, {
            "symbol":     symbol,
            "direction":  direction,
            "confidence": confidence,
        })
        return result

    # ── Legacy predictions wrapper (kept for backward compat) ──────
    async def get_predictions(self, symbol: str, data: List[Dict[str, Any]],
                               weights: Dict[str, float] = None) -> Dict[str, Any]:
        """
        Legacy wrapper used by older frontend code.
        Extracts closes from the OHLCV data dict and runs the real ensemble.
        """
        closes = [d["close"] for d in data if "close" in d]
        if len(closes) < 20:
            # Minimal fallback shape — not randomised
            last_close = closes[-1] if closes else 100.0
            return {
                "symbol":               symbol,
                "nextDayPrice":         last_close,
                "forecast7Day":         [],
                "trend":                "Neutral",
                "confidence":           0.5,
                "rmse":                 0.0,
                "mae":                  0.0,
                "individualPredictions": {},
                "marketAnalysis":       "Insufficient data for real forecast.",
            }

        result = await self.run_ensemble_forecast(symbol)

        # Shape transformation to match legacy frontend contract
        forecast_7day = []
        step = (result["price_target"] - result["last_close"]) / 7
        for i in range(1, 8):
            forecast_7day.append({
                "date":  (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d"),
                "price": round(result["last_close"] + step * i, 2),
            })

        return {
            "symbol":       symbol,
            "nextDayPrice": result["price_target"],
            "forecast7Day": forecast_7day,
            "trend":        result["direction"].capitalize(),
            "confidence":   result["confidence"] / 100,
            "rmse":         0.0,
            "mae":          0.0,
            "individualPredictions": {
                "SMA Trend":   result["signals"]["sma_trend"]["value"],
                "RSI Momentum":result["signals"]["rsi_momentum"]["value"],
                "Bollinger":   result["signals"]["bollinger"]["value"],
            },
            "marketAnalysis": result["market_analysis"],
        }


# ── Singleton ─────────────────────────────────────────────────────
quant_service = QuantService()
