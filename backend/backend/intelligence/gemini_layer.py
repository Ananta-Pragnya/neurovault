"""
AI Intelligence Layer — Gemini Integration
Signal explainer, strategy generator, news summarizer, risk advisor, Q&A.
Uses Google Gemini API (keys provided).
"""

import os
import json
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Try to import Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. AI features will use fallback mode.")


# Rotate through API keys for rate-limiting resilience
API_KEYS = [
    os.environ.get("GEMINI_API_KEY_1", ""),
    os.environ.get("GEMINI_API_KEY_2", ""),
    os.environ.get("GEMINI_API_KEY_3", ""),
]
API_KEYS = [k for k in API_KEYS if k]  # Filter empty

_current_key_idx = 0


def _get_model():
    """Get Gemini model with key rotation."""
    global _current_key_idx
    
    if not GEMINI_AVAILABLE or not API_KEYS:
        return None
    
    key = API_KEYS[_current_key_idx % len(API_KEYS)]
    _current_key_idx += 1
    
    genai.configure(api_key=key)
    return genai.GenerativeModel("gemini-2.0-flash")


SYSTEM_PROMPT = """You are a quantitative trading advisor embedded in a professional trading terminal.
You receive structured market data and must output precise, actionable intelligence.
Rules:
- Be concise. No fluff. No disclaimers about not being financial advice.
- Back every claim with the data provided.
- Use the format: Signal | Confidence | Risk | Action | Reasoning.
- Speak like a Goldman Sachs research note — authoritative, data-driven, direct."""


def explain_signal(fused_data: Dict) -> str:
    """
    Generate 3-sentence plain English reasoning for a trading signal.
    """
    prompt = f"""{SYSTEM_PROMPT}

Analyze this fused market signal and give a 3-sentence explanation:

Ticker: {fused_data.get('ticker')}
Market: {fused_data.get('market')}
Signal: {fused_data.get('signal')}
Trend: {fused_data.get('trend')} (Strength: {fused_data.get('trend_strength')}%)
Confidence: {fused_data.get('confidence')}%
Sentiment: {fused_data.get('sentiment')}
IV Rank: {fused_data.get('iv_rank', 'N/A')}
Macro Context: {fused_data.get('macro_context')}
Technical Signals: {json.dumps(fused_data.get('signals', [])[:3])}

Output exactly 3 sentences: 1) What the data shows, 2) Why this signal makes sense, 3) Suggested action with risk context."""

    return _call_ai(prompt, fallback=fused_data.get("ai_reasoning", "Analysis pending."))


def generate_strategies(portfolio: Dict, market_conditions: Dict) -> str:
    """
    Given portfolio + market conditions → suggest top 3 actionable trades.
    """
    prompt = f"""{SYSTEM_PROMPT}

Given this portfolio and market state, suggest exactly 3 actionable trades:

Portfolio Summary:
- Total Value: ${portfolio.get('total_current_value', 0):,.2f}
- P&L: {portfolio.get('total_pnl_pct', 0):.1f}%
- Top Holdings: {json.dumps(portfolio.get('positions', [])[:5])}

Market Conditions:
- Regime: {market_conditions.get('regime', 'NEUTRAL')}
- VIX: {market_conditions.get('vix', 'N/A')}
- Macro: {market_conditions.get('macro', 'N/A')}

Format each trade as:
TRADE 1: [ACTION] [TICKER] — [Rationale in 1 sentence] — Risk: [LOW/MED/HIGH]"""

    return _call_ai(prompt, fallback="Portfolio analysis requires more data. Add positions to see AI strategies.")


def summarize_news(headlines: List[Dict], ticker: str = "") -> str:
    """
    Feed scored headlines → output 1 market mood paragraph.
    """
    headline_text = "\n".join([
        f"- [{h.get('label', 'NEUTRAL')}] {h.get('text', '')}"
        for h in headlines[:7]
    ])

    prompt = f"""{SYSTEM_PROMPT}

Summarize these headlines for {ticker or 'the market'} into exactly ONE paragraph (3-4 sentences) describing the current market mood:

{headline_text}

Be specific. Reference actual headlines. End with a directional bias (bullish/bearish/neutral)."""

    return _call_ai(prompt, fallback=f"Market news for {ticker} is mixed. Monitor for developments.")


def risk_advice(position_data: Dict) -> str:
    """
    Given position size + VaR + IV → flag risks and suggest adjustments.
    """
    prompt = f"""{SYSTEM_PROMPT}

Analyze this position's risk profile and suggest specific adjustments:

Position: {position_data.get('ticker', 'Unknown')}
Size: ${position_data.get('position_value', 0):,.2f} ({position_data.get('weight_pct', 0):.1f}% of portfolio)
P&L: {position_data.get('pnl_pct', 0):.1f}%
Portfolio VaR (95%): {position_data.get('var_95', 'N/A')}
IV Rank: {position_data.get('iv_rank', 'N/A')}
Beta: {position_data.get('beta', 'N/A')}

Give exactly 2 risk flags and 2 actionable adjustments. Be specific with numbers."""

    return _call_ai(prompt, fallback="Position analysis pending. Ensure risk metrics are calculated.")


def answer_query(question: str, context: Dict) -> str:
    """
    Q&A Mode — user asks anything, AI answers with data context.
    """
    prompt = f"""{SYSTEM_PROMPT}

The user asks: "{question}"

Available Context:
{json.dumps(context, indent=2, default=str)[:2000]}

Answer directly in 2-4 sentences. Use the data provided. If data is insufficient, say what additional data would help."""

    return _call_ai(prompt, fallback="I need more market data to answer this question accurately.")


def rebalancing_advice(portfolio: Dict, risk_metrics: Dict) -> str:
    """
    AI-generated rebalancing suggestions.
    """
    prompt = f"""{SYSTEM_PROMPT}

Analyze this portfolio for rebalancing:

Holdings: {json.dumps(portfolio.get('positions', [])[:8])}
Sector Exposure: {json.dumps(portfolio.get('sector_exposure', {}).get('sectors', []))}
Sharpe: {portfolio.get('sharpe', {}).get('sharpe', 'N/A')}
Concentration Risk: {portfolio.get('sector_exposure', {}).get('concentration_risk', 'N/A')}
Diversification Score: {portfolio.get('sector_exposure', {}).get('diversification_score', 'N/A')}/100

Suggest exactly 3 rebalancing actions. Format: ACTION: [what to do] — [why] — Impact: [expected improvement]"""

    return _call_ai(prompt, fallback="Add at least 3 positions for rebalancing analysis.")


def _call_ai(prompt: str, fallback: str = "AI analysis unavailable.") -> str:
    """Call Gemini API with fallback handling."""
    try:
        model = _get_model()
        if model is None:
            return fallback
        
        response = model.generate_content(prompt)
        if response and response.text:
            return response.text.strip()
        return fallback
        
    except Exception as e:
        logger.error(f"AI call failed: {e}")
        return fallback
