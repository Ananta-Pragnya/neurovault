"""
NeuroVault Indicator Engine — lib/indicators.py

Pure-Python TA library. No external TA libraries (pandas-ta, ta-lib, etc.).
All functions take list[float] of closing prices (or OHLCVBar list).
Scores are normalised to [-1, 1] before storage; rounded to 2 d.p. at API boundary.

Reference: MASTER_PROMPT_STOCK_TRACKER.md — STEP 2 indicator spec.
"""

from __future__ import annotations

import math
import hashlib
from dataclasses import dataclass, field
from typing import Optional


# ── Data structures ──────────────────────────────────────────────────────────

@dataclass
class OHLCVBar:
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: int  # unix ms


@dataclass
class RSIResult:
    value: float       # 0–100
    signal: str        # "buy" | "sell" | "neutral"
    score: float       # normalised -1 to +1


@dataclass
class MACDResult:
    macd_line: float
    signal_line: float
    histogram: float
    signal: str        # "buy" | "sell" | "neutral"
    score: float       # -1 to +1


@dataclass
class BBResult:
    upper: float
    mid: float
    lower: float
    bandwidth: float   # (upper-lower)/mid — squeeze detector
    percent_b: float   # 0=at lower band, 1=at upper band
    signal: str
    score: float


@dataclass
class ATRResult:
    value: float       # absolute ATR
    percent: float     # ATR / close × 100 — volatility %


@dataclass
class VWAPResult:
    value: float
    signal: str        # "buy" | "sell" | "neutral"
    deviation: float   # (price - vwap) / vwap


