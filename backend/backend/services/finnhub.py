import httpx
import os
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "your_key_here")
BASE_URL = "https://finnhub.io/api/v1"

async def get_company_news(ticker: str) -> List[Dict]:
    """Latest 10 news articles for ticker"""
    from datetime import datetime, timedelta
    to_date = datetime.now().strftime('%Y-%m-%d')
    from_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    
    url = f"{BASE_URL}/company-news?symbol={ticker}&from={from_date}&to={to_date}&token={FINNHUB_API_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return [
                {
                    "headline": n.get("headline"),
                    "summary": n.get("summary"),
                    "url": n.get("url"),
                    "datetime": n.get("datetime")
                } for n in data[:10]
            ]
        except Exception as e:
            logger.error(f"Finnhub company-news error for {ticker}: {e}")
    return []

async def get_quote(symbol: str) -> Optional[Dict]:
    """Real-time quote (P1/P3 fallback)"""
    url = f"{BASE_URL}/quote?symbol={symbol}&token={FINNHUB_API_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if data.get("c"): # 'c' is current price in Finnhub
                return {
                    "price": data.get("c"),
                    "change": data.get("d"),
                    "change_pct": data.get("dp"),
                    "high": data.get("h"),
                    "low": data.get("l"),
                    "open": data.get("o"),
                    "prev_close": data.get("pc"),
                    "timestamp": data.get("t")
                }
        except Exception as e:
            logger.error(f"Finnhub get_quote error for {symbol}: {e}")
    return None

async def get_social_sentiment(ticker: str) -> Optional[Dict]:
    """Social sentiment score (bullish %, bearish %)"""
    url = f"{BASE_URL}/stock/social-sentiment?symbol={ticker}&token={FINNHUB_API_KEY}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if data.get("reddit") or data.get("twitter"):
                return data
        except Exception as e:
            logger.error(f"Finnhub social-sentiment error for {ticker}: {e}")
    return None
