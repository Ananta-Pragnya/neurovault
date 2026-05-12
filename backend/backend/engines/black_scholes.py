"""
Black-Scholes Options Pricing Engine
Institutional-grade: price calls/puts, compute all Greeks, solve IV.
Pure math — no external options API needed.
"""

import math
from typing import Dict, Literal

# Standard normal CDF & PDF (no scipy dependency)
def _norm_cdf(x: float) -> float:
    """Cumulative distribution function for standard normal."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

def _norm_pdf(x: float) -> float:
    """Probability density function for standard normal."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _d1(S: float, K: float, T: float, r: float, sigma: float) -> float:
    return (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))

def _d2(S: float, K: float, T: float, r: float, sigma: float) -> float:
    return _d1(S, K, T, r, sigma) - sigma * math.sqrt(T)


def price_option(
    S: float, K: float, T: float, r: float, sigma: float,
    option_type: Literal["call", "put"] = "call"
) -> float:
    """
    Black-Scholes option price.
    S: spot price, K: strike, T: time to expiry (years),
    r: risk-free rate, sigma: volatility (annualized)
    """
    if T <= 0:
        # At expiry
        if option_type == "call":
            return max(S - K, 0.0)
        return max(K - S, 0.0)

    d1 = _d1(S, K, T, r, sigma)
    d2 = _d2(S, K, T, r, sigma)

    if option_type == "call":
        return S * _norm_cdf(d1) - K * math.exp(-r * T) * _norm_cdf(d2)
    else:
        return K * math.exp(-r * T) * _norm_cdf(-d2) - S * _norm_cdf(-d1)


def compute_greeks(
    S: float, K: float, T: float, r: float, sigma: float,
    option_type: Literal["call", "put"] = "call"
) -> Dict[str, float]:
    """
    Compute all Greeks for an option position.
    Returns: {delta, gamma, theta, vega, rho}
    """
    if T <= 0:
        intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
        return {"delta": 1.0 if intrinsic > 0 else 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0, "rho": 0.0}

    d1 = _d1(S, K, T, r, sigma)
    d2 = _d2(S, K, T, r, sigma)
    sqrt_T = math.sqrt(T)
    exp_rT = math.exp(-r * T)

    # Gamma and Vega are same for calls and puts
    gamma = _norm_pdf(d1) / (S * sigma * sqrt_T)
    vega = S * _norm_pdf(d1) * sqrt_T / 100  # per 1% vol move

    if option_type == "call":
        delta = _norm_cdf(d1)
        theta = (-(S * _norm_pdf(d1) * sigma) / (2 * sqrt_T)
                 - r * K * exp_rT * _norm_cdf(d2)) / 365  # per day
        rho = K * T * exp_rT * _norm_cdf(d2) / 100  # per 1% rate move
    else:
        delta = _norm_cdf(d1) - 1
        theta = (-(S * _norm_pdf(d1) * sigma) / (2 * sqrt_T)
                 + r * K * exp_rT * _norm_cdf(-d2)) / 365
        rho = -K * T * exp_rT * _norm_cdf(-d2) / 100

    return {
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta, 4),
        "vega": round(vega, 4),
        "rho": round(rho, 4)
    }


def implied_volatility(
    market_price: float, S: float, K: float, T: float, r: float,
    option_type: Literal["call", "put"] = "call",
    tol: float = 1e-6, max_iter: int = 100
) -> float:
    """
    Solve for implied volatility using Newton-Raphson method.
    Returns IV as decimal (e.g. 0.25 = 25%).
    """
    if T <= 0:
        return 0.0

    sigma = 0.3  # initial guess

    for _ in range(max_iter):
        price = price_option(S, K, T, r, sigma, option_type)
        diff = price - market_price

        if abs(diff) < tol:
            return round(sigma, 6)

        # Vega (unscaled) for Newton step
        d1 = _d1(S, K, T, r, sigma)
        vega = S * _norm_pdf(d1) * math.sqrt(T)

        if vega < 1e-12:
            break

        sigma -= diff / vega
        sigma = max(sigma, 0.001)  # floor

    return round(sigma, 6)


def iv_rank(current_iv: float, iv_low_52w: float, iv_high_52w: float) -> float:
    """
    IV Rank: where current IV sits relative to 52-week range.
    Returns 0-100 scale.
    """
    if iv_high_52w <= iv_low_52w:
        return 50.0
    rank = ((current_iv - iv_low_52w) / (iv_high_52w - iv_low_52w)) * 100
    return round(max(0, min(100, rank)), 1)


def generate_options_chain(
    S: float, r: float, sigma: float, T: float,
    strike_range: int = 10, strike_step: float = 5.0
) -> list:
    """
    Generate a synthetic options chain centered around current price.
    Returns list of {strike, call_price, put_price, call_greeks, put_greeks}.
    """
    center = round(S / strike_step) * strike_step
    chain = []

    for i in range(-strike_range, strike_range + 1):
        K = center + i * strike_step
        if K <= 0:
            continue

        call_price = price_option(S, K, T, r, sigma, "call")
        put_price = price_option(S, K, T, r, sigma, "put")
        call_greeks = compute_greeks(S, K, T, r, sigma, "call")
        put_greeks = compute_greeks(S, K, T, r, sigma, "put")

        chain.append({
            "strike": K,
            "call_price": round(call_price, 2),
            "put_price": round(put_price, 2),
            "call_greeks": call_greeks,
            "put_greeks": put_greeks,
            "itm_call": S > K,
            "itm_put": S < K
        })

    return chain
