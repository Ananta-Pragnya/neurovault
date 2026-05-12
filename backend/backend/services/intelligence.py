"""
Intelligence Service — Finnhub news fetch + keyword sentiment scoring.

One Finnhub call per symbol per 5 minutes (TTL cache).
Keyword scoring: no extra API call — pure text matching.
Publishes SENTIMENT_BULLISH / SENTIMENT_BEARISH to Signal Bus.
QuantPulse subscribes and adjusts forecast confidence accordingly.
"""

import os
import httpx
import logging
from datetime import date, timedelta

from backend.backend.cache.cache import unified_cache
from backend.backend.bus.bus import bus, BusEvent

logger = logging.getLogger(__name__)

FINNHUB_URL = "https://finnhub.io/api/v1/company-news"
NEWS_TTL    = 300  # 5 minutes

_BULLISH_WORDS = [
    "beat", "beats", "surge", "surges", "rally", "rallies", "upgrade", "upgraded",
    "record", "growth", "profit", "bullish", "strong", "rises", "rise", "outperform",
    "buy", "positive", "boost", "raised", "exceed", "exceeds", "revenue", "earnings",
]
_BEARISH_WORDS = [
    "miss", "misses", "drop", "drops", "crash", "crashes", "downgrade", "downgraded",
    "loss", "bearish", "weak", "cut", "cuts", "fall", "falls", "risk", "warning",
    "sell", "negative", "decline", "declines", "below", "disappoint", "disappoints",
]


def _score_headline(headline: str) -> float:
    """Keyword-based sentiment scoring — returns value in [-1.0, 1.0]."""
    h     = headline.lower()
    score = sum(0.2 for w in _BULLISH_WORDS if w in h)
    score -= sum(0.2 for w in _BEARISH_WORDS if w in h)
    return max(-1.0, min(1.0, score))


def _today() -> str:
    return date.today().isoformat()


def _today_minus(days: int) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


async def fetch_and_score_news(symbol: str) -> dict:
    """
    Fetch up to 10 recent articles from Finnhub, score headlines,
    publish sentiment event to Signal Bus, cache result for 5 min.
    """
    cache_key = f"news:{symbol}"
    cached    = unified_cache.get(cache_key)
    if cached:
        return cached

    api_key = os.getenv("FINNHUB_API_KEY", "")
    if not api_key or api_key == "your_finnhub_key_here":
        logger.warning(f"[Intel] FINNHUB_API_KEY not set — returning empty news for {symbol}")
        return {
            "symbol":    symbol,
            "score":     0.0,
            "sentiment": "neutral",
            "articles":  [],
            "count":     0,
            "error":     "FINNHUB_API_KEY not configured",
        }

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.get(
                FINNHUB_URL,
                params={
                    "symbol": symbol,
                    "from":   _today_minus(7),
                    "to":     _today(),
                    "token":  api_key,
                },
            )
            res.raise_for_status()
            articles = res.json()[:10]

    except Exception as e:
        logger.error(f"[Intel] Finnhub fetch failed for {symbol}: {e}")
        return {
            "symbol":    symbol,
            "score":     0.0,
            "sentiment": "neutral",
            "articles":  [],
            "count":     0,
            "error":     str(e),
        }

    # Score each headline
    scores    = [_score_headline(a.get("headline", "")) for a in articles]
    avg_score = round(sum(scores) / len(scores), 4) if scores else 0.0

    if avg_score > 0.15:
        sentiment = "bullish"
    elif avg_score < -0.15:
        sentiment = "bearish"
    else:
        sentiment = "neutral"

    # Normalise articles for frontend
    clean_articles = [
        {
            "headline":  a.get("headline", ""),
            "summary":   a.get("summary", ""),
            "url":       a.get("url", ""),
            "datetime":  a.get("datetime", 0),
            "source":    a.get("source", ""),
            "score":     round(_score_headline(a.get("headline", "")), 3),
        }
        for a in articles[:5]
    ]

    result = {
        "symbol":    symbol,
        "score":     avg_score,
        "sentiment": sentiment,
        "articles":  clean_articles,
        "count":     len(articles),
    }
    unified_cache.set(cache_key, result, ttl=NEWS_TTL)

    # Publish to Signal Bus so QuantPulse can adjust confidence
    if sentiment == "bullish":
        bus.publish(BusEvent.SENTIMENT_BULLISH, {
            "symbol":    symbol,
            "score":     avg_score,
            "magnitude": abs(avg_score),
        })
    elif sentiment == "bearish":
        bus.publish(BusEvent.SENTIMENT_BEARISH, {
            "symbol":    symbol,
            "score":     avg_score,
            "magnitude": abs(avg_score),
        })

    return result
