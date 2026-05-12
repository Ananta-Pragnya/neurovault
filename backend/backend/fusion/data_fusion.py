"""
Data Fusion Layer
Every output passes through here — raw API data NEVER reaches the user.
Produces unified intelligence objects from multiple data sources.
"""

from typing import Dict, List, Optional
import time


def fuse_signal(
    ticker: str,
    market: str,
    price_data: Dict,
    trend_analysis: Dict,
    sentiment: Optional[Dict] = None,
    options_data: Optional[Dict] = None,
    macro_context: Optional[Dict] = None,
    ai_reasoning: Optional[str] = None
) -> Dict:
    """
    Central fusion function — combines all data sources into a single
    intelligence object ready for frontend consumption.
    
    RULE: No raw API data ever reaches the user. Everything is fused here.
    """
    # Extract trend
    trend = trend_analysis.get("trend", "NEUTRAL")
    strength = trend_analysis.get("strength", 50)
    
    # Compute confidence from multiple sources
    confidence_factors = [strength]
    
    # Sentiment boost/penalty
    sentiment_label = "NEUTRAL"
    if sentiment:
        sent_score = sentiment.get("score", 0)
        sentiment_label = sentiment.get("label", "NEUTRAL")
        # Alignment bonus: bullish trend + positive sentiment = higher confidence
        if (trend == "BULLISH" and sent_score > 0.3) or (trend == "BEARISH" and sent_score < -0.3):
            confidence_factors.append(75)
        elif (trend == "BULLISH" and sent_score < -0.3) or (trend == "BEARISH" and sent_score > 0.3):
            confidence_factors.append(35)  # conflicting signals reduce confidence
        else:
            confidence_factors.append(50)
    
    # IV context
    iv_rank = None
    if options_data:
        iv_rank = options_data.get("iv_rank", 50)
    
    # Final confidence (weighted average)
    confidence = int(sum(confidence_factors) / len(confidence_factors))
    
    # Signal determination
    signal = _determine_signal(trend, confidence, sentiment_label)
    
    # Risk level
    risk_level = _assess_risk(trend, confidence, iv_rank)
    
    # Macro context string
    macro_str = _format_macro(macro_context) if macro_context else "No macro data available"

    return {
        "ticker": ticker,
        "market": market,
        "signal": signal,
        "confidence": confidence,
        "risk_level": risk_level,
        "sentiment": sentiment_label,
        "trend": trend,
        "trend_strength": strength,
        "iv_rank": iv_rank,
        "macro_context": macro_str,
        "ai_reasoning": ai_reasoning or _generate_default_reasoning(ticker, trend, confidence, signal),
        "price": price_data.get("current_price", 0),
        "change_pct": price_data.get("change_pct", 0),
        "volume": price_data.get("volume", 0),
        "timestamp": int(time.time()),
        "signals": trend_analysis.get("signals", []),
        "quality": _confidence_quality(confidence)
    }


def fuse_portfolio(
    holdings: List[Dict],
    portfolio_analytics: Dict,
    risk_metrics: Optional[Dict] = None,
    correlation: Optional[Dict] = None,
    ai_advice: Optional[str] = None
) -> Dict:
    """Fuse portfolio data into a single intelligence object."""
    return {
        "overview": {
            "total_value": portfolio_analytics.get("total_current_value", 0),
            "total_pnl": portfolio_analytics.get("total_pnl", 0),
            "total_pnl_pct": portfolio_analytics.get("total_pnl_pct", 0),
            "positions_count": portfolio_analytics.get("num_positions", 0),
            "winners": portfolio_analytics.get("winners", 0),
            "losers": portfolio_analytics.get("losers", 0)
        },
        "positions": portfolio_analytics.get("positions", []),
        "risk": risk_metrics or {},
        "correlation": correlation or {},
        "sector_exposure": portfolio_analytics.get("sector_exposure", {}),
        "sharpe": portfolio_analytics.get("sharpe", {}),
        "ai_advice": ai_advice or "Add more positions for portfolio analysis.",
        "timestamp": int(time.time())
    }


