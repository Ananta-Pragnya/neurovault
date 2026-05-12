"""
Institutional Intelligence API
Minimal endpoints - serve cached data
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import uvicorn
import logging
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.compute.batch_fetcher import get_cached_data, fetch_all_data
from backend.compute.regime_detector import detector
from backend.compute.opportunity_finder import finder
from backend.intelligence.ai_digest import digest, CACHE_FILE as INTEL_CACHE
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Institutional Intelligence Terminal",
    version="2.0.0",
    description="Hedge fund-grade market intelligence with minimal API usage"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "ONLINE",
        "name": "Institutional Intelligence Terminal",
        "philosophy": "Signal > Noise. Intelligence > Dashboards.",
        "api_strategy": "Batch processing. Minimal calls. Maximum insight."
    }

@app.get("/api/market/overview")
async def get_market_overview():
    """
    Complete market overview - ONE endpoint
    Returns everything frontend needs
    """
    try:
        # Get cached market data
        market_data = get_cached_data()
        
        # Detect regime (pure math, no API)
        regime, description = detector.detect(market_data)
        regime_metrics = detector.get_regime_metrics(market_data)
        
        # Find opportunities (pure math, no API)
        opportunities = finder.find_opportunities(market_data)
        
        # Get indices
        spy = market_data.get("symbols", {}).get("SPY", {})
        qqq = market_data.get("symbols", {}).get("QQQ", {})
        vix = market_data.get("indices", {}).get("^VIX", {})
        
        return {
            "regime": {
                "status": regime,
                "description": description,
                "metrics": regime_metrics
            },
            "indices": {
                "SPY": spy,
                "QQQ": qqq,
                "VIX": vix
            },
            "opportunities": opportunities,
            "timestamp": market_data.get("timestamp"),
            "market_hours": _is_market_hours()
        }
        
    except Exception as e:
        logger.error(f"Error in overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/intelligence/brief")
async def get_intelligence_brief():
    """
    Get latest AI intelligence brief
    Served from cache - no AI call here
    """
    try:
        with open(INTEL_CACHE, 'r') as f:
            cache = json.load(f)
        
        morning = cache.get("morning", {})
        evening = cache.get("evening", {})
        
        # Return most recent
        if morning.get("timestamp", "") > evening.get("timestamp", ""):
            return {"type": "morning", "data": morning}
        else:
            return {"type": "evening", "data": evening}
            
    except Exception as e:
        logger.error(f"Error loading intelligence: {e}")
        return {
            "type": "pending",
            "data": {
                "summary": ["Intelligence generation in progress..."],
                "outlook": {"short": "Pending", "medium": "Pending", "long": "Pending"},
                "probabilities": {"sideways": 50, "bullish": 25, "bearish": 25}
            }
        }

@app.post("/api/admin/fetch-now")
async def trigger_fetch():
    """
    Manual trigger for data fetch
    Admin only - use sparingly
    """
    try:
        logger.info("🔄 Manual fetch triggered")
        data = fetch_all_data()
        return {"status": "success", "symbols_fetched": len(data.get("symbols", {}))}
    except Exception as e:
        logger.error(f"Manual fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/generate-brief")
async def trigger_brief():
    """
    Manual trigger for AI brief generation
    Admin only - use sparingly (API costs)
    """
    try:
        logger.info("🤖 Manual brief generation triggered")
        market_data = get_cached_data()
        regime, _ = detector.detect(market_data)
        opportunities = finder.find_opportunities(market_data)
        
        brief = digest.create_morning_brief(market_data, regime, opportunities)
        return {"status": "success", "brief": brief}
    except Exception as e:
        logger.error(f"Brief generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/symbols/{symbol}")
async def get_symbol_data(symbol: str):
    """Get specific symbol data"""
    try:
        market_data = get_cached_data()
        symbol_data = market_data.get("symbols", {}).get(symbol.upper())
        
        if not symbol_data:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        return symbol_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _is_market_hours() -> bool:
    """Check if currently in market hours"""
    from datetime import datetime
    import pytz
    
    try:
        et = pytz.timezone('America/New_York')
        now = datetime.now(et)
        
        # Monday-Friday, 9:30 AM - 4:00 PM ET
        if now.weekday() >= 5:  # Weekend
            return False
        
        market_open = now.replace(hour=9, minute=30, second=0)
        market_close = now.replace(hour=16, minute=0, second=0)
        
        return market_open <= now <= market_close
    except:
        return False

if __name__ == "__main__":
    # Create cache directory
    os.makedirs("backend/cache", exist_ok=True)
    
    # Start scheduler
    from backend.scheduler.cron_scheduler import scheduler
    scheduler.start()
    
    # Run initial fetch
    logger.info("🚀 Starting Institutional Intelligence Terminal...")
    try:
        fetch_all_data()
        logger.info("✅ Initial data fetch complete")
    except Exception as e:
        logger.warning(f"⚠️ Initial fetch failed: {e}")
    
    # Start API
    uvicorn.run(app, host="0.0.0.0", port=8000)
