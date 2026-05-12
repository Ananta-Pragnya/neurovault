"""
Options Strategy Engine
Generates strategy suggestions and payoff diagrams.
No external API — uses trend + IV context to recommend.

StrategyEngine class: used by the POST /api/strategy/* endpoints.
Module-level functions: used by the GET payoff-diagram endpoints.
"""

from typing import Dict, List, Literal, Optional
import math
import logging

logger = logging.getLogger(__name__)


# ── StrategyEngine Class (for POST endpoints + Llama narration) ────
class StrategyEngine:
    """
    Instantiate with symbol + current price.
    compute methods return a dict that the route handler enriches with
    Llama narration before returning to the frontend.
    """

    def __init__(self, symbol: str, current_price: Optional[float] = None):
        self.symbol        = symbol.upper()
        self.current_price = current_price or 100.0  # fallback if not resolved

    def set_price(self, price: float):
        self.current_price = price
        return self

    def covered_call(self, shares: int = 100, target_premium: float = 2.0) -> dict:
        """
        Covered Call payoff summary.
        Assumes selling a slightly OTM call at current_price + 2%.
        """
        S         = self.current_price
        strike    = round(S * 1.02, 2)          # 2% OTM
        premium   = round(target_premium, 2)
        max_profit = round((premium + (strike - S)) * shares, 2)
        breakeven  = round(S - premium, 2)
        max_loss   = round((S - premium) * shares, 2)  # if stock → 0

        payoff = covered_call_payoff(S, strike, premium)

        return {
            "symbol":     self.symbol,
            "strategy":   "covered_call",
            "stock_price": round(S, 2),
            "strike":     strike,
            "premium":    premium,
            "shares":     shares,
            "max_profit": max_profit,
            "breakeven":  breakeven,
            "max_loss":   max_loss,
            "payoff":     payoff,
        }

    def iron_condor(self, width: float = 5.0, expiry_days: int = 30) -> dict:
        """
        Iron Condor around current price with symmetric wings.
        net_credit estimated at 30% of wing width.
        """
        S           = self.current_price
        put_short   = round(S * 0.97, 2)       # 3% below
        put_long    = round(put_short - width, 2)
        call_short  = round(S * 1.03, 2)       # 3% above
        call_long   = round(call_short + width, 2)
        net_credit  = round(width * 0.30, 2)   # ~30% of wing width
        max_profit  = round(net_credit * 100, 2)
        max_loss    = round((width - net_credit) * 100, 2)

        payoff = iron_condor_payoff(put_long, put_short, call_short, call_long, net_credit)

        return {
            "symbol":      self.symbol,
            "strategy":    "iron_condor",
            "stock_price":  round(S, 2),
            "put_long":    put_long,
            "put_short":   put_short,
            "call_short":  call_short,
            "call_long":   call_long,
            "net_credit":  net_credit,
            "max_profit":  max_profit,
            "max_loss":    max_loss,
            "expiry_days": expiry_days,
            "width":       width,
            "payoff":      payoff,
        }


# --- Payoff Generators ---

def covered_call_payoff(
    stock_price: float, strike: float, premium: float,
    price_range: int = 30, step: float = 1.0
) -> List[Dict]:
    """Generate payoff data for a covered call position."""
    center = round(stock_price)
    payoffs = []
    for i in range(-price_range, price_range + 1):
        price = center + i * step
        stock_pnl = price - stock_price
        option_pnl = premium - max(price - strike, 0)
        total = stock_pnl + option_pnl
        payoffs.append({
            "price": round(price, 2),
            "stock_pnl": round(stock_pnl, 2),
            "option_pnl": round(option_pnl, 2),
            "total_pnl": round(total, 2)
        })
    return payoffs


def straddle_payoff(
    strike: float, call_premium: float, put_premium: float,
    price_range: int = 30, step: float = 1.0
) -> List[Dict]:
    """Generate payoff data for a long straddle."""
    total_cost = call_premium + put_premium
    payoffs = []
    for i in range(-price_range, price_range + 1):
        price = strike + i * step
        call_value = max(price - strike, 0) - call_premium
        put_value = max(strike - price, 0) - put_premium
        total = call_value + put_value
        payoffs.append({
            "price": round(price, 2),
            "call_pnl": round(call_value, 2),
            "put_pnl": round(put_value, 2),
            "total_pnl": round(total, 2),
            "breakeven_upper": round(strike + total_cost, 2),
            "breakeven_lower": round(strike - total_cost, 2)
        })
    return payoffs


def spread_payoff(
    long_strike: float, short_strike: float,
    long_premium: float, short_premium: float,
    spread_type: Literal["bull_call", "bear_put"] = "bull_call",
    price_range: int = 30, step: float = 1.0
) -> List[Dict]:
    """Generate payoff data for vertical spreads."""
    net_debit = long_premium - short_premium
    center = (long_strike + short_strike) / 2
    payoffs = []

    for i in range(-price_range, price_range + 1):
        price = round(center) + i * step

        if spread_type == "bull_call":
            long_val = max(price - long_strike, 0) - long_premium
            short_val = short_premium - max(price - short_strike, 0)
        else:  # bear_put
            long_val = max(long_strike - price, 0) - long_premium
            short_val = short_premium - max(short_strike - price, 0)

        total = long_val + short_val
        payoffs.append({
            "price": round(price, 2),
            "long_leg": round(long_val, 2),
            "short_leg": round(short_val, 2),
            "total_pnl": round(total, 2)
        })
    return payoffs


