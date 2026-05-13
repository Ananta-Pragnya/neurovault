"""
Alpaca Service — batched market data from Alpaca paper/sandbox account.

ALL symbols fetched in ONE API call per market type.
Live prices from WebSocket stream also written to unified_cache
so REST endpoints read real-time data.

Sandbox URLs:
  Stock snapshots: https://data.sandbox.alpaca.markets/v2/stocks/snapshots
  Crypto snapshots: https://data.sandbox.alpaca.markets/v1beta3/crypto/us/snapshots
  Bars: https://data.sandbox.alpaca.markets/v2/stocks/bars
  WS stocks:  wss://stream.data.sandbox.alpaca.markets/v2/iex
  WS crypto:  wss://stream.data.sandbox.alpaca.markets/v1beta3/crypto/us
"""

import os
import httpx
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
import pytz

from backend.backend.cache.cache import unified_cache

logger = logging.getLogger(__name__)

# ── API Keys (from .env — never hardcoded) ─────────────────────────
ALPACA_KEY    = os.getenv("ALPACA_API_KEY", "")
ALPACA_SECRET = os.getenv("ALPACA_SECRET_KEY", "")

def _headers() -> dict:
    return {
        "APCA-API-KEY-ID":     os.getenv("ALPACA_API_KEY", ""),
        "APCA-API-SECRET-KEY": os.getenv("ALPACA_SECRET_KEY", ""),
    }

# ── Market Data Endpoints (paper trading uses live data feed) ──────
STOCK_SNAPSHOT_URL  = "https://data.alpaca.markets/v2/stocks/snapshots"
CRYPTO_SNAPSHOT_URL = "https://data.alpaca.markets/v1beta3/crypto/us/snapshots"
BARS_URL            = "https://data.alpaca.markets/v2/stocks/bars"
PAPER_API_URL       = "https://paper-api.alpaca.markets/v2"

# ── WebSocket Stream URLs ──────────────────────────────────────────
STOCK_STREAM_URL  = "wss://stream.data.alpaca.markets/v2/iex"
CRYPTO_STREAM_URL = "wss://stream.data.alpaca.markets/v1beta3/crypto/us"

# ── Symbol Mappings ────────────────────────────────────────────────
CRYPTO_SYMBOL_MAP = {
    "BTC/USD":  "BTC/USD",
    "ETH/USD":  "ETH/USD",
    "SOL/USD":  "SOL/USD",
    "DOGE/USD": "DOGE/USD",
}

NAME_MAPPING = {
    "AAPL":   "Apple Inc.",
    "TSLA":   "Tesla Inc.",
    "NVDA":   "NVIDIA Corporation",
    "MSFT":   "Microsoft Corporation",
    "GOOGL":  "Alphabet Inc.",
    "AMZN":   "Amazon.com Inc.",
    "META":   "Meta Platforms Inc.",
    "SPY":    "SPDR S&P 500 ETF",
    "QQQ":    "Invesco QQQ Trust",
    "BTC/USD": "Bitcoin / USD",
    "ETH/USD": "Ethereum / USD",
    "SOL/USD": "Solana / USD",
}


def normalize_symbol(symbol: str, market: str = "stock") -> str:
    """Normalize symbol for the correct Alpaca endpoint format."""
    if market == "crypto":
        return CRYPTO_SYMBOL_MAP.get(symbol, symbol)
    return symbol.upper().strip()


def is_market_open() -> bool:
    """Check if US equity market is currently open (9:30 AM–4:00 PM ET)."""
    et = pytz.timezone("US/Eastern")
    now = datetime.now(et)
    if now.weekday() >= 5:
        return False
    open_t  = now.replace(hour=9,  minute=30, second=0, microsecond=0)
    close_t = now.replace(hour=16, minute=0,  second=0, microsecond=0)
    return open_t <= now <= close_t


