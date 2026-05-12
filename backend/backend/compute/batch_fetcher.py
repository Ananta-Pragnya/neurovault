"""
Batch Data Fetcher - ONE API call for all symbols
Minimizes API usage for free tier compatibility
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import json
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# Institutional watchlist - curated, not bloated
INSTITUTIONAL_SYMBOLS = [
    # Mega Cap Tech
    "AAPL", "MSFT", "GOOGL", "NVDA", "META",
    # Leaders
    "TSLA", "AMZN", "JPM", "V", "WMT",
    # Indices
    "SPY", "QQQ", "IWM", "DIA",
    # Volatility
    "^VIX"
]

CACHE_FILE = "backend/cache/market_data.json"

def fetch_all_data() -> Dict:
    """
    Single batch fetch for all symbols
    ONE API call instead of 15+
    """
    try:
        logger.info(f"📡 Fetching {len(INSTITUTIONAL_SYMBOLS)} symbols in ONE batch...")
        
        # Download all at once - yfinance supports this natively
        data = yf.download(
            tickers=" ".join(INSTITUTIONAL_SYMBOLS),
            period="5d",  # 5 days for context
            interval="1d",
            group_by="ticker",
            progress=False,
            threads=False  # Sequential to avoid rate limits
        )
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "symbols": {},
            "indices": {}
        }
        
        for symbol in INSTITUTIONAL_SYMBOLS:
            try:
                if symbol.startswith("^"):
                    # Index
                    result["indices"][symbol] = extract_symbol_data(data, symbol)
                else:
                    result["symbols"][symbol] = extract_symbol_data(data, symbol)
            except Exception as e:
                logger.error(f"Error processing {symbol}: {e}")
        
        # Save to cache
        save_to_cache(result)
        
        logger.info(f"✅ Batch fetch complete. Data cached at {datetime.now()}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Batch fetch failed: {e}")
        return load_from_cache()  # Fallback to cached data

def extract_symbol_data(data: pd.DataFrame, symbol: str) -> Dict:
    """Extract relevant data for a symbol"""
    try:
        if symbol in data.columns.levels[0]:
            sym_data = data[symbol]
        else:
            sym_data = data
        
        latest = sym_data.iloc[-1]
        previous = sym_data.iloc[-2] if len(sym_data) > 1 else latest
        
        return {
            "price": float(latest['Close']),
            "open": float(latest['Open']),
            "high": float(latest['High']),
            "low": float(latest['Low']),
            "volume": int(latest['Volume']) if 'Volume' in latest else 0,
            "change": float(((latest['Close'] - previous['Close']) / previous['Close']) * 100),
            "history_5d": {
                "close": sym_data['Close'].tolist()[-5:],
                "volume": sym_data['Volume'].tolist()[-5:] if 'Volume' in sym_data else []
            }
        }
    except Exception as e:
        logger.error(f"Error extracting data for {symbol}: {e}")
        return {}

def save_to_cache(data: Dict):
    """Save to local cache"""
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Cache save failed: {e}")

def load_from_cache() -> Dict:
    """Load from cache as fallback"""
    try:
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {"symbols": {}, "indices": {}, "timestamp": datetime.now().isoformat()}

def get_cached_data() -> Dict:
    """Get latest cached data"""
    return load_from_cache()
