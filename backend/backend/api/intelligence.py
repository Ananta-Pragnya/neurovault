from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.backend.services.intel_service import intel_service
from backend.backend.services.quant_service import quant_service
from backend.backend.shared_state import bus, BusEvent
from backend.backend.cache.cache import unified_cache

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence"])

class IntelRequest(BaseModel):
    query: str

class QuantRequest(BaseModel):
    symbol: str
    data: List[Dict[str, Any]]
    weights: Optional[Dict[str, float]] = None

@router.post("/news")
async def get_news_intel(request: IntelRequest):
    """
    Fetch deep news intelligence. Employs a unified 5-minute cache to prevent 
    Finnhub over-querying. Broadcasts strictly typed sentiment.
    """
    try:
        cache_key = f"news_intel:{request.query}"
        
        async def fetch_fresh_news():
            result = await intel_service.fetch_news_intelligence(request.query)
            
            # Translate raw sentiment word to numeric payload for robust processing
            score = 0.5
            if result["sentiment"].lower() in ["bearish", "negative"]:
                score = -0.5
                bus.publish(BusEvent.SENTIMENT_BEARISH, {
                    "symbol": request.query,
                    "score": score,
                    "magnitude": abs(score)
                })
            elif result["sentiment"].lower() in ["bullish", "positive"]:
                score = 0.5
                bus.publish(BusEvent.SENTIMENT_BULLISH, {
                    "symbol": request.query,
                    "score": score,
                    "magnitude": score
                })
                
            return result

        # Wait on coroutine cache call
        return await unified_cache.get_or_fetch_async(cache_key, fetch_fresh_news)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forecast")
async def get_price_forecast(request: QuantRequest):
    """
    Generate ensemble forecasts. Broadcasts via the rigorous typed Ring Buffer.
    """
    try:
        result = await quant_service.get_predictions(request.symbol, request.data, request.weights)
        
        bus.publish(BusEvent.FORECAST_UPDATED, {
            "symbol": request.symbol,
            "next_day": result["nextDayPrice"],
            "trend": result["trend"],
            "confidence": result["confidence"],
            "timestamp": int(datetime.now().timestamp() * 1000)
        })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