# ── Batched Snapshot Fetch ─────────────────────────────────────────
async def get_all_snapshots(symbols: list[str], market: str = "stock") -> dict:
    """
    Fetch ALL symbols in ONE API call. Always use this — never call per symbol.
    Caches results for 30 seconds.
    """
    if not symbols:
        return {}

    cache_key = f"snapshots:{market}:{','.join(sorted(symbols))}"
    cached    = unified_cache.get(cache_key)
    if cached:
        return cached

    if market == "crypto":
        clean  = [normalize_symbol(s, "crypto") for s in symbols]
        url    = CRYPTO_SNAPSHOT_URL
        params = {"symbols": ",".join(clean)}
    else:
        clean  = [normalize_symbol(s, "stock") for s in symbols]
        url    = STOCK_SNAPSHOT_URL
        params = {"symbols": ",".join(clean), "feed": "iex"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url, params=params, headers=_headers())
            res.raise_for_status()
            data = res.json()

        results: dict = {}

        if market == "crypto":
            snapshot_data = data.get("snapshots", data)
            for symbol in symbols:
                clean_sym = normalize_symbol(symbol, "crypto")
                s = snapshot_data.get(clean_sym) or snapshot_data.get(symbol)
                if s and "latestTrade" in s:
                    price      = s["latestTrade"]["p"]
                    prev_close = s.get("prevDailyBar", {}).get("c", price)
                    change     = price - prev_close
                    change_pct = (change / prev_close * 100) if prev_close else 0.0
                    results[symbol] = {
                        "ticker":     symbol,
                        "name":       NAME_MAPPING.get(symbol, symbol),
                        "price":      price,
                        "change":     round(change, 4),
                        "change_pct": round(change_pct, 2),
                        "volume":     s.get("dailyBar", {}).get("v", 0),
                        "bid":        s.get("latestQuote", {}).get("bp", 0),
                        "ask":        s.get("latestQuote", {}).get("ap", 0),
                        "timestamp":  s["latestTrade"]["t"],
                        "provider":   "alpaca",
                    }
        else:
            for symbol in symbols:
                clean_sym = normalize_symbol(symbol, "stock")
                s = data.get(clean_sym) or data.get("snapshots", {}).get(clean_sym)
                if s and "latestTrade" in s:
                    price      = s["latestTrade"]["p"]
                    prev_close = s.get("prevDailyBar", {}).get("c", price)
                    change     = price - prev_close
                    change_pct = (change / prev_close * 100) if prev_close else 0.0
                    results[symbol] = {
                        "ticker":     symbol,
                        "name":       NAME_MAPPING.get(symbol, symbol),
                        "price":      price,
                        "change":     round(change, 4),
                        "change_pct": round(change_pct, 2),
                        "volume":     s.get("dailyBar", {}).get("v", 0),
                        "bid":        s.get("latestQuote", {}).get("bp", 0),
                        "ask":        s.get("latestQuote", {}).get("ap", 0),
                        "timestamp":  s["latestTrade"]["t"],
                        "provider":   "alpaca",
                    }

        if results:
            unified_cache.set(cache_key, results, ttl=30)
        return results

    except Exception as e:
        logger.error(f"[Alpaca] Batch snapshot failed ({market}): {e}")
        return {}


# ── Bars (OHLCV history) ───────────────────────────────────────────
async def get_bars(symbol: str, timeframe: str = "1Day", limit: int = 60) -> list[dict]:
    """
    Fetch OHLCV bars for ONE symbol (cached 5 minutes).
    Returns list of dicts with keys: t, o, h, l, c, v.
    """
    cache_key = f"bars:{symbol}:{timeframe}:{limit}"
    cached    = unified_cache.get(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                BARS_URL,
                params={
                    "symbols":   symbol,
                    "timeframe": timeframe,
                    "limit":     limit,
                    "feed":      "iex",
                    "sort":      "asc",
                },
                headers=_headers(),
            )
            res.raise_for_status()
            raw_bars = res.json().get("bars", {}).get(symbol, [])

        bars = [
            {
                "t":     b.get("t", ""),
                "open":  b.get("o", 0),
                "high":  b.get("h", 0),
                "low":   b.get("l", 0),
                "close": b.get("c", 0),
                "c":     b.get("c", 0),  # alias used by quant_service
                "volume": b.get("v", 0),
            }
            for b in raw_bars
        ]

        if bars:
            unified_cache.set(cache_key, bars, ttl=300)
        return bars

    except Exception as e:
        logger.error(f"[Alpaca] get_bars failed for {symbol}: {e}")
        return []


# ── Account Info ───────────────────────────────────────────────────
async def get_account() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"{PAPER_API_URL}/account", headers=_headers())
            res.raise_for_status()
            return res.json()
    except Exception as e:
        logger.error(f"[Alpaca] Account fetch failed: {e}")
        return {"status": "offline", "portfolio_value": 0.0}


# ── Composite Refresh ─────────────────────────────────────────────
async def refresh_all_market_data(stock_symbols: list, crypto_symbols: list) -> dict:
    """Two API calls total — one stocks, one crypto. Call on a 30-second timer."""
    stocks  = await get_all_snapshots(stock_symbols,  market="stock")
    cryptos = await get_all_snapshots(crypto_symbols, market="crypto")
    return {**stocks, **cryptos}
