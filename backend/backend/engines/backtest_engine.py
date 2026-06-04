"""
Backtesting engine — runs TA strategies against historical OHLCV bars.
Strategies: SMA crossover, RSI mean-reversion.
"""

import numpy as np
from typing import Literal


def _compute_sma(prices: list[float], period: int) -> list[float | None]:
    result: list[float | None] = [None] * len(prices)
    for i in range(period - 1, len(prices)):
        result[i] = sum(prices[i - period + 1 : i + 1]) / period
    return result


def _compute_rsi(prices: list[float], period: int = 14) -> list[float | None]:
    result: list[float | None] = [None] * len(prices)
    if len(prices) < period + 1:
        return result
    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    gains  = [max(d, 0) for d in deltas]
    losses = [abs(min(d, 0)) for d in deltas]
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for i in range(period, len(prices)):
        avg_gain = (avg_gain * (period - 1) + gains[i - 1]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i - 1]) / period
        rs = avg_gain / avg_loss if avg_loss != 0 else 100.0
        result[i] = 100 - 100 / (1 + rs)
    return result


def run_backtest(
    closes: list[float],
    strategy: Literal["sma_crossover", "rsi_mean_reversion"],
    fast: int,
    slow: int,
    capital: float,
) -> dict:
    """
    Simulate a strategy on historical closing prices.
    Returns equity curve, trades list, and performance metrics.
    """
    n = len(closes)
    if n < max(slow, 20) + 2:
        return {"error": "Not enough price data for backtest"}

    equity       = capital
    position     = 0.0   # shares held
    entry_price  = 0.0
    equity_curve = []
    trades       = []

    if strategy == "sma_crossover":
        sma_fast = _compute_sma(closes, fast)
        sma_slow = _compute_sma(closes, slow)

        for i in range(1, n):
            price = closes[i]
            pf_prev = sma_fast[i - 1]
            ps_prev = sma_slow[i - 1]
            pf_now  = sma_fast[i]
            ps_now  = sma_slow[i]

            if pf_prev is None or ps_prev is None or pf_now is None or ps_now is None:
                equity_curve.append(equity + position * price)
                continue

            # Golden cross — buy
            if pf_prev <= ps_prev and pf_now > ps_now and position == 0:
                position = equity / price
                entry_price = price
                equity = 0.0

            # Death cross — sell
            elif pf_prev >= ps_prev and pf_now < ps_now and position > 0:
                proceeds = position * price
                pnl = proceeds - position * entry_price
                trades.append({"entry": entry_price, "exit": price, "pnl": round(pnl, 2), "type": "long"})
                equity = proceeds
                position = 0.0
                entry_price = 0.0

            equity_curve.append(equity + position * price)

    elif strategy == "rsi_mean_reversion":
        rsi = _compute_rsi(closes, period=fast if fast <= 20 else 14)
        oversold  = 30.0
        overbought = 70.0

        for i in range(1, n):
            price   = closes[i]
            rsi_val = rsi[i]

            if rsi_val is None:
                equity_curve.append(equity + position * price)
                continue

            # RSI crosses above oversold — buy
            if rsi[i - 1] is not None and rsi[i - 1] < oversold and rsi_val >= oversold and position == 0:
                position = equity / price
                entry_price = price
                equity = 0.0

            # RSI crosses above overbought — sell
            elif rsi[i - 1] is not None and rsi[i - 1] < overbought and rsi_val >= overbought and position > 0:
                proceeds = position * price
                pnl = proceeds - position * entry_price
                trades.append({"entry": entry_price, "exit": price, "pnl": round(pnl, 2), "type": "long"})
                equity = proceeds
                position = 0.0
                entry_price = 0.0

            equity_curve.append(equity + position * price)

    # Close any open position at last price
    if position > 0:
        final_price = closes[-1]
        proceeds = position * final_price
        pnl = proceeds - position * entry_price
        trades.append({"entry": entry_price, "exit": final_price, "pnl": round(pnl, 2), "type": "long (open)"})
        equity = proceeds
        position = 0.0

    if not equity_curve:
        return {"error": "No equity curve generated"}

    final_equity  = equity_curve[-1]
    total_return  = (final_equity - capital) / capital * 100
    returns_arr   = np.diff(equity_curve) / np.array(equity_curve[:-1], dtype=float)
    returns_arr   = returns_arr[~np.isnan(returns_arr) & ~np.isinf(returns_arr)]
    sharpe        = float(np.mean(returns_arr) / np.std(returns_arr) * np.sqrt(252)) if np.std(returns_arr) > 0 else 0.0
    peak          = equity_curve[0]
    max_dd        = 0.0
    for v in equity_curve:
        if v > peak: peak = v
        dd = (peak - v) / peak * 100
        if dd > max_dd: max_dd = dd

    wins     = [t for t in trades if t["pnl"] > 0]
    win_rate = len(wins) / len(trades) * 100 if trades else 0.0

    return {
        "equity_curve":  equity_curve,
        "trades":        trades[-50:],
        "metrics": {
            "total_return":  round(total_return, 2),
            "final_equity":  round(final_equity, 2),
            "sharpe":        round(sharpe, 3),
            "max_drawdown":  round(max_dd, 2),
            "win_rate":      round(win_rate, 1),
            "n_trades":      len(trades),
        },
    }
