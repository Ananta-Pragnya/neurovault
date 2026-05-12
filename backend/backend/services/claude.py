import os
import json
import logging
from typing import Dict, List, Optional, Any
import httpx

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "your_key_here")
# Optional fallback to Gemini if provided keys exist
GEMINI_KEY = os.environ.get("GEMINI_API_KEY_1", "")

CLAUDE_MODEL = "claude-3-5-sonnet-20240620" # Updated to current best available known model

async def get_trading_signal(data: Dict) -> Optional[Dict]:
    """
    Institutional Signal Engine v1.0
    Confluence Scoring (Price, Options, Sentiment, Macro)
    """
    system_prompt = """You are a FINMOTION Terminal AI Signal Engine. 
Generate actionable institutional-grade intelligence.

STEP 1: REASONING CHAIN
- Analyze Price Action (EMA, RSI, MACD)
- Evaluate Options Flow (Put/Call, IV rank)
- Check Sentiment (News, Social)
- Align with Macro (FRED rates, VIX)

STEP 2: CONFLUENCE SCORING (0-100)
- calculation: (price*0.35)+(options*0.30)+(sentiment*0.20)+(macro*0.15)

STEP 3: CLASSIFICATION
- >=75: STRONG BUY/SHORT
- 60-74: BUY/SHORT
- 50-59: WATCH
- <50: AVOID

STEP 4: OUTPUT JSON ONLY
{
  "symbol": "TICKER",
  "signal": "BUY" | "STRONG_BUY" | "SHORT" | "STRONG_SHORT" | "WATCH" | "AVOID",
  "confluence": 72,
  "entry": 189.50,
  "stop": 185.20,
  "target1": 193.80,
  "target2": 200.30,
  "conviction": "LOW" | "MEDIUM" | "HIGH",
  "rationale": "Bullish EMA cross + institutional options flow. RSI oversold.",
  "sources": ["polygon", "tradier", "finnhub"],
  "valid_until": "ISO8601"
}"""

    user_prompt = f"Analyze Data: {json.dumps(data)}"
    
    return await _call_claude(system_prompt, user_prompt)

async def get_news_summary(ticker: str, headlines: List[str]) -> Optional[Dict]:
    """
    POST /api/news/summary
    Body: { ticker, headlines: [array of 5 headline strings] }
    """
    system_prompt = """You are a market intelligence analyst. Given these headlines, 
write exactly 2 sentences: one describing the market mood, one describing 
the key risk or opportunity. Be specific. No fluff."""

    user_prompt = f"Ticker: {ticker}\nHeadlines:\n" + "\n".join(headlines)
    
    res_text = await _call_claude(system_prompt, user_prompt, raw=True)
    if res_text:
        # Simple parsing for summary and mood
        mood = "NEUTRAL"
        if "POSITIVE" in res_text.upper() or "BULLISH" in res_text.upper(): mood = "POSITIVE"
        elif "NEGATIVE" in res_text.upper() or "BEARISH" in res_text.upper(): mood = "NEGATIVE"
        
        return {"summary": res_text, "mood": mood}
    return None

async def get_price_action_commentary(ticker: str, price: float, change_pct: float) -> Optional[str]:
    """
    Generate a 1-sentence institutional-grade commentary on price action.
    """
    system_prompt = """You are a senior institutional equity analyst. 
    Write exactly one punchy sentence explaining the price action. 
    Focus on volume, technical levels, or institutional flow. No fluff."""
    
    user_prompt = f"Ticker: {ticker}, Price: ${price}, Change: {change_pct}%."
    
    return await _call_claude(system_prompt, user_prompt, raw=True)

async def _call_claude(system: str, prompt: str, raw: bool = False) -> Optional[Any]:
    """Base call to Anthropic API (or fallback)"""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    data = {
        "model": CLAUDE_MODEL,
        "max_tokens": 1024,
        "system": system,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            res_json = response.json()
            content = res_json["content"][0]["text"]
            
            if raw:
                return content
            
            # Try to parse JSON from response
            try:
                # Find JSON block if Claude adds prose
                start = content.find('{')
                end = content.rfind('}') + 1
                if start != -1 and end != 0:
                    return json.loads(content[start:end])
                return json.loads(content)
            except:
                logger.error(f"Claude failed to return valid JSON: {content}")
        except Exception as e:
            logger.error(f"Claude API error: {e}")
    return None
