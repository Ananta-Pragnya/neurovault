"""
NLP pipeline — sentiment, NER, embedding.
Uses Haiku (cheapest Claude) for classification + Voyage voyage-3-lite for embeddings.
Everything is hash-cached: sentiment 6h, NER 24h, embeddings 7 days.
"""

import re
import json
import hashlib
import asyncio
import os
import logging
from dataclasses import dataclass, field

from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

_anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
_VOYAGE_KEY = os.getenv("VOYAGE_API_KEY", "")
_voyage_client = None

def _get_voyage():
    global _voyage_client
    if _voyage_client is None and _VOYAGE_KEY:
        try:
            import voyageai
            _voyage_client = voyageai.AsyncClient(api_key=_VOYAGE_KEY)
        except ImportError:
            pass
    return _voyage_client


@dataclass
class NLPResult:
    clean_text:     str
    tokens:         list
    sentiment_score: float          # -1.0 to 1.0
    sentiment_label: str            # positive | negative | neutral
    tickers:        list            # ["NVDA", "TSLA"]
    organisations:  list            # ["NVIDIA Corporation"]
    places:         list            # ["United States"]
    asset_tags:     list            # ["Equities", "FX"]
    embedding:      list = field(default_factory=list)
    novelty_score:  float = 1.0


def _hash(text: str, prefix: str) -> str:
    return f"{prefix}:{hashlib.sha256(text.encode()).hexdigest()[:20]}"


def _cache_get(cache, key):
    try:
        v = cache.get(key)
        return json.loads(v) if isinstance(v, str) else v
    except Exception:
        return None


def _cache_set(cache, key, value, ttl: int):
    try:
        cache.set(key, json.dumps(value), ttl=ttl)
    except Exception:
        pass


async def clean_text(raw: str) -> tuple:
    text = re.sub(r"<[^>]+>", " ", raw)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    tokens = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
    return text, tokens


async def score_sentiment(text: str, cache=None) -> tuple:
    key = _hash(text[:200], "sent")
    if cache:
        cached = _cache_get(cache, key)
        if cached is not None:
            score = float(cached)
            label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
            return score, label

    try:
        resp = await _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            system=(
                "You are a financial sentiment classifier. "
                "Reply with ONLY a float from -1.0 (very negative) to 1.0 (very positive). "
                "No other text."
            ),
            messages=[{"role": "user", "content": text[:500]}],
        )
        score = max(-1.0, min(1.0, float(resp.content[0].text.strip())))
    except Exception as e:
        logger.debug(f"[NLP] Sentiment fallback: {e}")
        score = 0.0

    label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
    if cache:
        _cache_set(cache, key, score, ttl=21600)  # 6h
    return score, label


async def extract_entities(headline: str, summary: str, cache=None) -> dict:
    text = f"{headline}. {summary}"[:500]
    key = _hash(text, "ner")
    if cache:
        cached = _cache_get(cache, key)
        if cached is not None:
            return cached

    try:
        resp = await _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            system="""Extract entities from financial text.
Reply ONLY with JSON, no markdown:
{"tickers":[],"organisations":[],"places":[],"asset_tags":[]}
asset_tags values: Equities, FX, Commodities, Crypto, Fixed Income, Real Estate.""",
            messages=[{"role": "user", "content": text}],
        )
        result = json.loads(resp.content[0].text.strip())
    except Exception as e:
        logger.debug(f"[NLP] NER fallback: {e}")
        result = {"tickers": [], "organisations": [], "places": [], "asset_tags": []}

    if cache:
        _cache_set(cache, key, result, ttl=86400)  # 24h
    return result


async def embed(text: str, cache=None) -> list:
    key = _hash(text[:200], "emb")
    if cache:
        cached = _cache_get(cache, key)
        if cached is not None:
            return cached

    vc = _get_voyage()
    if vc is None:
        return []   # no key configured — skip embedding silently

    try:
        result = await vc.embed([text[:2000]], model="voyage-3-lite")
        vec = result.embeddings[0]
    except Exception as e:
        logger.warning(f"[NLP] Embedding failed: {e}")
        return []

    if cache:
        _cache_set(cache, key, vec, ttl=604800)  # 7 days
    return vec


async def run_pipeline(
    headline: str,
    summary: str,
    body: str = "",
    cache=None,
) -> NLPResult:
    full_text = f"{headline}. {summary}. {body}"[:1000]
    clean, tokens = await clean_text(full_text)

    (sentiment_score, sentiment_label), entities, embedding = await asyncio.gather(
        score_sentiment(clean[:500], cache),
        extract_entities(headline, summary, cache),
        embed(f"{headline}. {summary}", cache),
    )

    return NLPResult(
        clean_text=clean,
        tokens=tokens,
        sentiment_score=sentiment_score,
        sentiment_label=sentiment_label,
        tickers=entities.get("tickers", []),
        organisations=entities.get("organisations", []),
        places=entities.get("places", []),
        asset_tags=entities.get("asset_tags", []),
        embedding=embedding,
    )
