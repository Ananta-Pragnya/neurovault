import os
import google.generativeai as genai
import json
from datetime import datetime

# Initialize Gemini
# Assumes GOOGLE_API_KEY is set in environment or via .env
# In a real app, load from secure config
try:
    genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
except:
    print("Warning: Google API Key not found. AI features will be disabled.")

def generate_morning_digest(market_data: dict):
    """
    Generate morning digest using Gemini.
    Strictly for summarization, not math.
    """
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    SYSTEM:
    You are a concise institutional research assistant for the Autonomous Market Brain.
    Produce a market digest in JSON with:

    market_mood (Risk-On/Risk-Off/Transition/Vol Compression/Melt-Up)
    top_bullets (3-6 items, each <140 chars)
    probabilities {{short_week, medium_month, long_quarter}} (0-1)
    top_shock_candidates [{{ticker, reason, severity}}]
    recommendations [{{action, text, confidence}}] (1-3 only)

    Base ONLY on provided precomputed metrics. Professional language. No speculation.
    
    USER DATA:
    {json.dumps(market_data, indent=2)}
    
    EXPECTED OUTPUT JSON:
    """
    
    try:
        response = model.generate_content(prompt)
        # Clean up code blocks if present
        text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        print(f"AI Digest Error: {e}")
        # Fallback
        return {
            "market_mood": "Neutral",
            "top_bullets": ["Market data available.", "AI digest unavailable."],
            "probabilities": {},
            "top_shock_candidates": [],
            "recommendations": []
        }

def analyze_event_shock(shock_data):
    """
    Analyze high-severity shock event.
    """
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    SYSTEM:
    Institutional incident reporter. Given shock data, generate JSON:
    headline (1 line, <100 chars)
    summary (3 sentences: what, why, who's affected)
    impacts [{{ticker, impact_score, expected_move, mechanism}}]
    recommendations [{{action, text, rationale, confidence, urgency}}] (3 max)

    Professional, calm tone. No hyperbole. Actionable intelligence.

    DATA:
    {json.dumps(shock_data, indent=2)}
    
    EXPECTED OUTPUT JSON:
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        print(f"AI Event Error: {e}")
        return None
