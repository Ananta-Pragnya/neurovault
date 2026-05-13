"""
Portfolio Analytics Engine
Sharpe, Sortino, Correlation Matrix, Sector Exposure.
Pure math — no pandas required for core logic.
"""

import math
from typing import Dict, List, Optional


def sharpe_ratio(
    returns: List[float], risk_free_rate: float = 0.04
) -> Dict[str, float]:
    """
    Calculate annualized Sharpe Ratio.
    returns: daily return series (decimals)
    risk_free_rate: annual risk-free rate
    """
    n = len(returns)
    if n < 2:
        return {"sharpe": 0, "annualized_return": 0, "annualized_vol": 0}

    daily_rf = risk_free_rate / 252
    excess = [r - daily_rf for r in returns]

    mean_excess = sum(excess) / n
    variance = sum((r - mean_excess) ** 2 for r in excess) / (n - 1)
    std = math.sqrt(variance)

    if std < 1e-12:
        return {"sharpe": 0, "annualized_return": 0, "annualized_vol": 0}

    daily_sharpe = mean_excess / std
    annual_sharpe = daily_sharpe * math.sqrt(252)

    mean_daily = sum(returns) / n
    annual_return = mean_daily * 252
    annual_vol = std * math.sqrt(252)

    # Quality assessment
    if annual_sharpe > 2:
        quality = "EXCELLENT"
    elif annual_sharpe > 1:
        quality = "GOOD"
    elif annual_sharpe > 0.5:
        quality = "ACCEPTABLE"
    elif annual_sharpe > 0:
        quality = "POOR"
    else:
        quality = "NEGATIVE — underperforming risk-free"

    return {
        "sharpe": round(annual_sharpe, 4),
        "quality": quality,
        "annualized_return": round(annual_return * 100, 2),
        "annualized_vol": round(annual_vol * 100, 2),
        "risk_free_rate": risk_free_rate
    }


def sortino_ratio(
    returns: List[float], risk_free_rate: float = 0.04
) -> Dict[str, float]:
    """
    Sortino ratio — like Sharpe but only penalizes downside volatility.
    """
    n = len(returns)
    if n < 2:
        return {"sortino": 0}

    daily_rf = risk_free_rate / 252
    excess = [r - daily_rf for r in returns]
    mean_excess = sum(excess) / n

    # Downside deviation (only negative excess returns)
    downside = [min(r, 0) ** 2 for r in excess]
    downside_var = sum(downside) / n
    downside_std = math.sqrt(downside_var)

    if downside_std < 1e-12:
        return {"sortino": 0, "downside_vol": 0}

    daily_sortino = mean_excess / downside_std
    annual_sortino = daily_sortino * math.sqrt(252)

    return {
        "sortino": round(annual_sortino, 4),
        "downside_vol": round(downside_std * math.sqrt(252) * 100, 2)
    }


def correlation_matrix(returns_dict: Dict[str, List[float]]) -> Dict:
    """
    Compute pairwise correlation matrix.
    returns_dict: {"AAPL": [r1, r2, ...], "MSFT": [r1, r2, ...]}
    Returns: {matrix: [[...]], tickers: [...], summary}
    """
    tickers = list(returns_dict.keys())
    n_tickers = len(tickers)

    if n_tickers < 2:
        return {"matrix": [[1.0]], "tickers": tickers, "summary": "Need at least 2 assets"}

    # Compute correlations
    matrix = []
    min_corr = 1.0
    max_corr = -1.0
    max_pair = ("", "")
    min_pair = ("", "")

    for i in range(n_tickers):
        row = []
        for j in range(n_tickers):
            if i == j:
                row.append(1.0)
            else:
                corr = _pearson_correlation(returns_dict[tickers[i]], returns_dict[tickers[j]])
                row.append(round(corr, 4))
                if corr > max_corr:
                    max_corr = corr
                    max_pair = (tickers[i], tickers[j])
                if corr < min_corr:
                    min_corr = corr
                    min_pair = (tickers[i], tickers[j])
        matrix.append(row)

    # Diversification score (lower avg correlation = better diversified)
    all_corrs = []
    for i in range(n_tickers):
        for j in range(i + 1, n_tickers):
            all_corrs.append(abs(matrix[i][j]))
    avg_corr = sum(all_corrs) / len(all_corrs) if all_corrs else 0
    div_score = round((1 - avg_corr) * 100, 1)

    return {
        "matrix": matrix,
        "tickers": tickers,
        "most_correlated": {"pair": list(max_pair), "correlation": round(max_corr, 4)},
        "least_correlated": {"pair": list(min_pair), "correlation": round(min_corr, 4)},
        "diversification_score": div_score,
        "avg_correlation": round(avg_corr, 4)
    }


