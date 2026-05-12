"""
Technical Trend Detection Engine
EMA, SMA, RSI, VWAP, Bollinger Bands, MACD — all from scratch.
No TA-Lib, no pandas-ta dependency. Pure math.
"""

import math
from typing import Dict, List, Optional, Tuple


# --- Moving Averages ---

def sma(prices: List[float], period: int = 20) -> List[Optional[float]]:
    """Simple Moving Average."""
    result = [None] * len(prices)
    for i in range(period - 1, len(prices)):
        window = prices[i - period + 1:i + 1]
        result[i] = round(sum(window) / period, 4)
    return result


def ema(prices: List[float], period: int = 12) -> List[Optional[float]]:
    """Exponential Moving Average."""
    if len(prices) < period:
        return [None] * len(prices)

    result = [None] * len(prices)
    # Seed with SMA
    k = 2 / (period + 1)
    result[period - 1] = sum(prices[:period]) / period

    for i in range(period, len(prices)):
        result[i] = round(prices[i] * k + result[i - 1] * (1 - k), 4)

    return result


# --- RSI ---

def rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
    """
    Relative Strength Index.
    Uses Wilder's smoothing method.
    """
    if len(prices) < period + 1:
        return [None] * len(prices)

    result = [None] * len(prices)
    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]

    # Initial average gain/loss
    gains = [max(d, 0) for d in deltas[:period]]
    losses = [abs(min(d, 0)) for d in deltas[:period]]

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        result[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        result[period] = round(100 - (100 / (1 + rs)), 2)

    # Wilder's smoothing
    for i in range(period, len(deltas)):
        gain = max(deltas[i], 0)
        loss = abs(min(deltas[i], 0))

        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period

        if avg_loss == 0:
            result[i + 1] = 100.0
        else:
            rs = avg_gain / avg_loss
            result[i + 1] = round(100 - (100 / (1 + rs)), 2)

    return result


# --- Bollinger Bands ---

def bollinger_bands(
    prices: List[float], period: int = 20, num_std: float = 2.0
) -> Dict[str, List[Optional[float]]]:
    """
    Bollinger Bands.
    Returns: {upper, middle, lower, bandwidth, percent_b}
    """
    n = len(prices)
    upper = [None] * n
    middle = [None] * n
    lower = [None] * n
    bandwidth = [None] * n
    pct_b = [None] * n

    for i in range(period - 1, n):
        window = prices[i - period + 1:i + 1]
        mean = sum(window) / period
        variance = sum((p - mean) ** 2 for p in window) / period
        std = math.sqrt(variance)

        middle[i] = round(mean, 4)
        upper[i] = round(mean + num_std * std, 4)
        lower[i] = round(mean - num_std * std, 4)

        band_width = upper[i] - lower[i]
        bandwidth[i] = round(band_width / mean * 100, 4) if mean > 0 else 0

        if band_width > 0:
            pct_b[i] = round((prices[i] - lower[i]) / band_width * 100, 2)

    return {
        "upper": upper,
        "middle": middle,
        "lower": lower,
        "bandwidth": bandwidth,
        "percent_b": pct_b
    }


# --- VWAP ---

def vwap(prices: List[float], volumes: List[float]) -> List[Optional[float]]:
    """
    Volume Weighted Average Price (intraday or cumulative).
    """
    n = min(len(prices), len(volumes))
    result = [None] * n
    cum_pv = 0.0
    cum_v = 0.0

    for i in range(n):
        cum_pv += prices[i] * volumes[i]
        cum_v += volumes[i]
        result[i] = round(cum_pv / cum_v, 4) if cum_v > 0 else None

    return result


# --- MACD ---

def macd(
    prices: List[float], fast: int = 12, slow: int = 26, signal_period: int = 9
) -> Dict[str, List[Optional[float]]]:
    """
    MACD Line, Signal Line, Histogram.
    """
    fast_ema = ema(prices, fast)
    slow_ema = ema(prices, slow)

    n = len(prices)
    macd_line = [None] * n
    for i in range(n):
        if fast_ema[i] is not None and slow_ema[i] is not None:
            macd_line[i] = round(fast_ema[i] - slow_ema[i], 4)

    # Signal line = EMA of MACD line
    macd_values = [v for v in macd_line if v is not None]
    signal = [None] * n

    if len(macd_values) >= signal_period:
        sig = ema(macd_values, signal_period)
        offset = n - len(macd_values)
        for i in range(len(sig)):
            if sig[i] is not None:
                signal[offset + i] = round(sig[i], 4)

    # Histogram
    histogram = [None] * n
    for i in range(n):
        if macd_line[i] is not None and signal[i] is not None:
            histogram[i] = round(macd_line[i] - signal[i], 4)

    return {
        "macd_line": macd_line,
        "signal_line": signal,
        "histogram": histogram
    }


# --- Trend Detection ---

def detect_trend(
    prices: List[float], volumes: Optional[List[float]] = None
) -> Dict:
    """
    Comprehensive trend analysis combining multiple indicators.
    Returns: {trend, strength, signals, summary}
    """
    if len(prices) < 50:
        return {"trend": "NEUTRAL", "strength": 50, "signals": [], "summary": "Insufficient data for trend analysis"}

    signals = []
    bullish_count = 0
    bearish_count = 0
    total_signals = 0

    # 1. EMA Crossover (12/26)
    ema12 = ema(prices, 12)
    ema26 = ema(prices, 26)
    if ema12[-1] is not None and ema26[-1] is not None:
        total_signals += 1
        if ema12[-1] > ema26[-1]:
            bullish_count += 1
            signals.append({"name": "EMA 12/26", "value": "BULLISH", "detail": f"Short EMA ({ema12[-1]:.2f}) above Long ({ema26[-1]:.2f})"})
        else:
            bearish_count += 1
            signals.append({"name": "EMA 12/26", "value": "BEARISH", "detail": f"Short EMA ({ema12[-1]:.2f}) below Long ({ema26[-1]:.2f})"})

    # 2. RSI
    rsi_vals = rsi(prices, 14)
    current_rsi = rsi_vals[-1]
    if current_rsi is not None:
        total_signals += 1
        if current_rsi > 70:
            bearish_count += 1
            signals.append({"name": "RSI (14)", "value": "OVERBOUGHT", "detail": f"RSI at {current_rsi:.1f} — potential reversal"})
        elif current_rsi < 30:
            bullish_count += 1
            signals.append({"name": "RSI (14)", "value": "OVERSOLD", "detail": f"RSI at {current_rsi:.1f} — potential bounce"})
        elif current_rsi > 50:
            bullish_count += 0.5
            signals.append({"name": "RSI (14)", "value": "NEUTRAL-BULLISH", "detail": f"RSI at {current_rsi:.1f} — above midline"})
        else:
            bearish_count += 0.5
            signals.append({"name": "RSI (14)", "value": "NEUTRAL-BEARISH", "detail": f"RSI at {current_rsi:.1f} — below midline"})

    # 3. Bollinger Band position
    bb = bollinger_bands(prices, 20)
    if bb["percent_b"][-1] is not None:
        total_signals += 1
        pct_b = bb["percent_b"][-1]
        if pct_b > 80:
            bearish_count += 0.5
            signals.append({"name": "Bollinger %B", "value": "UPPER_BAND", "detail": f"Price near upper band ({pct_b:.1f}%)"})
        elif pct_b < 20:
            bullish_count += 0.5
            signals.append({"name": "Bollinger %B", "value": "LOWER_BAND", "detail": f"Price near lower band ({pct_b:.1f}%)"})
        else:
            signals.append({"name": "Bollinger %B", "value": "MID_BAND", "detail": f"Price in middle band ({pct_b:.1f}%)"})

    # 4. MACD Signal
    macd_data = macd(prices)
    if macd_data["histogram"][-1] is not None:
        total_signals += 1
        hist = macd_data["histogram"][-1]
        if hist > 0:
            bullish_count += 1
            signals.append({"name": "MACD", "value": "BULLISH", "detail": f"Histogram positive ({hist:.4f})"})
        else:
            bearish_count += 1
            signals.append({"name": "MACD", "value": "BEARISH", "detail": f"Histogram negative ({hist:.4f})"})

    # 5. Price vs SMA50
    sma50 = sma(prices, 50)
    if sma50[-1] is not None:
        total_signals += 1
        if prices[-1] > sma50[-1]:
            bullish_count += 1
            signals.append({"name": "Price vs SMA50", "value": "ABOVE", "detail": f"Price ({prices[-1]:.2f}) above SMA50 ({sma50[-1]:.2f})"})
        else:
            bearish_count += 1
            signals.append({"name": "Price vs SMA50", "value": "BELOW", "detail": f"Price ({prices[-1]:.2f}) below SMA50 ({sma50[-1]:.2f})"})

    # Trend determination
    if total_signals == 0:
        trend = "NEUTRAL"
        strength = 50
    else:
        bull_pct = (bullish_count / total_signals) * 100
        if bull_pct >= 70:
            trend = "BULLISH"
            strength = min(95, int(bull_pct))
        elif bull_pct <= 30:
            trend = "BEARISH"
            strength = min(95, int(100 - bull_pct))
        else:
            trend = "NEUTRAL"
            strength = 50

    # Summary text
    if trend == "BULLISH":
        summary = f"Strong bullish momentum. {bullish_count:.0f}/{total_signals} indicators bullish. Look for long entries."
    elif trend == "BEARISH":
        summary = f"Bearish pressure dominant. {bearish_count:.0f}/{total_signals} indicators bearish. Exercise caution."
    else:
        summary = f"Mixed signals. Market in consolidation. Wait for breakout confirmation."

    return {
        "trend": trend,
        "strength": strength,
        "bullish_count": bullish_count,
        "bearish_count": bearish_count,
        "total_signals": total_signals,
        "signals": signals,
        "summary": summary,
        "current_price": prices[-1],
        "rsi": current_rsi,
        "sma50": sma50[-1]
    }


def compute_all_indicators(
    prices: List[float], volumes: Optional[List[float]] = None
) -> Dict:
    """
    Compute all technical indicators for a price series.
    Returns a dict ready for frontend consumption.
    """
    return {
        "sma20": sma(prices, 20),
        "sma50": sma(prices, 50),
        "ema12": ema(prices, 12),
        "ema26": ema(prices, 26),
        "rsi": rsi(prices, 14),
        "bollinger": bollinger_bands(prices, 20),
        "macd": macd(prices),
        "vwap": vwap(prices, volumes) if volumes else None,
        "trend": detect_trend(prices, volumes)
    }
