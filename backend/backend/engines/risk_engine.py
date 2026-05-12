"""
Risk Analytics Engine
VaR, Max Drawdown, Kelly Criterion, Position Sizing, Portfolio Beta.
Pure math — numpy only.
"""

import math
from typing import List, Dict, Optional


def value_at_risk(returns: List[float], confidence: float = 0.95) -> Dict[str, float]:
    """
    Parametric Value-at-Risk (Gaussian).
    returns: list of daily return percentages (e.g. [0.01, -0.02, ...])
    confidence: 0.95 = 95% VaR
    Returns: {var_pct, var_dollar (per $10000 portfolio), confidence, mean, std}
    """
    n = len(returns)
    if n < 2:
        return {"var_pct": 0, "var_dollar": 0, "confidence": confidence, "mean": 0, "std": 0}

    mean = sum(returns) / n
    variance = sum((r - mean) ** 2 for r in returns) / (n - 1)
    std = math.sqrt(variance)

    # Z-scores for common confidence levels
    z_scores = {0.90: 1.2816, 0.95: 1.6449, 0.99: 2.3263}
    z = z_scores.get(confidence, 1.6449)

    var_pct = -(mean - z * std)
    var_dollar = var_pct * 10000  # per $10k portfolio

    return {
        "var_pct": round(var_pct * 100, 4),
        "var_dollar": round(var_dollar, 2),
        "confidence": confidence,
        "mean_return": round(mean * 100, 4),
        "std_dev": round(std * 100, 4)
    }


def max_drawdown(equity_curve: List[float]) -> Dict[str, float]:
    """
    Calculate maximum drawdown from an equity curve.
    equity_curve: list of portfolio values over time
    Returns: {max_drawdown_pct, peak, trough, peak_idx, trough_idx}
    """
    if len(equity_curve) < 2:
        return {"max_drawdown_pct": 0, "peak": 0, "trough": 0}

    peak = equity_curve[0]
    max_dd = 0.0
    peak_val = peak
    trough_val = peak
    peak_idx = 0
    trough_idx = 0

    for i, val in enumerate(equity_curve):
        if val > peak:
            peak = val
        dd = (peak - val) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
            peak_val = peak
            trough_val = val
            trough_idx = i

    return {
        "max_drawdown_pct": round(max_dd * 100, 2),
        "peak": round(peak_val, 2),
        "trough": round(trough_val, 2),
        "recovery_needed_pct": round((peak_val / trough_val - 1) * 100, 2) if trough_val > 0 else 0
    }


def kelly_criterion(win_rate: float, avg_win: float, avg_loss: float) -> Dict[str, float]:
    """
    Kelly Criterion for optimal bet sizing.
    win_rate: probability of winning (0-1)
    avg_win: average winning return
    avg_loss: average losing return (positive number)
    Returns: {kelly_fraction, half_kelly, quarter_kelly}
    """
    if avg_loss <= 0 or win_rate <= 0 or win_rate >= 1:
        return {"kelly_fraction": 0, "half_kelly": 0, "quarter_kelly": 0}

    b = avg_win / avg_loss  # odds ratio
    kelly = (win_rate * b - (1 - win_rate)) / b

    return {
        "kelly_fraction": round(max(0, kelly), 4),
        "half_kelly": round(max(0, kelly / 2), 4),
        "quarter_kelly": round(max(0, kelly / 4), 4),
        "edge": round((win_rate * avg_win - (1 - win_rate) * avg_loss) * 100, 2)
    }


def position_size(
    capital: float, risk_per_trade_pct: float, stop_loss_pct: float
) -> Dict[str, float]:
    """
    Calculate position size using fixed-risk method.
    capital: total portfolio value
    risk_per_trade_pct: % of capital to risk (e.g. 2.0 = 2%)
    stop_loss_pct: distance to stop loss in % (e.g. 5.0 = 5%)
    """
    if stop_loss_pct <= 0:
        return {"position_value": 0, "shares_at_price": 0, "risk_amount": 0}

    risk_amount = capital * (risk_per_trade_pct / 100)
    position_value = risk_amount / (stop_loss_pct / 100)

    return {
        "position_value": round(position_value, 2),
        "risk_amount": round(risk_amount, 2),
        "pct_of_portfolio": round((position_value / capital) * 100, 2) if capital > 0 else 0,
        "max_loss": round(risk_amount, 2)
    }


def portfolio_beta(asset_returns: List[float], market_returns: List[float]) -> float:
    """
    Calculate portfolio beta against market benchmark.
    Uses covariance / variance method.
    """
    n = min(len(asset_returns), len(market_returns))
    if n < 2:
        return 1.0

    a = asset_returns[:n]
    m = market_returns[:n]

    mean_a = sum(a) / n
    mean_m = sum(m) / n

    cov = sum((a[i] - mean_a) * (m[i] - mean_m) for i in range(n)) / (n - 1)
    var_m = sum((m[i] - mean_m) ** 2 for i in range(n)) / (n - 1)

    if var_m < 1e-12:
        return 1.0

    return round(cov / var_m, 4)


def risk_summary(
    returns: List[float],
    equity_curve: Optional[List[float]] = None,
    market_returns: Optional[List[float]] = None,
    capital: float = 100000
) -> Dict:
    """
    Comprehensive risk report combining all metrics.
    """
    var = value_at_risk(returns, 0.95)
    var_99 = value_at_risk(returns, 0.99)

    result = {
        "var_95": var,
        "var_99": var_99,
        "daily_volatility": var["std_dev"],
        "annual_volatility": round(var["std_dev"] * math.sqrt(252), 2)
    }

    if equity_curve:
        result["max_drawdown"] = max_drawdown(equity_curve)

    if market_returns:
        result["beta"] = portfolio_beta(returns, market_returns)

    # Risk classification
    annual_vol = result["annual_volatility"]
    if annual_vol < 10:
        result["risk_class"] = "LOW"
        result["risk_label"] = "Conservative — suitable for capital preservation"
    elif annual_vol < 20:
        result["risk_class"] = "MEDIUM"
        result["risk_label"] = "Moderate — balanced risk/reward"
    elif annual_vol < 35:
        result["risk_class"] = "HIGH"
        result["risk_label"] = "Aggressive — significant drawdown potential"
    else:
        result["risk_class"] = "EXTREME"
        result["risk_label"] = "Speculative — high probability of severe loss"

    return result