def sector_exposure(holdings: List[Dict]) -> Dict:
    """
    Calculate sector weight distribution.
    holdings: [{"ticker": "AAPL", "value": 15000, "sector": "Technology"}, ...]
    """
    total_value = sum(h.get("value", 0) for h in holdings)
    if total_value <= 0:
        return {"sectors": {}, "total_value": 0}

    # Sector mapping fallback
    default_sectors = {
        "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology", "NVDA": "Technology",
        "AMZN": "Consumer", "TSLA": "Consumer", "META": "Technology",
        "JPM": "Financials", "BAC": "Financials", "GS": "Financials",
        "JNJ": "Healthcare", "UNH": "Healthcare", "PFE": "Healthcare",
        "XOM": "Energy", "CVX": "Energy",
        "SPY": "Index", "QQQ": "Index", "IWM": "Index",
        "BTC-USD": "Crypto", "ETH-USD": "Crypto"
    }

    sectors = {}
    for h in holdings:
        sector = h.get("sector", default_sectors.get(h.get("ticker", ""), "Other"))
        value = h.get("value", 0)
        sectors[sector] = sectors.get(sector, 0) + value

    # Calculate percentages
    sector_data = []
    for sector, value in sorted(sectors.items(), key=lambda x: x[1], reverse=True):
        pct = (value / total_value) * 100
        sector_data.append({
            "sector": sector,
            "value": round(value, 2),
            "weight_pct": round(pct, 1)
        })

    # Concentration risk
    top_sector_pct = sector_data[0]["weight_pct"] if sector_data else 0
    concentration = "HIGH" if top_sector_pct > 50 else "MODERATE" if top_sector_pct > 30 else "LOW"

    return {
        "sectors": sector_data,
        "total_value": round(total_value, 2),
        "num_sectors": len(sector_data),
        "concentration_risk": concentration,
        "top_sector": sector_data[0] if sector_data else None
    }


def portfolio_summary(
    holdings: List[Dict],
    returns: Optional[List[float]] = None,
    market_returns: Optional[List[float]] = None
) -> Dict:
    """
    Comprehensive portfolio analytics.
    holdings: [{"ticker": "AAPL", "quantity": 10, "buy_price": 150, "current_price": 175, "sector": "Tech"}]
    """
    total_invested = sum(h["quantity"] * h["buy_price"] for h in holdings)
    total_current = sum(h["quantity"] * h["current_price"] for h in holdings)
    total_pnl = total_current - total_invested

    # Per-position P&L
    positions = []
    for h in holdings:
        invested = h["quantity"] * h["buy_price"]
        current = h["quantity"] * h["current_price"]
        pnl = current - invested
        pnl_pct = ((h["current_price"] / h["buy_price"]) - 1) * 100 if h["buy_price"] > 0 else 0

        positions.append({
            "ticker": h.get("ticker") or h.get("symbol", "UNKNOWN"),
            "quantity": h["quantity"],
            "invested": round(invested, 2),
            "current_value": round(current, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "weight_pct": round((current / total_current) * 100, 1) if total_current > 0 else 0,
            "status": "PROFIT" if pnl > 0 else "LOSS" if pnl < 0 else "FLAT"
        })

    result = {
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(((total_current / total_invested) - 1) * 100, 2) if total_invested > 0 else 0,
        "positions": positions,
        "num_positions": len(positions),
        "winners": sum(1 for p in positions if p["pnl"] > 0),
        "losers": sum(1 for p in positions if p["pnl"] < 0)
    }

    # Add sector exposure
    sector_holdings = [
        {"ticker": h.get("ticker") or h.get("symbol", ""), "value": h["quantity"] * h["current_price"], "sector": h.get("sector", "Other")}
        for h in holdings
    ]
    result["sector_exposure"] = sector_exposure(sector_holdings)

    # Add risk metrics if returns provided
    if returns and len(returns) > 5:
        result["sharpe"] = sharpe_ratio(returns)
        result["sortino"] = sortino_ratio(returns)

    return result


def _pearson_correlation(x: List[float], y: List[float]) -> float:
    """Pearson correlation coefficient between two series."""
    n = min(len(x), len(y))
    if n < 2:
        return 0.0

    x, y = x[:n], y[:n]
    mean_x = sum(x) / n
    mean_y = sum(y) / n

    cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    var_x = sum((xi - mean_x) ** 2 for xi in x)
    var_y = sum((yi - mean_y) ** 2 for yi in y)

    denom = math.sqrt(var_x * var_y)
    if denom < 1e-12:
        return 0.0

    return cov / denom
