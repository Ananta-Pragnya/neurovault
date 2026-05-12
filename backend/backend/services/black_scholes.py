import math
from scipy.stats import norm

def black_scholes(S, K, T, r, sigma, option_type='call'):
    """
    Standard Black-Scholes formula for pricing and Greeks.
    S: Current stock price
    K: Strike price
    T: Time to expiration (years)
    r: Risk-free interest rate
    sigma: Volatility (standard deviation of stock's return)
    """
    if T <= 0:
        return { "price": 0, "delta": 0, "gamma": 0, "theta": 0, "vega": 0 }
    
    d1 = (math.log(S/K) + (r + 0.5*sigma**2)*T) / (sigma*math.sqrt(T))
    d2 = d1 - sigma*math.sqrt(T)
    
    if option_type == 'call':
        price = S*norm.cdf(d1) - K*math.exp(-r*T)*norm.cdf(d2)
        delta = norm.cdf(d1)
        theta = (-(S*norm.pdf(d1)*sigma)/(2*math.sqrt(T)) - r*K*math.exp(-r*T)*norm.cdf(d2)) / 365
    else:
        price = K*math.exp(-r*T)*norm.cdf(-d2) - S*norm.cdf(-d1)
        delta = -norm.cdf(-d1)
        theta = (-(S*norm.pdf(d1)*sigma)/(2*math.sqrt(T)) + r*K*math.exp(-r*T)*norm.cdf(-d2)) / 365

    gamma = norm.pdf(d1) / (S*sigma*math.sqrt(T))
    vega  = S*norm.pdf(d1)*math.sqrt(T) / 100
    
    return {
        "price": round(float(price), 2),
        "delta": round(float(delta), 4),
        "gamma": round(float(gamma), 4),
        "theta": round(float(theta), 4),
        "vega": round(float(vega), 4)
    }
