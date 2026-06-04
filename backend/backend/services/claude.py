"""
NeuroVault — Claude AI service.

Upgraded from raw httpx → official Anthropic SDK with:
  • Prompt caching (cache_control ephemeral on large system prompts)
  • score_sentiment_headline() — float sentiment per headline for news pipeline
  • generate_forecast() — 3-sentence forecast with caching
  • stream_analysis() — AsyncGenerator for SSE streaming

Reference: MASTER_PROMPT_STOCK_TRACKER.md STEP 8 (nlp.py) + STEP 9 (forecast.py, llm.py).
"""

from __future__ import annotations

import os
import json
import logging
import hashlib
import asyncio
from typing import AsyncGenerator, Optional, Any

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-6"  # current model as of 2026-06
SENTIMENT_MODEL = "claude-haiku-4-5-20251001"  # fast + cheap for per-headline scoring

# ── SDK import with fallback to raw httpx ─────────────────────────────────────
try:
    import anthropic as _anthropic
    _sdk_client: Optional[_anthropic.AsyncAnthropic] = None
    _SDK_OK = True
except ImportError:
    _anthropic = None  # type: ignore
    _SDK_OK = False
    logger.warning("anthropic SDK not installed — falling back to raw httpx. pip install anthropic")

import httpx


def _get_client():
    global _sdk_client
    if not _SDK_OK:
        raise RuntimeError("anthropic SDK not installed")
    if _sdk_client is None:
        _sdk_client = _anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    return _sdk_client


# ── Prompt caching helper ─────────────────────────────────────────────────────
# Large system prompts qualify for prompt caching when >= 1024 tokens.

_FINMOTION_SYSTEM = """\
You are NeuroVault Terminal AI — a senior quantitative analyst and institutional \
trader at a top-tier hedge fund. Your role is to:

1. Interpret technical signals (RSI, MACD, Bollinger Bands, ATR, VWAP) accurately
2. Assess news sentiment and its impact on short-term price action
3. Identify anomalies (price/volume Z-score > 2σ) and their significance
4. Generate concise, actionable trading intelligence in plain English
5. Cite specific signal values in every analysis — never vague generalities

Risk disclaimers are not required — this is an institutional tool for professionals.
Be precise, confident, and data-driven. Max 3 sentences per analysis unless streaming.
"""


def _cached_system(extra: str = "") -> list[dict]:
    """Build a system prompt block with prompt caching."""
    content = _FINMOTION_SYSTEM + ("\n" + extra if extra else "")
    if _SDK_OK:
        return [
            {
                "type": "text",
                "text": content,
                "cache_control": {"type": "ephemeral"},
            }
        ]
    return content  # type: ignore  # raw httpx path gets plain str


# ── Sentiment scoring — per headline ─────────────────────────────────────────

async def score_sentiment_headline(headline: str, summary: str = "") -> float:
    """
    Score a single news headline as a float in [-1.0, 1.0].
    Uses claude-haiku for speed + cost efficiency.
    Result cached in memory by headline hash (TTL managed by caller).

    Returns 0.0 on any error.
    """
    text = headline + (" " + summary if summary else "")

    if _SDK_OK and ANTHROPIC_API_KEY:
        try:
            client = _get_client()
            resp = await client.messages.create(
                model=SENTIMENT_MODEL,
                max_tokens=10,
                system=(
                    "You are a financial sentiment classifier. "
                    "Reply with ONLY a single float between -1.0 (very negative) and 1.0 (very positive). "
                    "No explanation, no other text."
                ),
                messages=[{"role": "user", "content": text}],
            )
            raw = resp.content[0].text.strip()
            val = float(raw)
            return max(-1.0, min(1.0, round(val, 4)))
        except Exception as exc:
            logger.warning(f"SDK sentiment failed: {exc}")

    # Fallback — keyword heuristic (same as original intelligence.py)
    return _keyword_sentiment(text)