@dataclass
class CompositeSignal:
    score: float       # -1 to +1
    signal: str        # "strong_buy"|"buy"|"hold"|"sell"|"strong_sell"
    rsi_score: float
    macd_score: float
    bb_score: float
    weights_used: dict = field(default_factory=dict)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _clip(v: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _r4(v: float) -> float:
    return round(v, 4)


# ── Core math ────────────────────────────────────────────────────────────────

def ema(values: list[float], period: int) -> list[float]:
    """
    Exponential moving average.  k = 2 / (period + 1).
    First value seeds from SMA of the first `period` bars.
    """
    if not values or period <= 0:
        return []
    k = 2.0 / (period + 1)
    result: list[float] = []
    seed_len = min(period, len(values))
    seed = sum(values[:seed_len]) / seed_len
    result.append(_r4(seed))
    for v in values[seed_len:]:
        result.append(_r4(result[-1] + k * (v - result[-1])))
    # If we seeded from fewer than `period` bars, still prepend Nones so indices align
    prefix = [None] * (len(values) - len(result))
    return prefix + result  # type: ignore[return-value]


def sma(values: list[float], period: int) -> list[Optional[float]]:
    """Simple moving average. Returns None for warm-up bars."""
    result: list[Optional[float]] = []
    for i, _ in enumerate(values):
        if i + 1 < period:
            result.append(None)
        else:
            result.append(_r4(sum(values[i + 1 - period: i + 1]) / period))
    return result


# ── RSI (Wilder smoothing) ───────────────────────────────────────────────────

def calc_rsi(
    closes: list[float],
    period: int = 14,
    overbought: float = 70.0,
    oversold: float = 30.0,
) -> list[RSIResult]:
    """
    Wilder smoothing RSI.  Uses avgGain/avgLoss with Wilder's MA (alpha=1/period).

    Score mapping:
      - Oversold territory (rsi < oversold):   score = +1.0 × (oversold-rsi)/oversold
      - Overbought territory (rsi > overbought): score = -1.0 × (rsi-overbought)/(100-overbought)
      - Neutral band: score = (50-rsi)/50 × 0.4  (linear, small magnitude)
    """
    results: list[RSIResult] = []
    if len(closes) < period + 1:
        for c in closes:
            results.append(RSIResult(value=50.0, signal="neutral", score=0.0))
        return results

    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]

    # Seed with simple average over first `period` bars
    gains  = [max(d, 0.0) for d in deltas[:period]]
    losses = [abs(min(d, 0.0)) for d in deltas[:period]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    # Prepend None results for warm-up bars
    for _ in range(period):
        results.append(RSIResult(value=50.0, signal="neutral", score=0.0))

    def _rsi_val(ag: float, al: float) -> float:
        if al == 0:
            return 100.0
        rs = ag / al
        return _r4(100.0 - 100.0 / (1.0 + rs))

    rsi_val = _rsi_val(avg_gain, avg_loss)
    results.append(_make_rsi_result(rsi_val, overbought, oversold))

    for d in deltas[period:]:
        gain = max(d, 0.0)
        loss = abs(min(d, 0.0))
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        rsi_val = _rsi_val(avg_gain, avg_loss)
        results.append(_make_rsi_result(rsi_val, overbought, oversold))

    return results


def _make_rsi_result(rsi: float, overbought: float, oversold: float) -> RSIResult:
    if rsi < oversold:
        score = _clip((oversold - rsi) / oversold)
        signal = "buy"
    elif rsi > overbought:
        score = _clip(-((rsi - overbought) / (100.0 - overbought)))
        signal = "sell"
    else:
        score = _clip((50.0 - rsi) / 50.0 * 0.4)
        signal = "neutral"
    return RSIResult(value=_r4(rsi), signal=signal, score=_r4(score))


# ── MACD (12/26/9) ───────────────────────────────────────────────────────────

def calc_macd(
    closes: list[float],
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9,
) -> list[MACDResult]:
    """
    MACD line = EMA(fast) - EMA(slow).
    Signal line = EMA(MACD line, signal_period).
    Histogram = MACD - Signal.

    Score:
      - Histogram crosses zero (sign change): ±1.0
      - Histogram same-sign (sustained): ±0.4 × tanh(|histogram| / price × 100)
    """
    if len(closes) < slow + signal_period:
        neutral = MACDResult(macd_line=0.0, signal_line=0.0, histogram=0.0, signal="neutral", score=0.0)
        return [neutral] * len(closes)

    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)

    macd_vals: list[Optional[float]] = []
    for ef, es in zip(ema_fast, ema_slow):
        if ef is None or es is None:
            macd_vals.append(None)
        else:
            macd_vals.append(_r4(ef - es))  # type: ignore

    # Build signal line only on non-None MACD values
    valid_macd = [v for v in macd_vals if v is not None]
    sig_ema = ema(valid_macd, signal_period)

    # Reattach Nones
    results: list[MACDResult] = []
    sig_idx = 0
    prev_hist: Optional[float] = None
    last_close = closes[-1] if closes else 1.0

    for i, mv in enumerate(macd_vals):
        if mv is None:
            results.append(MACDResult(0.0, 0.0, 0.0, "neutral", 0.0))
            continue
        sl = sig_ema[sig_idx] if sig_idx < len(sig_ema) and sig_ema[sig_idx] is not None else 0.0
        sig_idx += 1
        hist = _r4(mv - (sl or 0.0))

        # Score
        if prev_hist is not None and prev_hist * hist < 0:
            # Zero crossover
            score = 1.0 if hist > 0 else -1.0
            signal = "buy" if hist > 0 else "sell"
        else:
            magnitude = min(abs(hist) / max(abs(last_close) * 0.001, 1e-9), 1.0)
            score = _r4(0.4 * math.tanh(magnitude * 10) * (1 if hist >= 0 else -1))
            signal = "buy" if hist > 0 else ("sell" if hist < 0 else "neutral")

        results.append(MACDResult(
            macd_line=_r4(mv),
            signal_line=_r4(sl or 0.0),
            histogram=hist,
            signal=signal,
            score=_r4(score),
        ))
        prev_hist = hist

    return results


# ── Bollinger Bands ───────────────────────────────────────────────────────────

