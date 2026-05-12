"""
Sentiment & News Processor
Keyword-based NLP sentiment scoring + event detection.
No extra API for scoring — built-in logic.
"""

from typing import Dict, List
import re
import time


# --- Sentiment Lexicon ---

POSITIVE_WORDS = {
    "surge", "rally", "jump", "soar", "gain", "profit", "growth", "upgrade",
    "beat", "exceed", "record", "bullish", "outperform", "strong", "boost",
    "rise", "climb", "advance", "recovery", "breakout", "momentum", "optimistic",
    "dividend", "buyback", "expansion", "innovation", "milestone", "success",
    "approval", "partnership", "acquisition", "revenue", "earnings_beat"
}

NEGATIVE_WORDS = {
    "crash", "plunge", "drop", "fall", "decline", "loss", "bearish", "downgrade",
    "miss", "fail", "warning", "risk", "concern", "fear", "selloff", "default",
    "recession", "inflation", "layoff", "cut", "weak", "slump", "tumble",
    "lawsuit", "investigation", "fraud", "debt", "bankruptcy", "margin_call",
    "tariff", "sanction", "shutdown", "delay", "shortage", "overvalued"
}

# Event patterns
EVENT_PATTERNS = [
    {"pattern": r"earnings|quarterly results|revenue report", "type": "EARNINGS", "priority": "HIGH"},
    {"pattern": r"FDA|drug approval|clinical trial", "type": "FDA", "priority": "HIGH"},
    {"pattern": r"fed meeting|rate decision|fomc|federal reserve", "type": "FED_MEETING", "priority": "HIGH"},
    {"pattern": r"dividend|buyback|share repurchase", "type": "DIVIDEND", "priority": "MEDIUM"},
    {"pattern": r"merger|acquisition|takeover|buyout", "type": "M_AND_A", "priority": "HIGH"},
    {"pattern": r"IPO|listing|public offering", "type": "IPO", "priority": "MEDIUM"},
    {"pattern": r"CEO|executive|leadership change|resigned", "type": "LEADERSHIP", "priority": "MEDIUM"},
    {"pattern": r"lawsuit|legal|SEC|investigation|settle", "type": "LEGAL", "priority": "HIGH"},
    {"pattern": r"upgrade|downgrade|price target|rating", "type": "ANALYST", "priority": "MEDIUM"},
    {"pattern": r"split|stock split", "type": "STOCK_SPLIT", "priority": "LOW"},
]


def score_headline(text: str) -> Dict:
    """
    Score a single headline for sentiment.
    Returns: {score: -1 to 1, label, positive_words, negative_words}
    """
    words = set(re.findall(r'\w+', text.lower()))
    
    pos_found = words & POSITIVE_WORDS
    neg_found = words & NEGATIVE_WORDS
    
    pos_count = len(pos_found)
    neg_count = len(neg_found)
    total = pos_count + neg_count
    
    if total == 0:
        score = 0.0
        label = "NEUTRAL"
    else:
        score = (pos_count - neg_count) / total
        if score > 0.2:
            label = "POSITIVE"
        elif score < -0.2:
            label = "NEGATIVE"
        else:
            label = "NEUTRAL"
    
    return {
        "text": text,
        "score": round(score, 3),
        "label": label,
        "positive_words": list(pos_found),
        "negative_words": list(neg_found),
        "confidence": round(min(total / 3, 1.0), 2)  # More keyword matches = higher confidence
    }


def score_headlines(headlines: List[str]) -> List[Dict]:
    """Score multiple headlines."""
    return [score_headline(h) for h in headlines]


def aggregate_sentiment(scored_headlines: List[Dict]) -> Dict:
    """
    Aggregate individual headline scores into overall sentiment.
    """
    if not scored_headlines:
        return {"score": 0, "label": "NEUTRAL", "confidence": 0, "count": 0}
    
    scores = [h["score"] for h in scored_headlines]
    avg_score = sum(scores) / len(scores)
    
    # Weighted by confidence
    weighted_scores = [h["score"] * h["confidence"] for h in scored_headlines]
    total_weight = sum(h["confidence"] for h in scored_headlines)
    weighted_avg = sum(weighted_scores) / total_weight if total_weight > 0 else 0
    
    if weighted_avg > 0.15:
        label = "POSITIVE"
    elif weighted_avg < -0.15:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"
    
    positive_count = sum(1 for h in scored_headlines if h["label"] == "POSITIVE")
    negative_count = sum(1 for h in scored_headlines if h["label"] == "NEGATIVE")
    neutral_count = sum(1 for h in scored_headlines if h["label"] == "NEUTRAL")
    
    return {
        "score": round(weighted_avg, 3),
        "label": label,
        "confidence": round(min(len(scored_headlines) / 5, 1.0), 2),
        "count": len(scored_headlines),
        "breakdown": {
            "positive": positive_count,
            "negative": negative_count,
            "neutral": neutral_count
        },
        "avg_raw_score": round(avg_score, 3)
    }


def detect_events(headlines: List[str]) -> List[Dict]:
    """
    Detect market-moving events from headlines.
    Returns list of detected events with type and priority.
    """
    events = []
    seen_types = set()
    
    for headline in headlines:
        text_lower = headline.lower()
        for pattern_info in EVENT_PATTERNS:
            if re.search(pattern_info["pattern"], text_lower):
                event_type = pattern_info["type"]
                if event_type not in seen_types:
                    events.append({
                        "type": event_type,
                        "priority": pattern_info["priority"],
                        "headline": headline,
                        "detected_at": int(time.time())
                    })
                    seen_types.add(event_type)
    
    # Sort by priority
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    events.sort(key=lambda e: priority_order.get(e["priority"], 2))
    
    return events


def process_news_feed(headlines: List[str], ticker: str = "") -> Dict:
    """
    Full news processing pipeline.
    Input: raw headlines
    Output: scored headlines, aggregate sentiment, detected events
    """
    scored = score_headlines(headlines)
    aggregate = aggregate_sentiment(scored)
    events = detect_events(headlines)
    
    return {
        "ticker": ticker,
        "headlines": scored,
        "sentiment": aggregate,
        "events": events,
        "has_high_priority_events": any(e["priority"] == "HIGH" for e in events),
        "timestamp": int(time.time())
    }