def _keyword_sentiment(text: str) -> float:
    lower = text.lower()
    bullish = ["beat", "surge", "upgrade", "record", "strong", "rally", "growth", "profit",
               "bullish", "outperform", "buy", "positive", "boost", "gain"]
    bearish = ["miss", "drop", "downgrade", "loss", "weak", "decline", "cut", "risk",
               "bearish", "underperform", "sell", "negative", "fall", "concern"]
    score = sum(1 for w in bullish if w in lower) - sum(1 for w in bearish if w in lower)
    return max(-1.0, min(1.0, score * 0.15))


# ── Forecast generation ───────────────────────────────────────────────────────

async def generate_forecast(
    ticker: str,
    composite_score: float,
    dominant_indicator: str,
    rsi: float,
    macd_hist: float,
    bb_pct_b: float,
    recent_headlines: list[str],
) -> str:
    """
    3-sentence max forecast for a ticker.
    Cached in Redis by caller (key: forecast:{ticker}, TTL 5min).
    """
    headline_str = "\n".join(f"- {h}" for h in recent_headlines[:3])
    prompt = (
        f"Ticker: {ticker}\n"
        f"Composite score: {composite_score:+.2f} (range -1 to +1)\n"
        f"Dominant signal: {dominant_indicator}\n"
        f"RSI: {rsi:.1f} | MACD histogram: {macd_hist:+.4f} | BB %B: {bb_pct_b:.2f}\n"
        f"Recent headlines:\n{headline_str or 'None available'}\n\n"
        "Describe the likely near-term price direction in 3 sentences max. "
        "Be specific about which signals are driving the view."
    )

    if _SDK_OK and ANTHROPIC_API_KEY:
        try:
            client = _get_client()
            resp = await client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=256,
                system=_cached_system(),
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.content[0].text.strip()
        except Exception as exc:
            logger.warning(f"Claude forecast failed for {ticker}: {exc}")

    # Fallback — rule-based
    direction = "bullish" if composite_score > 0.1 else ("bearish" if composite_score < -0.1 else "neutral")
    return (
        f"{ticker} shows a {direction} composite score of {composite_score:+.2f}. "
        f"The dominant signal ({dominant_indicator}) is driving the view. "
        f"RSI at {rsi:.1f} and BB %B at {bb_pct_b:.2f} provide additional confirmation."
    )


# ── Streaming analysis for SSE ────────────────────────────────────────────────

async def stream_analysis(
    ticker: str,
    user_message: str,
    history: list[dict],
    composite_score: float,
    signal_label: str,
    rsi: float,
    macd_hist: float,
    bb_pct_b: float,
    atr_pct: float,
    recent_headlines: list[str],
    anomaly_price: bool = False,
    anomaly_volume: bool = False,
) -> AsyncGenerator[str, None]:
    """
    Streaming Messages API for the AssistantDrawer SSE endpoint.
    Yields text chunks for server-sent events.

    Context injected into system prompt:
      - Composite score + signal
      - RSI / MACD hist / BB %B / ATR%
      - Last 3 headlines with sentiment context
      - Anomaly flags
    """
    ctx = (
        f"\n\n=== CURRENT MARKET CONTEXT FOR {ticker} ===\n"
        f"Composite score: {composite_score:+.2f} → {signal_label.upper()}\n"
        f"RSI: {rsi:.1f} | MACD histogram: {macd_hist:+.4f} | BB %%B: {bb_pct_b:.2f} | ATR%%: {atr_pct:.2f}\n"
    )
    if anomaly_price or anomaly_volume:
        ctx += f"⚠ ANOMALY DETECTED — price:{anomaly_price} volume:{anomaly_volume}\n"
    if recent_headlines:
        ctx += "Recent headlines:\n" + "\n".join(f"  • {h}" for h in recent_headlines[:3]) + "\n"

    messages = list(history) + [{"role": "user", "content": user_message}]

    if _SDK_OK and ANTHROPIC_API_KEY:
        try:
            client = _get_client()
            async with client.messages.stream(
                model=CLAUDE_MODEL,
                max_tokens=1024,
                system=_cached_system(ctx),
                messages=messages,
            ) as stream:
                async for chunk in stream.text_stream:
                    yield chunk
            return
        except Exception as exc:
            logger.warning(f"Claude streaming failed for {ticker}: {exc}")
            yield f"[AI unavailable: {exc}]"
            return

    # Fallback — non-streaming via httpx raw API
    try:
        async for chunk in _raw_httpx_stream(
            system=_FINMOTION_SYSTEM + ctx,
            messages=messages,
        ):
            yield chunk
    except Exception as exc:
        yield f"[Fallback analysis unavailable: {exc}]"