def fuse_options(
    ticker: str,
    chain: List[Dict],
    iv_rank: float,
    strategy: Dict,
    current_price: float
) -> Dict:
    """Fuse options data into intelligence object."""
    return {
        "ticker": ticker,
        "current_price": current_price,
        "chain": chain,
        "iv_rank": iv_rank,
        "iv_environment": "HIGH" if iv_rank > 60 else "LOW" if iv_rank < 30 else "MODERATE",
        "strategy_recommendation": strategy,
        "summary": _options_summary(iv_rank, strategy),
        "timestamp": int(time.time())
    }


def fuse_news_sentiment(
    ticker: str,
    headlines: List[Dict],
    sentiment_aggregate: Dict,
    events: List[Dict],
    ai_summary: Optional[str] = None
) -> Dict:
    """Fuse news + sentiment into intelligence object."""
    return {
        "ticker": ticker,
        "sentiment": sentiment_aggregate,
        "headlines": headlines[:10],  # Cap at 10
        "events": events,
        "market_mood": ai_summary or _default_mood(sentiment_aggregate),
        "timestamp": int(time.time())
    }


# --- Internal helpers ---

def _determine_signal(trend: str, confidence: int, sentiment: str) -> str:
    """Map trend + confidence + sentiment to actionable signal."""
    if trend == "BULLISH":
        if confidence >= 70:
            return "STRONG_BUY"
        elif confidence >= 55:
            return "BUY" if sentiment != "NEGATIVE" else "BUY_ON_DIP"
        else:
            return "WEAK_BUY"
    elif trend == "BEARISH":
        if confidence >= 70:
            return "STRONG_SELL"
        elif confidence >= 55:
            return "SELL" if sentiment != "POSITIVE" else "REDUCE"
        else:
            return "WEAK_SELL"
    else:
        return "HOLD"


def _assess_risk(trend: str, confidence: int, iv_rank: Optional[float]) -> str:
    """Assess risk level from multiple factors."""
    risk_score = 50
    if confidence < 40:
        risk_score += 20  # Low confidence = high risk
    if iv_rank and iv_rank > 70:
        risk_score += 15
    if trend == "NEUTRAL":
        risk_score += 10
    
    if risk_score >= 70:
        return "HIGH"
    elif risk_score >= 45:
        return "MEDIUM"
    return "LOW"


def _confidence_quality(confidence: int) -> str:
    """Human-readable confidence assessment."""
    if confidence >= 80:
        return "Very High — strong alignment across indicators"
    elif confidence >= 65:
        return "High — most indicators agree"
    elif confidence >= 50:
        return "Moderate — mixed signals present"
    elif confidence >= 35:
        return "Low — conflicting indicators"
    return "Very Low — no clear direction"


def _format_macro(macro: Dict) -> str:
    """Format macro data into human-readable context."""
    parts = []
    if "fed_rate" in macro:
        parts.append(f"Fed Rate: {macro['fed_rate']}%")
    if "cpi" in macro:
        parts.append(f"CPI: {macro['cpi']}%")
    if "gdp_growth" in macro:
        parts.append(f"GDP: {macro['gdp_growth']}%")
    if "yield_curve" in macro:
        parts.append(f"Yield Curve: {macro['yield_curve']}")
    return " | ".join(parts) if parts else "Macro data pending"


def _generate_default_reasoning(ticker: str, trend: str, confidence: int, signal: str) -> str:
    """Generate default reasoning when AI is unavailable."""
    return (
        f"{ticker} shows {trend.lower()} momentum with {confidence}% confidence. "
        f"Technical indicators support a {signal.replace('_', ' ').lower()} position. "
        f"Monitor for confirmation before entry."
    )


def _options_summary(iv_rank: float, strategy: Dict) -> str:
    primary = strategy.get("primary", {})
    name = primary.get("name", "No strategy")
    return f"IV Rank: {iv_rank:.0f}/100 ({strategy.get('context', {}).get('iv_environment', 'MODERATE')}). Top strategy: {name}."


def _default_mood(sentiment: Dict) -> str:
    label = sentiment.get("label", "NEUTRAL")
    score = sentiment.get("score", 0)
    if label == "POSITIVE":
        return f"Market sentiment is positive (score: {score:.2f}). News flow supportive of upside."
    elif label == "NEGATIVE":
        return f"Market sentiment is negative (score: {score:.2f}). Caution advised."
    return f"Market sentiment is neutral (score: {score:.2f}). No strong directional bias from news."
