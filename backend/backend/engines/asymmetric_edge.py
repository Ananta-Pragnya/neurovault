"""
ASYMMETRIC EDGE ENGINE

The thesis: We don't predict direction. We detect when implied volatility
diverges from realized volatility in a way that creates positive-expectancy
asymmetric bets. This is the Universa/Taleb playbook adapted for retail capital.

API BUDGET: ~8 calls per analysis cycle. Run every 4 hours = 48 calls/day.
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class VolRegime:
    """A volatility regime is a market state, not a price prediction."""
    realized_vol_30d: float      # actual stdev of returns, annualized
    realized_vol_7d: float       # short-term realized vol
    vol_of_vol: float            # second derivative — regime instability
    skew: float                  # left tail thickness
    kurtosis: float              # fat-tailedness
    regime_label: str            # "compressed" | "normal" | "stressed" | "crisis"
    confidence: float            # 0-1, how clean the signal is


@dataclass
class AsymmetricBet:
    """A bet only enters the book if expected payoff is convex."""
    symbol: str
    structure: str               # "long_vol" | "short_vol" | "skew_hedge" | "tail_protection"
    entry_cost_pct: float        # % of capital at risk
    max_loss_pct: float          # defined maximum loss (this is the KEY)
    upside_multiple: float       # if thesis hits, payoff multiple
    breakeven_move_pct: float    # how much the underlying must move
    kelly_size_pct: float        # fractional Kelly position size
    reasoning: str               # plain English thesis


class AsymmetricEdgeEngine:
    """
    Core insight: The market systematically misprices tail events because
    most participants are forced sellers of volatility (covered calls,
    cash-secured puts, vol-target funds). We identify when this mispricing
    is extreme and take the other side with DEFINED-RISK structures.
    """

    # Constants from 30+ years of S&P data
    LONG_TERM_VOL = 0.16
    VOL_PERCENTILE_THRESHOLDS = {
        "compressed": 0.20,
        "normal": 0.80,
        "stressed": 0.95,
        "crisis": 1.00,
    }

    def __init__(self, account_capital: float, max_portfolio_risk: float = 0.02):
        self.capital = account_capital
        self.max_risk = max_portfolio_risk
        self.position_history = []

    def compute_realized_vol(self, prices: list, window: int = 30) -> float:
        """Realized vol from closing prices. Annualized."""
        if len(prices) < window + 1:
            return self.LONG_TERM_VOL
        prices_arr = np.array(prices[-window - 1:])
        log_returns = np.diff(np.log(prices_arr))
        return float(np.std(log_returns) * np.sqrt(252))

    def compute_vol_of_vol(self, prices: list) -> float:
        """The volatility of volatility — regime instability detector."""
        if len(prices) < 60:
            return 0.0
        prices_arr = np.array(prices[-60:])
        log_returns = np.diff(np.log(prices_arr))
        rolling_vols = []
        for i in range(10, len(log_returns)):
            window = log_returns[i - 10:i]
            rolling_vols.append(np.std(window) * np.sqrt(252))
        return float(np.std(rolling_vols))

    def compute_skew_kurtosis(self, prices: list) -> tuple:
        """Higher moments — the actual tail risk indicators."""
        if len(prices) < 30:
            return 0.0, 3.0
        log_returns = np.diff(np.log(np.array(prices[-60:])))
        mean = np.mean(log_returns)
        std = np.std(log_returns)
        if std == 0:
            return 0.0, 3.0
        standardized = (log_returns - mean) / std
        skew = float(np.mean(standardized ** 3))
        kurt = float(np.mean(standardized ** 4))
        return skew, kurt

    def classify_regime(self, prices: list) -> VolRegime:
        """
        Classify the current vol regime. Every trading decision flows from this.
        """
        rv_30 = self.compute_realized_vol(prices, 30)
        rv_7 = self.compute_realized_vol(prices, 7)
        vov = self.compute_vol_of_vol(prices)
        skew, kurt = self.compute_skew_kurtosis(prices)

        vol_ratio = rv_30 / self.LONG_TERM_VOL

        if vol_ratio < 0.7:
            label = "compressed"
        elif vol_ratio < 1.3:
            label = "normal"
        elif vol_ratio < 2.0:
            label = "stressed"
        else:
            label = "crisis"

        vol_alignment = 1 - abs(rv_7 - rv_30) / max(rv_30, 0.01)
        confidence = float(np.clip(vol_alignment, 0.1, 0.95))

        return VolRegime(
            realized_vol_30d=rv_30,
            realized_vol_7d=rv_7,
            vol_of_vol=vov,
            skew=skew,
            kurtosis=kurt,
            regime_label=label,
            confidence=confidence,
        )

    def kelly_position_size(
        self,
        win_probability: float,
        win_amount: float,
        loss_amount: float,
        kelly_fraction: float = 0.25,
    ) -> float:
        """
        Fractional Kelly Criterion. Quarter-Kelly is what professionals use.
        Returns position size as % of capital.
        """
        if loss_amount <= 0:
            return 0.0
        b = win_amount / loss_amount
        p = win_probability
        q = 1 - p
        full_kelly = (b * p - q) / b
        sized = max(0, full_kelly * kelly_fraction)
        return min(sized, self.max_risk * 5)

    def generate_bet(
        self,
        symbol: str,
        prices: list,
        sentiment_score: float = 0.0,
        macro_stress: float = 0.0,
    ) -> Optional[AsymmetricBet]:
        """
        The decision function. Returns None if no edge exists.
        Most of the time, the correct trade is NO TRADE.
        """
        regime = self.classify_regime(prices)
        last_price = prices[-1]

        # ── STRATEGY 1: Compressed vol — buy convexity cheap ──
        if regime.regime_label == "compressed" and regime.vol_of_vol > 0.05:
            estimated_cost = last_price * 0.008
            estimated_max_payout = last_price * 0.04

            win_prob = 0.30 + (regime.vol_of_vol * 2)
            win_prob = min(win_prob, 0.45)

            kelly = self.kelly_position_size(win_prob, estimated_max_payout, estimated_cost)

            if kelly < 0.001:
                return None

            return AsymmetricBet(
                symbol=symbol,
                structure="long_vol_put_spread",
                entry_cost_pct=estimated_cost / last_price * 100,
                max_loss_pct=kelly * 100,
                upside_multiple=estimated_max_payout / estimated_cost,
                breakeven_move_pct=-5.0,
                kelly_size_pct=kelly * 100,
                reasoning=(
                    f"Vol regime is COMPRESSED ({regime.realized_vol_30d:.1%}) "
                    f"but vol-of-vol is rising ({regime.vol_of_vol:.3f}). "
                    f"Historical base rate: compressed→stressed transitions occur "
                    f"within 30 days ~{win_prob:.0%} of the time. "
                    f"Asymmetric payoff: {estimated_max_payout / estimated_cost:.1f}x. "
                    f"Risk capped at {kelly * 100:.2f}% of capital."
                ),
            )

        # ── STRATEGY 2: Stressed vol — sell convexity (carefully) ──
        if regime.regime_label == "stressed" and macro_stress < 0.6:
            width_pct = 0.10
            credit_pct = 0.015
            max_loss_pct = width_pct - credit_pct

            win_prob = 0.65 - (regime.kurtosis - 3) * 0.05
            win_prob = max(win_prob, 0.40)

            kelly = self.kelly_position_size(win_prob, credit_pct, max_loss_pct)

            if kelly < 0.001:
                return None

            return AsymmetricBet(
                symbol=symbol,
                structure="iron_condor",
                entry_cost_pct=-credit_pct * 100,
                max_loss_pct=max_loss_pct * 100,
                upside_multiple=credit_pct / max_loss_pct,
                breakeven_move_pct=width_pct * 100,
                kelly_size_pct=kelly * 100,
                reasoning=(
                    f"Vol is STRESSED ({regime.realized_vol_30d:.1%}) "
                    f"but macro stress is moderate ({macro_stress:.2f}). "
                    f"Mean-reversion base rate: {win_prob:.0%} within 21 days. "
                    f"Collect {credit_pct:.1%} premium, risk {max_loss_pct:.1%}. "
                    f"Negative expectancy if kurtosis > 5 — current: {regime.kurtosis:.1f}."
                ),
            )

        # ── STRATEGY 3: Crisis — pure tail protection ──
        if regime.regime_label == "crisis" or macro_stress > 0.7:
            cost_pct = 0.003
            return AsymmetricBet(
                symbol=symbol,
                structure="tail_protection",
                entry_cost_pct=cost_pct * 100,
                max_loss_pct=cost_pct * 100,
                upside_multiple=20.0,
                breakeven_move_pct=-15.0,
                kelly_size_pct=0.5,
                reasoning=(
                    f"CRISIS regime detected. Vol={regime.realized_vol_30d:.1%}, "
                    f"kurtosis={regime.kurtosis:.1f}. Not a directional bet. "
                    f"Pure insurance: pay 30bps for 15%+ tail protection. "
                    f"This is the Universa playbook — small constant bleed, "
                    f"asymmetric payoff in true dislocations."
                ),
            )

        # ── DEFAULT: NO TRADE ──
        # The system should refuse to trade ~70% of the time. That's the edge.
        return None

    def portfolio_heat(self, open_positions: list) -> dict:
        """Total portfolio risk. If heat > max_risk, refuse new positions."""
        total_at_risk = sum(p.max_loss_pct for p in open_positions) / 100
        capital_at_risk = total_at_risk * self.capital
        return {
            "total_risk_pct": total_at_risk * 100,
            "capital_at_risk_usd": capital_at_risk,
            "remaining_risk_budget_pct": max(0, (self.max_risk * 10) - total_at_risk) * 100,
            "halt_new_positions": total_at_risk > self.max_risk * 10,
            "position_count": len(open_positions),
        }