def calc_bollinger_bands(
    closes: list[float],
    period: int = 20,
    std_dev: float = 2.0,
) -> list[Optional[BBResult]]:
    """
    Upper = SMA + std_dev × σ,  Lower = SMA - std_dev × σ.
    %B = (price - lower) / (upper - lower).

    Score:
      %B ≤ 0.05  → +0.8 (near lower band — buy)
      %B ≥ 0.95  → -0.8 (near upper band — sell)
      %B < 0.25  → +0.3
      %B > 0.75  → -0.3
      else       → linear (0.5 - %B) × 0.6
    """
    results: list[Optional[BBResult]] = []
    for i in range(len(closes)):
        if i + 1 < period:
            results.append(None)
            continue
        window = closes[i + 1 - period: i + 1]
        mid = sum(window) / period
        variance = sum((x - mid) ** 2 for x in window) / period
        sigma = math.sqrt(variance)
        upper = _r4(mid + std_dev * sigma)
        lower = _r4(mid - std_dev * sigma)
        bw = _r4((upper - lower) / mid) if mid != 0 else 0.0
        span = upper - lower
        pct_b = _r4((closes[i] - lower) / span) if span != 0 else 0.5

        if pct_b <= 0.05:
            score, signal = 0.8, "buy"
        elif pct_b >= 0.95:
            score, signal = -0.8, "sell"
        elif pct_b < 0.25:
            score, signal = 0.3, "buy"
        elif pct_b > 0.75:
            score, signal = -0.3, "sell"
        else:
            score = _r4((0.5 - pct_b) * 0.6)
            signal = "neutral"

        results.append(BBResult(
            upper=upper, mid=_r4(mid), lower=lower,
            bandwidth=bw, percent_b=pct_b,
            signal=signal, score=_r4(score),
        ))
    return results


# ── ATR (Wilder smoothing) ────────────────────────────────────────────────────

def calc_atr(bars: list[OHLCVBar], period: int = 14) -> list[Optional[ATRResult]]:
    """
    True Range = max(H-L, |H-prevC|, |L-prevC|).
    ATR = Wilder MA of TR (alpha = 1/period).
    No directional signal — used for volatility sizing.
    """
    if len(bars) < 2:
        return [None] * len(bars)

    trs: list[float] = []
    for i in range(1, len(bars)):
        h, l, pc = bars[i].high, bars[i].low, bars[i - 1].close
        tr = max(h - l, abs(h - pc), abs(l - pc))
        trs.append(tr)

    results: list[Optional[ATRResult]] = [None]  # first bar has no prev close

    # Seed
    seed_len = min(period, len(trs))
    atr_val = sum(trs[:seed_len]) / seed_len

    for i in range(seed_len):
        if i + 1 < period:
            results.append(None)
        else:
            close = bars[i + 1].close
            pct = _r4(atr_val / close * 100) if close else 0.0
            results.append(ATRResult(value=_r4(atr_val), percent=pct))

    for i in range(seed_len, len(trs)):
        atr_val = (atr_val * (period - 1) + trs[i]) / period
        close = bars[i + 1].close
        pct = _r4(atr_val / close * 100) if close else 0.0
        results.append(ATRResult(value=_r4(atr_val), percent=pct))

    return results


# ── VWAP (session-cumulative) ─────────────────────────────────────────────────

def calc_vwap(bars: list[OHLCVBar]) -> list[VWAPResult]:
    """
    Cumulative VWAP = Σ(typical_price × volume) / Σvolume.
    Resets per session — caller must pass only intraday bars for the same session.
    Typical price = (H + L + C) / 3.
    """
    results: list[VWAPResult] = []
    cum_tp_vol = 0.0
    cum_vol = 0.0

    for bar in bars:
        tp = (bar.high + bar.low + bar.close) / 3.0
        cum_tp_vol += tp * bar.volume
        cum_vol += bar.volume
        vwap_val = _r4(cum_tp_vol / cum_vol) if cum_vol > 0 else bar.close
        dev = _r4((bar.close - vwap_val) / vwap_val) if vwap_val else 0.0

        if bar.close > vwap_val * 1.001:
            signal = "buy"
        elif bar.close < vwap_val * 0.999:
            signal = "sell"
        else:
            signal = "neutral"

        results.append(VWAPResult(value=vwap_val, signal=signal, deviation=dev))

    return results


