"""
LlamaService — Groq-hosted AI inference for FinMotion AI.

Two models:
  • Llama 4 Scout  (MODEL_PRIMARY)   → fast forecast reasoning
  • GPT-OSS 120B   (MODEL_REASONING) → deep strategy narration
  • Auto-fallback: 120B → Scout on rate-limit (429)

Neither model is downloaded locally — both run on Groq's servers.
Set GROQ_API_KEY in backend/.env and call them like any REST API.

Free tier: 1,000 req/day per model (resets midnight UTC).
5-minute cache on all outputs → ~12 Groq calls/hour max per model.
"""

import os
import logging
from groq import Groq
from backend.backend.cache.cache import unified_cache

logger = logging.getLogger(__name__)

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _client = Groq(api_key=api_key)
    return _client


# ── Model IDs ─────────────────────────────────────────────────────
MODEL_PRIMARY   = "meta-llama/llama-4-scout-17b-16e-instruct"
# Llama 4 Scout — 250+ tok/s, vision-ready, handles forecast reasoning

MODEL_REASONING = "openai/gpt-oss-120b"
# GPT-OSS 120B — institutional quality for strategy narration
# (Groq deprecated llama-3.3-70b-versatile on 2026-06-17; this is their recommended replacement)

MODEL_FALLBACK  = "meta-llama/llama-4-scout-17b-16e-instruct"
# If 70B hits rate limit → Scout takes over automatically


# ── Core Groq Caller ──────────────────────────────────────────────
def _call_groq(
    system:     str,
    user:       str,
    max_tokens: int = 200,
    mode:       str = "primary",  # "primary" | "reasoning" | "fallback"
) -> str:
    model_map = {
        "primary":   MODEL_PRIMARY,
        "reasoning": MODEL_REASONING,
        "fallback":  MODEL_FALLBACK,
    }
    model = model_map.get(mode, MODEL_PRIMARY)

    try:
        client = _get_client()
        res = client.chat.completions.create(
            model      = model,
            messages   = [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            max_tokens  = max_tokens,
            temperature = 0.3,
        )
        return res.choices[0].message.content.strip()

    except Exception as e:
        err_str = str(e)
        # Auto-fallback: 70B rate limit → Scout
        if ("429" in err_str or "rate_limit" in err_str.lower()) and mode == "reasoning":
            logger.warning("[Llama] GPT-OSS 120B rate-limit hit — falling back to Llama 4 Scout")
            return _call_groq(system, user, max_tokens, mode="fallback")
        logger.error(f"[Llama] Groq call failed ({mode}): {e}")
        raise


# ── Forecast Reasoning (Llama 4 Scout) ───────────────────────────
_FORECAST_SYSTEM = """You are a quantitative analyst at an institutional trading desk.
You receive technical analysis signals and write a concise professional forecast note.
Be direct. No filler. Exactly 3 sentences:
1. Trend analysis from SMA signals.
2. Momentum assessment from RSI and Bollinger.
3. Overall directional outlook with price target rationale."""


async def generate_forecast_reasoning(forecast: dict) -> str:
    """
    Llama 4 Scout generates a 3-sentence forecast note from TA signals.
    Cached for 5 minutes — does NOT re-run on every price tick.
    """
    symbol    = forecast.get("symbol", "UNKNOWN")
    direction = forecast.get("direction", "neutral")
    cache_key = f"llama:forecast:{symbol}:{direction}"

    cached = unified_cache.get(cache_key)
    if cached:
        return cached

    signals = forecast.get("signals", {})
    sma_lbl = signals.get("sma_trend",    {}).get("label", "")
    rsi_lbl = signals.get("rsi_momentum", {}).get("label", "")
    bll_lbl = signals.get("bollinger",    {}).get("label", "")

    prompt = (
        f"Symbol: {symbol}\n"
        f"Last close: ${forecast.get('last_close', 0):.2f}\n"
        f"Price target: ${forecast.get('price_target', 0):.2f}\n"
        f"Direction: {direction.upper()} ({forecast.get('confidence', 0)}% confidence)\n"
        f"Momentum (10-day): {forecast.get('momentum_pct', 0):+.2f}%\n\n"
        f"Signals:\n"
        f"- SMA 20/50: {signals.get('sma_trend', {}).get('value', 0):+.3f} ({sma_lbl})\n"
        f"- RSI:       {signals.get('rsi_momentum', {}).get('value', 0):+.3f} ({rsi_lbl})\n"
        f"- Bollinger: {signals.get('bollinger', {}).get('value', 0):+.3f} ({bll_lbl})\n\n"
        f"Write the forecast reasoning note."
    )

    try:
        result = _call_groq(_FORECAST_SYSTEM, prompt, max_tokens=250, mode="primary")
        unified_cache.set(cache_key, result, ttl=300)
        return result
    except Exception as e:
        logger.error(f"[Llama] Forecast reasoning failed for {symbol}: {e}")
        return (
            f"{direction.capitalize()} bias detected. "
            f"{forecast.get('confidence', 0)}% signal confidence from TA ensemble. "
            f"Price target: ${forecast.get('price_target', 0):.2f}."
        )


# ── Strategy Narration (GPT-OSS 120B) ────────────────────────────
_STRATEGY_SYSTEM = """You are a senior options strategist writing institutional trade rationale.
Exactly 3 sentences:
1. Why this strategy fits current market conditions and forecast.
2. Key risk to monitor.
3. Target outcome if thesis plays out."""


async def generate_strategy_narration(
    strategy_type: str,
    symbol:        str,
    strategy_data: dict,
    forecast:      dict | None = None,
) -> str:
    """
    GPT-OSS 120B writes a 3-sentence trade rationale.
    Falls back to Scout automatically on rate limit.
    Cached for 5 minutes.
    """
    cache_key = f"llama:strategy:{strategy_type}:{symbol}"
    cached    = unified_cache.get(cache_key)
    if cached:
        return cached

    forecast_ctx = ""
    if forecast:
        forecast_ctx = (
            f"\nForecast context (QuantPulse TA Ensemble):\n"
            f"- Direction: {forecast.get('direction', 'neutral').upper()}\n"
            f"- Confidence: {forecast.get('confidence', 'N/A')}%\n"
            f"- Reasoning: {forecast.get('reasoning', forecast.get('market_analysis', ''))}\n"
        )

    params_block = "\n".join(f"- {k}: {v}" for k, v in strategy_data.items())
    prompt = (
        f"Strategy: {strategy_type.replace('-', ' ').title()}\n"
        f"Symbol: {symbol}\n"
        f"{forecast_ctx}\n"
        f"Parameters:\n{params_block}\n\n"
        f"Write the trade rationale."
    )

    try:
        result = _call_groq(_STRATEGY_SYSTEM, prompt, max_tokens=250, mode="reasoning")
        unified_cache.set(cache_key, result, ttl=300)
        return result
    except Exception as e:
        logger.error(f"[Llama] Strategy narration failed for {symbol}: {e}")
        return (
            f"{strategy_type.replace('-', ' ').title()} on {symbol} — "
            f"review parameters above for full risk/reward profile."
        )