def iron_condor_payoff(
    put_long_strike: float, put_short_strike: float,
    call_short_strike: float, call_long_strike: float,
    net_credit: float, price_range: int = 40, step: float = 1.0
) -> List[Dict]:
    """Generate payoff data for an iron condor."""
    center = (put_short_strike + call_short_strike) / 2
    payoffs = []

    for i in range(-price_range, price_range + 1):
        price = round(center) + i * step
        put_spread = max(put_short_strike - price, 0) - max(put_long_strike - price, 0)
        call_spread = max(price - call_short_strike, 0) - max(price - call_long_strike, 0)
        total = net_credit - put_spread - call_spread

        payoffs.append({
            "price": round(price, 2),
            "total_pnl": round(total, 2)
        })
    return payoffs


# --- Strategy Suggestion Engine ---

def suggest_strategy(
    iv_rank: float, trend: str, days_to_expiry: int,
    stock_price: float = 100.0, earnings_soon: bool = False
) -> Dict:
    """
    Recommend options strategies based on market context.
    iv_rank: 0-100 (IV Rank)
    trend: BULLISH / BEARISH / NEUTRAL
    days_to_expiry: days until nearest expiration
    """
    strategies = []

    # High IV environment — sell premium
    if iv_rank > 60:
        if trend == "NEUTRAL":
            strategies.append({
                "name": "Iron Condor",
                "action": "SELL",
                "rationale": f"IV Rank is elevated at {iv_rank:.0f}. Neutral trend = sell premium on both sides.",
                "risk": "DEFINED",
                "ideal_dte": "30-45 days",
                "confidence": min(85, 60 + iv_rank * 0.3)
            })
        elif trend == "BULLISH":
            strategies.append({
                "name": "Bull Put Spread",
                "action": "SELL",
                "rationale": f"High IV ({iv_rank:.0f}) + bullish trend = sell OTM puts for credit.",
                "risk": "DEFINED",
                "ideal_dte": "30-45 days",
                "confidence": min(80, 55 + iv_rank * 0.3)
            })
        elif trend == "BEARISH":
            strategies.append({
                "name": "Bear Call Spread",
                "action": "SELL",
                "rationale": f"High IV ({iv_rank:.0f}) + bearish trend = sell OTM calls for credit.",
                "risk": "DEFINED",
                "ideal_dte": "30-45 days",
                "confidence": min(80, 55 + iv_rank * 0.3)
            })
        # Always add covered call in high IV + bullish
        if trend in ["BULLISH", "NEUTRAL"]:
            strategies.append({
                "name": "Covered Call",
                "action": "SELL",
                "rationale": f"Premium is rich at IV Rank {iv_rank:.0f}. Generate income on existing position.",
                "risk": "LOW",
                "ideal_dte": "14-30 days",
                "confidence": min(75, 50 + iv_rank * 0.25)
            })

    # Low IV environment — buy premium
    if iv_rank < 30:
        if earnings_soon:
            strategies.append({
                "name": "Long Straddle",
                "action": "BUY",
                "rationale": f"IV is cheap ({iv_rank:.0f}). Earnings catalyst ahead = buy straddle for breakout.",
                "risk": "DEFINED",
                "ideal_dte": "7-14 days (pre-earnings)",
                "confidence": min(75, 45 + (30 - iv_rank) * 0.5)
            })
        if trend == "BULLISH":
            strategies.append({
                "name": "Long Call",
                "action": "BUY",
                "rationale": f"IV is low ({iv_rank:.0f}), options are cheap. Bullish trend = buy calls.",
                "risk": "DEFINED",
                "ideal_dte": "30-60 days",
                "confidence": min(70, 40 + (30 - iv_rank) * 0.4)
            })
        elif trend == "BEARISH":
            strategies.append({
                "name": "Long Put",
                "action": "BUY",
                "rationale": f"IV is low ({iv_rank:.0f}). Bearish trend = buy protective puts.",
                "risk": "DEFINED",
                "ideal_dte": "30-60 days",
                "confidence": min(70, 40 + (30 - iv_rank) * 0.4)
            })

    # Medium IV — directional plays
    if 30 <= iv_rank <= 60:
        if trend == "BULLISH":
            strategies.append({
                "name": "Bull Call Spread",
                "action": "BUY",
                "rationale": f"Moderate IV ({iv_rank:.0f}). Reduce cost with spread vs naked call.",
                "risk": "DEFINED",
                "ideal_dte": "30-45 days",
                "confidence": 60
            })
        elif trend == "BEARISH":
            strategies.append({
                "name": "Bear Put Spread",
                "action": "BUY",
                "rationale": f"Moderate IV ({iv_rank:.0f}). Defined-risk bearish play.",
                "risk": "DEFINED",
                "ideal_dte": "30-45 days",
                "confidence": 60
            })

    # Sort by confidence
    strategies.sort(key=lambda s: s["confidence"], reverse=True)

    return {
        "context": {
            "iv_rank": iv_rank,
            "trend": trend,
            "days_to_expiry": days_to_expiry,
            "earnings_soon": earnings_soon,
            "iv_environment": "HIGH" if iv_rank > 60 else "LOW" if iv_rank < 30 else "MODERATE"
        },
        "primary": strategies[0] if strategies else {"name": "No Clear Edge", "rationale": "Wait for better setup."},
        "alternatives": strategies[1:3] if len(strategies) > 1 else [],
        "total_strategies": len(strategies)
    }