# ── Composite signal ──────────────────────────────────────────────────────────

_DEFAULT_WEIGHTS = {"rsi": 0.35, "macd": 0.40, "bb": 0.25}

_THRESHOLDS = {
    "strong_buy":   0.60,
    "buy":          0.25,
    "sell":        -0.25,
    "strong_sell": -0.60,
}


def composite_score(
    closes: list[float],
    weights: Optional[dict] = None,
) -> CompositeSignal:
    """
    Compute RSI + MACD + BB on the close series, weight-combine to a final score.
    Default weights: rsi=0.35, macd=0.40, bb=0.25.

    Signal thresholds:
      ≥ 0.60  strong_buy
      ≥ 0.25  buy
      ≤ -0.60 strong_sell
      ≤ -0.25 sell
      else    hold
    """
    w = {**_DEFAULT_WEIGHTS, **(weights or {})}
    # Normalise weights
    total_w = sum(w[k] for k in ("rsi", "macd", "bb") if k in w) or 1.0
    w = {k: v / total_w for k, v in w.items()}

    rsi_results = calc_rsi(closes)
    macd_results = calc_macd(closes)
    bb_results = calc_bollinger_bands(closes)

    rsi_score  = rsi_results[-1].score  if rsi_results  else 0.0
    macd_score = macd_results[-1].score if macd_results else 0.0
    bb_r = bb_results[-1]
    bb_score   = bb_r.score if bb_r is not None else 0.0

    score = _clip(
        rsi_score  * w.get("rsi",  0.35) +
        macd_score * w.get("macd", 0.40) +
        bb_score   * w.get("bb",   0.25)
    )
    score = round(score, 2)

    if score >= _THRESHOLDS["strong_buy"]:
        signal = "strong_buy"
    elif score >= _THRESHOLDS["buy"]:
        signal = "buy"
    elif score <= _THRESHOLDS["strong_sell"]:
        signal = "strong_sell"
    elif score <= _THRESHOLDS["sell"]:
        signal = "sell"
    else:
        signal = "hold"

    return CompositeSignal(
        score=score,
        signal=signal,
        rsi_score=round(rsi_score, 2),
        macd_score=round(macd_score, 2),
        bb_score=round(bb_score, 2),
        weights_used=w,
    )


# ── Z-score anomaly detection ─────────────────────────────────────────────────

def detect_anomaly(
    values: list[float],
    window: int = 20,
) -> tuple[float, bool]:
    """
    Z-score of the latest value against the rolling window.
    Returns (z_score, is_anomaly) where is_anomaly = abs(z_score) > 2.0.
    """
    if len(values) < 3:
        return 0.0, False

    w = values[-window:] if len(values) >= window else values
    if len(w) < 2:
        return 0.0, False

    mean = sum(w) / len(w)
    variance = sum((x - mean) ** 2 for x in w) / (len(w) - 1)
    std = math.sqrt(variance)

    if std < 1e-10:
        return 0.0, False

    z = (values[-1] - mean) / std
    return round(z, 4), abs(z) > 2.0


# ── Convenience: bars → closes ────────────────────────────────────────────────

def bars_to_closes(bars: list[OHLCVBar]) -> list[float]:
    return [b.close for b in bars]


def dict_bars_to_ohlcv(raw: list[dict]) -> list[OHLCVBar]:
    """Convert backend dict bars (Alpaca format) to OHLCVBar dataclasses."""
    out = []
    for b in raw:
        out.append(OHLCVBar(
            open=float(b.get("open", 0)),
            high=float(b.get("high", 0)),
            low=float(b.get("low", 0)),
            close=float(b.get("close", 0)),
            volume=float(b.get("volume", 0)),
            timestamp=int(b.get("timestamp", 0)),
        ))
    return out
