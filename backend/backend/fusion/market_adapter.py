"""
Multi-Market Data Adapter
Normalizes US, Indian, and Crypto market data to a unified schema.
Uses yfinance (already in codebase) — no additional API needed.
"""

import yfinance as yf
import time
import threading
from typing import Dict, List, Optional


# In-memory cache to reduce API calls
_cache: Dict[str, Dict] = {}
_cache_ttl = 300  # 5 minutes


# --- Market Detection ---

MARKET_SUFFIXES = {
    "NSE": ".NS",
    "BSE": ".BO",
    "NASDAQ": "",
    "NYSE": "",
    "CRYPTO": "-USD"
}

# Common tickers for autocomplete
TICKER_UNIVERSE = {
    "US": [
        {"ticker": "AAPL", "name": "Apple Inc", "market": "NASDAQ"},
        {"ticker": "MSFT", "name": "Microsoft Corp", "market": "NASDAQ"},
        {"ticker": "GOOGL", "name": "Alphabet Inc", "market": "NASDAQ"},
        {"ticker": "AMZN", "name": "Amazon.com Inc", "market": "NASDAQ"},
        {"ticker": "NVDA", "name": "NVIDIA Corp", "market": "NASDAQ"},
        {"ticker": "TSLA", "name": "Tesla Inc", "market": "NASDAQ"},
        {"ticker": "META", "name": "Meta Platforms", "market": "NASDAQ"},
        {"ticker": "JPM", "name": "JPMorgan Chase", "market": "NYSE"},
        {"ticker": "V", "name": "Visa Inc", "market": "NYSE"},
        {"ticker": "JNJ", "name": "Johnson & Johnson", "market": "NYSE"},
        {"ticker": "WMT", "name": "Walmart Inc", "market": "NYSE"},
        {"ticker": "BAC", "name": "Bank of America", "market": "NYSE"},
        {"ticker": "SPY", "name": "S&P 500 ETF", "market": "NYSE"},
        {"ticker": "QQQ", "name": "Nasdaq 100 ETF", "market": "NASDAQ"},
        {"ticker": "IWM", "name": "Russell 2000 ETF", "market": "NYSE"},
    ],
    "IN": [
        {"ticker": "RELIANCE.NS", "name": "Reliance Industries", "market": "NSE"},
        {"ticker": "TCS.NS", "name": "Tata Consultancy", "market": "NSE"},
        {"ticker": "INFY.NS", "name": "Infosys Ltd", "market": "NSE"},
        {"ticker": "HDFCBANK.NS", "name": "HDFC Bank", "market": "NSE"},
        {"ticker": "ICICIBANK.NS", "name": "ICICI Bank", "market": "NSE"},
        {"ticker": "HINDUNILVR.NS", "name": "Hindustan Unilever", "market": "NSE"},
        {"ticker": "SBIN.NS", "name": "State Bank of India", "market": "NSE"},
        {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel", "market": "NSE"},
        {"ticker": "ITC.NS", "name": "ITC Ltd", "market": "NSE"},
        {"ticker": "LT.NS", "name": "Larsen & Toubro", "market": "NSE"},
    ],
    "CRYPTO": [
        {"ticker": "BTC-USD", "name": "Bitcoin", "market": "CRYPTO"},
        {"ticker": "ETH-USD", "name": "Ethereum", "market": "CRYPTO"},
        {"ticker": "SOL-USD", "name": "Solana", "market": "CRYPTO"},
        {"ticker": "BNB-USD", "name": "Binance Coin", "market": "CRYPTO"},
        {"ticker": "XRP-USD", "name": "Ripple", "market": "CRYPTO"},
        {"ticker": "ADA-USD", "name": "Cardano", "market": "CRYPTO"},
        {"ticker": "DOGE-USD", "name": "Dogecoin", "market": "CRYPTO"},
        {"ticker": "AVAX-USD", "name": "Avalanche", "market": "CRYPTO"},
    ]
}


def detect_market(ticker: str) -> str:
    """Auto-detect which market a ticker belongs to."""
    if ticker.endswith(".NS"):
        return "NSE"
    elif ticker.endswith(".BO"):
        return "BSE"
    elif ticker.endswith("-USD") or ticker.endswith("-USDT"):
        return "CRYPTO"
    else:
        return "US"


def search_tickers(query: str) -> List[Dict]:
    """
    Search across all market ticker universes.
    Returns matching tickers for autocomplete.
    """
    q = query.upper().strip()
    results = []

    for market, tickers in TICKER_UNIVERSE.items():
        for t in tickers:
            if q in t["ticker"].upper() or q in t["name"].upper():
                results.append(t)

    return results[:15]  # Cap at 15 results


def fetch_quote(ticker: str) -> Dict:
    """
    Fetch current quote for any market — normalized output.
    Uses cache to minimize API calls.
    """
    cache_key = f"quote_{ticker}"
    if cache_key in _cache:
        cached = _cache[cache_key]
        if time.time() - cached.get("_cached_at", 0) < _cache_ttl:
            return cached

    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        
        # Get recent history for sparkline
        hist = stock.history(period="5d")
        sparkline = hist["Close"].tolist() if not hist.empty else []
        
        market = detect_market(ticker)
        
        current_price = info.get("currentPrice") or info.get("regularMarketPrice") or (sparkline[-1] if sparkline else 0)
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose") or (sparkline[-2] if len(sparkline) >= 2 else current_price)
        
        change = current_price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        
        result = {
            "ticker": ticker,
            "name": info.get("shortName", info.get("longName", ticker)),
            "market": market,
            "current_price": round(current_price, 2),
            "previous_close": round(prev_close, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": info.get("volume", 0),
            "avg_volume": info.get("averageVolume", 0),
            "market_cap": info.get("marketCap", 0),
            "day_high": info.get("dayHigh", 0),
            "day_low": info.get("dayLow", 0),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh", 0),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow", 0),
            "sparkline": [round(p, 2) for p in sparkline[-20:]],
            "sector": info.get("sector", "Unknown"),
            "currency": "INR" if market in ["NSE", "BSE"] else "USD",
            "volume_spike": _detect_volume_spike(info.get("volume", 0), info.get("averageVolume", 1)),
            "_cached_at": time.time()
        }
        
        _cache[cache_key] = result
        return result

    except Exception as e:
        return {
            "ticker": ticker,
            "error": str(e),
            "market": detect_market(ticker),
            "current_price": 0,
            "change_pct": 0
        }


def fetch_ohlcv(ticker: str, period: str = "6mo", interval: str = "1d") -> Dict:
    """
    Fetch OHLCV history for analysis — normalized format.
    """
    cache_key = f"ohlcv_{ticker}_{period}_{interval}"
    if cache_key in _cache:
        cached = _cache[cache_key]
        if time.time() - cached.get("_cached_at", 0) < _cache_ttl:
            return cached

    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return {"ticker": ticker, "error": "No data", "data": []}

        data = []
        for idx, row in hist.iterrows():
            data.append({
                "date": idx.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"])
            })

        prices = [d["close"] for d in data]
        volumes = [d["volume"] for d in data]
        
        result = {
            "ticker": ticker,
            "market": detect_market(ticker),
            "period": period,
            "interval": interval,
            "data": data,
            "prices": prices,
            "volumes": volumes,
            "count": len(data),
            "_cached_at": time.time()
        }
        
        _cache[cache_key] = result
        return result

    except Exception as e:
        return {"ticker": ticker, "error": str(e), "data": [], "prices": [], "volumes": []}


def fetch_batch_quotes(tickers: List[str]) -> List[Dict]:
    """Fetch quotes for multiple tickers in parallel."""
    results = []
    threads = []

    def fetch_and_store(t):
        results.append(fetch_quote(t))

    for ticker in tickers[:20]:  # Cap at 20
        thread = threading.Thread(target=fetch_and_store, args=(ticker,))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join(timeout=10)

    return results


def _detect_volume_spike(current_vol: int, avg_vol: int) -> Dict:
    """Detect if current volume is unusually high."""
    if avg_vol <= 0:
        return {"spike": False, "ratio": 0}
    
    ratio = current_vol / avg_vol
    return {
        "spike": ratio > 2.0,
        "ratio": round(ratio, 2),
        "label": "🔥 HIGH" if ratio > 3 else "⚡ ELEVATED" if ratio > 2 else "NORMAL"
    }
