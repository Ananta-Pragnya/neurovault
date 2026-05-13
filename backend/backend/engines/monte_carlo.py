"""
Monte Carlo Simulation Engine — GBM path simulation.

Runs as a background task (never blocks the UI).
Frontend polls GET /api/simulate/{symbol} every 2 seconds with a 60-second timeout.

Results written to SimulationStore and SIMULATION_READY published to Signal Bus.
"""

import numpy as np
import logging
from datetime import date, timedelta

from backend.backend.shared_state import sim_store
from backend.backend.bus.bus import bus, BusEvent

logger = logging.getLogger(__name__)


async def run_monte_carlo(
    symbol:      str,
    last_price:  float,
    simulations: int = 1000,
    days:        int = 30,
) -> None:
    """
    Geometric Brownian Motion simulation.
    Writes result to sim_store and publishes bus event.
    Never called directly from an endpoint — always via BackgroundTasks.
    """
    try:
        # GBM: dS = S * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
        mu    = 0.001   # daily drift (~25% annualised)
        sigma = 0.020   # daily volatility (~32% annualised)
        dt    = 1.0     # 1 trading day per step

        # (simulations × days) random normal draws
        returns = np.random.normal(mu, sigma, (simulations, days))
        paths   = last_price * np.exp(np.cumsum(returns, axis=1))

        final_prices = paths[:, -1]
        paths_list   = paths[:50, :].tolist()

        # Probability calculations
        prob_above_start = float(np.mean(final_prices > last_price))
        prob_loss_10pct  = float(np.mean(final_prices < last_price * 0.90))

        # Time labels for chart x-axis
        today       = date.today()
        time_labels = [(today + timedelta(days=i + 1)).strftime("%m/%d") for i in range(days)]

        result = {
            "symbol":      symbol,
            "simulations": simulations,
            "days":        days,
            "start_price": round(last_price, 2),
            # Nested statistics — consumed directly by SimulationLab.tsx
            "statistics": {
                "mean":             round(float(np.mean(final_prices)), 2),
                "median":           round(float(np.percentile(final_prices, 50)), 2),
                "percentile_5":     round(float(np.percentile(final_prices, 5)),  2),
                "percentile_95":    round(float(np.percentile(final_prices, 95)), 2),
                "prob_above_start": round(prob_above_start, 4),
                "prob_loss_10pct":  round(prob_loss_10pct,  4),
            },
            "paths":       paths_list,
            "time_labels": time_labels,
            # Legacy flat fields kept for backward compat
            "percentile_5":  round(float(np.percentile(final_prices, 5)),  2),
            "percentile_50": round(float(np.percentile(final_prices, 50)), 2),
            "percentile_95": round(float(np.percentile(final_prices, 95)), 2),
            "var_95":        round(float(last_price - np.percentile(final_prices, 5)), 2),
            "expected":      round(float(np.mean(final_prices)), 2),
            "paths_sample":  paths_list,
        }

        sim_store.set_ready(symbol, result)
        bus.publish(BusEvent.SIMULATION_READY, {"symbol": symbol})
        logger.info(
            f"[MonteCarlo] {symbol}: {simulations} paths done. "
            f"P50={result['statistics']['median']}, P>start={prob_above_start:.1%}, "
            f"P<-10%={prob_loss_10pct:.1%}"
        )

    except Exception as e:
        logger.error(f"[MonteCarlo] Failed for {symbol}: {e}")
        sim_store.set_failed(symbol, str(e))
        bus.publish(BusEvent.SIMULATION_FAILED, {"symbol": symbol, "reason": str(e)})
