"""
AI Intelligence Digest Generator
MINIMAL API USAGE - Single call per brief
"""

import google.generativeai as genai
import json
import logging
from datetime import datetime
from typing import Dict

logger = logging.getLogger(__name__)

# Configure with rotation for free tier
API_KEYS = [
    "GEMINI_KEY_1_REMOVED",
    "GEMINI_KEY_2_REMOVED",
    "GEMINI_KEY_3_REMOVED"
]

current_key_index = 0

def get_next_api_key():
    """Rotate through API keys to stay within free tier limits"""
    global current_key_index
    key = API_KEYS[current_key_index]
    current_key_index = (current_key_index + 1) % len(API_KEYS)
    return key

CACHE_FILE = "backend/cache/intelligence.json"

class AIDigest:
    """ONE AI call per brief - batch everything"""
    
    @staticmethod
    def create_morning_brief(market_data: Dict, regime: str, opportunities: list) -> Dict:
        """
        Generate morning brief
        ONE AI CALL with all context
        """
        try:
            # Configure AI with rotation
            genai.configure(api_key=get_next_api_key())
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
            
            # Build comprehensive context
            spy = market_data.get("symbols", {}).get("SPY", {})
            vix = market_data.get("indices", {}).get("^VIX", {}).get("price", 20)
            
            # Get top movers
            symbols = market_data.get("symbols", {})
            movers = sorted(
                [(s, d.get("change", 0)) for s, d in symbols.items()],
                key=lambda x: abs(x[1]),
                reverse=True
            )[:5]
            
            context = f"""
Market Data (as of {datetime.now().strftime('%Y-%m-%d %I:%M %p')}):

Regime: {regime}
SPY: ${spy.get('price', 0):.2f} ({spy.get('change', 0):+.2f}%)
VIX: {vix:.2f}

Top Movers:
{chr(10).join([f"{s}: {c:+.2f}%" for s, c in movers])}

Detected Opportunities:
{chr(10).join([f"- {o.get('description', '')}" for o in opportunities[:3]])}
"""
            
            prompt = f"""You are a senior hedge fund analyst writing a morning brief for institutional clients.

Generate a concise morning market brief with:
1. Exactly 5 bullet points (max 15 words each)
2. Short/medium/long outlook (one sentence each)
3. Probability distribution for today (sideways, bullish, bearish - must sum to 100%)

Context:
{context}

Return as JSON:
{{
  "summary": ["bullet1", "bullet2", "bullet3", "bullet4", "bullet5"],
  "outlook": {{
    "short": "...",
    "medium": "...",
    "long": "..."
  }},
  "probabilities": {{
    "sideways": 45,
    "bullish": 35,
    "bearish": 20
  }}
}}

Keep it institutional. No hype."""
            
            logger.info("🤖 Calling AI for morning brief...")
            response = model.generate_content(prompt)
            
            # Parse JSON from response
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            
            result = json.loads(text.strip())
            result["timestamp"] = datetime.now().isoformat()
            result["type"] = "morning_brief"
            
            # Cache it
            AIDigest._save_to_cache("morning", result)
            
            logger.info("✅ Morning brief generated")
            return result
            
        except Exception as e:
            logger.error(f"❌ Morning brief failed: {e}")
            return AIDigest._get_fallback_brief("morning")
    
    @staticmethod
    def create_evening_recap(market_data: Dict) -> Dict:
        """
        Generate evening recap
        ONE AI CALL
        """
        try:
            genai.configure(api_key=get_next_api_key())
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
            
            # Build context
            spy = market_data.get("symbols", {}).get("SPY", {})
            qqq = market_data.get("symbols", {}).get("QQQ", {})
            iwm = market_data.get("symbols", {}).get("IWM", {})
            
            # Winners and losers
            symbols = market_data.get("symbols", {})
            sorted_symbols = sorted(
                [(s, d.get("change", 0)) for s, d in symbols.items()],
                key=lambda x: x[1],
                reverse=True
            )
            winners = sorted_symbols[:3]
            losers = sorted_symbols[-3:]
            
            context = f"""
Market Performance:
SPY: {spy.get('change', 0):+.2f}%
QQQ: {qqq.get('change', 0):+.2f}%
IWM: {iwm.get('change', 0):+.2f}%

Top Performers:
{chr(10).join([f"{s}: {c:+.2f}%" for s, c in winners])}

Worst Performers:
{chr(10).join([f"{s}: {c:+.2f}%" for s, c in losers])}
"""
            
            prompt = f"""You are a hedge fund analyst writing an evening market recap.

Provide:
1. One-sentence performance summary
2. 3-4 key insights (max 12 words each)
3. One-sentence outlook for tomorrow

Context:
{context}

Return as JSON:
{{
  "performance": "...",
  "insights": ["insight1", "insight2", "insight3"],
  "tomorrow": "..."
}}

Keep it concise and institutional."""
            
            logger.info("🤖 Calling AI for evening recap...")
            response = model.generate_content(prompt)
            
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            
            result = json.loads(text.strip())
            result["timestamp"] = datetime.now().isoformat()
            result["type"] = "evening_recap"
            
            AIDigest._save_to_cache("evening", result)
            
            logger.info("✅ Evening recap generated")
            return result
            
        except Exception as e:
            logger.error(f"❌ Evening recap failed: {e}")
            return AIDigest._get_fallback_brief("evening")
    
    @staticmethod
    def _save_to_cache(brief_type: str, data: Dict):
        """Save to cache"""
        try:
            cache = {}
            try:
                with open(CACHE_FILE, 'r') as f:
                    cache = json.load(f)
            except:
                pass
            
            cache[brief_type] = data
            
            with open(CACHE_FILE, 'w') as f:
                json.dump(cache, f)
        except Exception as e:
            logger.error(f"Cache save failed: {e}")
    
    @staticmethod
    def _get_fallback_brief(brief_type: str) -> Dict:
        """Fallback to cached brief if AI fails"""
        try:
            with open(CACHE_FILE, 'r') as f:
                cache = json.load(f)
                return cache.get(brief_type, {})
        except:
            return {
                "summary": ["Market data pending", "Intelligence generation in progress"],
                "outlook": {"short": "Pending", "medium": "Pending", "long": "Pending"},
                "probabilities": {"sideways": 50, "bullish": 25, "bearish": 25}
            }

# Global instance
digest = AIDigest()