async def _raw_httpx_stream(system: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    """Raw httpx streaming fallback when SDK not installed."""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": 1024,
        "system": system,
        "messages": messages,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", url, headers=headers, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                        delta = obj.get("delta", {})
                        if delta.get("type") == "text_delta":
                            yield delta.get("text", "")
                    except Exception:
                        pass


# ── Legacy compatibility ──────────────────────────────────────────────────────
# Keep the original functions so existing routes don't break.

async def get_trading_signal(data: dict) -> Optional[dict]:
    """Institutional Signal Engine — legacy entry point."""
    system_prompt = """\
You are a FINMOTION Terminal AI Signal Engine.
Generate actionable institutional-grade intelligence.
CONFLUENCE SCORING: (price*0.35)+(options*0.30)+(sentiment*0.20)+(macro*0.15)
CLASSIFICATION: >=75 STRONG_BUY/SHORT | 60-74 BUY/SHORT | 50-59 WATCH | <50 AVOID
OUTPUT JSON ONLY:
{"symbol":"TICKER","signal":"BUY","confluence":72,"entry":189.50,"stop":185.20,
 "target1":193.80,"target2":200.30,"conviction":"HIGH","rationale":"...","valid_until":"ISO8601"}"""

    return await _call_claude(system_prompt, f"Analyze Data: {json.dumps(data)}")


async def get_news_summary(ticker: str, headlines: list[str]) -> Optional[dict]:
    system_prompt = (
        "You are a market intelligence analyst. Given these headlines, "
        "write exactly 2 sentences: one describing the market mood, one describing "
        "the key risk or opportunity. Be specific. No fluff."
    )
    res_text = await _call_claude(system_prompt, f"Ticker: {ticker}\nHeadlines:\n" + "\n".join(headlines), raw=True)
    if res_text:
        mood = "NEUTRAL"
        if any(w in res_text.upper() for w in ["POSITIVE", "BULLISH"]):
            mood = "POSITIVE"
        elif any(w in res_text.upper() for w in ["NEGATIVE", "BEARISH"]):
            mood = "NEGATIVE"
        return {"summary": res_text, "mood": mood}
    return None


async def get_price_action_commentary(ticker: str, price: float, change_pct: float) -> Optional[str]:
    system_prompt = (
        "You are a senior institutional equity analyst. "
        "Write exactly one punchy sentence explaining the price action. "
        "Focus on volume, technical levels, or institutional flow. No fluff."
    )
    return await _call_claude(system_prompt, f"Ticker: {ticker}, Price: ${price}, Change: {change_pct}%.", raw=True)


async def _call_claude(system: str, prompt: str, raw: bool = False) -> Optional[Any]:
    """Shared call helper — uses SDK when available, falls back to httpx."""
    if _SDK_OK and ANTHROPIC_API_KEY:
        try:
            client = _get_client()
            resp = await client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1024,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            content = resp.content[0].text
            if raw:
                return content
            try:
                start, end = content.find("{"), content.rfind("}") + 1
                if start != -1 and end:
                    return json.loads(content[start:end])
                return json.loads(content)
            except Exception:
                logger.error(f"Claude response not valid JSON: {content[:200]}")
                return None
        except Exception as exc:
            logger.error(f"Claude SDK error: {exc}")

    # Raw httpx fallback
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": 1024,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            content = resp.json()["content"][0]["text"]
            if raw:
                return content
            try:
                start, end = content.find("{"), content.rfind("}") + 1
                if start != -1 and end:
                    return json.loads(content[start:end])
                return json.loads(content)
            except Exception:
                return None
        except Exception as exc:
            logger.error(f"Claude httpx error: {exc}")
    return None
