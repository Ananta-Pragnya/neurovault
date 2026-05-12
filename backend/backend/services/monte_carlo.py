import numpy as np

def monte_carlo(S0, mu, sigma, days, simulations=1000):
    """
    Monte Carlo Simulation using Geometric Brownian Motion.
    S0: Current price
    mu: Expected return (annual)
    sigma: Volatility (annual)
    days: Time horizon in days
    """
    dt = 1/252  # Trading days in a year
    paths = np.zeros((simulations, days))
    paths[:,0] = S0
    for t in range(1, days):
        z = np.random.standard_normal(simulations)
        # S(t) = S(t-1) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*z)
        paths[:,t] = paths[:,t-1] * np.exp((mu - 0.5*sigma**2)*dt + sigma*np.sqrt(dt)*z)
    
    return {
        "paths": paths[:50].tolist(),   # Send 50 paths to frontend
        "mean_final": round(float(np.mean(paths[:,-1])), 2),
        "p10": round(float(np.percentile(paths[:,-1], 10)), 2),
        "p90": round(float(np.percentile(paths[:,-1], 90)), 2)
    }
