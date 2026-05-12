"""
API v2 Routes — All 6 Modules
FastAPI router exposing search, signals, options, news, portfolio, simulation, macro, and AI Q&A.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
import sys
import os

# Fix imports for backend package structure
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.engines.black_scholes import price_option, compute_greeks, implied_volatility, iv_rank, generate_options_chain
from backend.engines.risk_engine import value_at_risk, max_drawdown, kelly_criterion, position_size, portfolio_beta, risk_summary
from backend.engines.strategy_engine import suggest_strategy, covered_call_payoff, straddle_payoff, spread_payoff, iron_condor_payoff
from backend.engines.monte_carlo import simulate_paths, scenario_test
from backend.engines.portfolio_analyzer import sharpe_ratio, sortino_ratio, correlation_matrix, sector_exposure, portfolio_summary
from backend.engines.trend_detector import detect_trend, compute_all_indicators

from backend.fusion.data_fusion import fuse_signal, fuse_portfolio, fuse_options, fuse_news_sentiment
from backend.fusion.market_adapter import search_tickers, fetch_quote, fetch_ohlcv, fetch_batch_quotes, detect_market
from backend.fusion.sentiment_processor import process_news_feed, score_headlines, aggregate_sentiment

from backend.intelligence.gemini_layer import explain_signal, generate_strategies, summarize_news, risk_advice, answer_query, rebalancing_advice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v2", tags=["Trading Intelligence"])


# --- Request Models ---

class PortfolioRequest(BaseModel):
    holdings: List[Dict]

class SimulationRequest(BaseModel):
    ticker: str = "AAPL"
    initial_price: float = 100.0
    expected_return: float = 0.08
    volatility: float = 0.25
    time_horizon: float = 1.0
    n_paths: int = 1000
    scenario: Optional[str] = None

class AIQueryRequest(BaseModel):
    question: str
    ticker: Optional[str] = None

class PayoffRequest(BaseModel):
    strategy: str = "covered_call"
    stock_price: float = 100.0
    strike: float = 105.0
    premium: float = 3.0
    strike2: Optional[float] = None
    premium2: Optional[float] = None


# --- Search ---

@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    """Multi-market ticker search across US, India, Crypto."""
    results = search_tickers(q)
    return {"query": q, "results": results, "count": len(results)}


# --- Signals ---

@router.get("/signal/{ticker}")
async def get_signal(ticker: str, timeframe: str = "6mo"):
    """
    Fused AI signal for any ticker.
    Returns unified intelligence object — never raw API data.
    """
    try:
        # 1. Fetch market data
        quote = fetch_quote(ticker)
        ohlcv = fetch_ohlcv(ticker, period=timeframe)

        if not ohlcv.get("prices"):
            raise HTTPException(status_code=404, detail=f"No data found for {ticker}")

        # 2. Compute technicals
        trend = detect_trend(ohlcv["prices"], ohlcv.get("volumes"))

        # 3. Fuse into intelligence object
        price_data = {
            "current_price": quote.get("current_price", 0),
            "change_pct": quote.get("change_pct", 0),
            "volume": quote.get("volume", 0)
        }

        fused = fuse_signal(
            ticker=ticker,
            market=quote.get("market", detect_market(ticker)),
            price_data=price_data,
            trend_analysis=trend,
        )

        # 4. AI explanation (async-friendly)
        try:
            ai_text = explain_signal(fused)
            fused["ai_reasoning"] = ai_text
        except Exception:
            pass  # Fallback already set in fuse_signal

        return fused

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signal error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Options ---

@router.get("/options/{ticker}")
async def get_options(
    ticker: str,
    expiry_days: int = Query(30, ge=1, le=365),
    risk_free_rate: float = Query(0.05, ge=0, le=0.20)
):
    """
    Options chain with Black-Scholes pricing, Greeks, IV rank, and strategy.
    """
    try:
        quote = fetch_quote(ticker)
        S = quote.get("current_price", 100)

        if S <= 0:
            raise HTTPException(status_code=400, detail="Cannot price options: invalid stock price")

        T = expiry_days / 365
        sigma = 0.30  # Default vol estimate; in prod, derive from historical

        # Get historical data for vol calculation
        ohlcv = fetch_ohlcv(ticker, period="1y")
        if ohlcv.get("prices") and len(ohlcv["prices"]) > 20:
            import math
            prices = ohlcv["prices"]
            returns = [(prices[i] / prices[i-1]) - 1 for i in range(1, len(prices))]
            daily_vol = (sum((r - sum(returns)/len(returns))**2 for r in returns) / (len(returns)-1)) ** 0.5
            sigma = daily_vol * math.sqrt(252)

        # Generate chain
        step = max(1.0, round(S * 0.02))  # ~2% strike separation
        chain = generate_options_chain(S, risk_free_rate, sigma, T, strike_range=10, strike_step=step)

        # IV Rank (52-week)
        current_iv = sigma
        iv_low = sigma * 0.6   # Simplified estimate
        iv_high = sigma * 1.8
        ivr = iv_rank(current_iv, iv_low, iv_high)

        # Strategy suggestion
        trend_data = detect_trend(ohlcv.get("prices", [])) if ohlcv.get("prices") and len(ohlcv["prices"]) > 50 else {"trend": "NEUTRAL"}
        strategy = suggest_strategy(ivr, trend_data.get("trend", "NEUTRAL"), expiry_days, S)

        # Fuse
        return fuse_options(ticker, chain, ivr, strategy, S)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Options error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- News & Sentiment ---

@router.get("/news/{ticker}")
async def get_news(ticker: str):
    """
    Sentiment-scored news feed for a ticker.
    Uses mock headlines (replace with NewsAPI/Finnhub in production).
    """
    try:
        # Mock headlines — replace with actual API call in production
        mock_headlines = _get_mock_headlines(ticker)
        
        processed = process_news_feed(mock_headlines, ticker)
        
        # AI market mood summary
        try:
            mood = summarize_news(processed["headlines"], ticker)
        except Exception:
            mood = None

        return fuse_news_sentiment(
            ticker=ticker,
            headlines=processed["headlines"],
            sentiment_aggregate=processed["sentiment"],
            events=processed["events"],
            ai_summary=mood
        )

    except Exception as e:
        logger.error(f"News error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Portfolio ---

@router.post("/portfolio/analyze")
async def analyze_portfolio(request: PortfolioRequest):
    """
    Full portfolio analysis: P&L, risk, Sharpe, correlation, AI rebalancing.
    """
    try:
        holdings = request.holdings
        if not holdings:
            raise HTTPException(status_code=400, detail="No holdings provided")

        # Portfolio summary
        summary = portfolio_summary(holdings)

        # Generate mock returns for risk metrics
        import random
        mock_returns = [random.gauss(0.0003, 0.015) for _ in range(252)]
        risk = risk_summary(mock_returns, capital=summary.get("total_current_value", 100000))

        # Correlation matrix (if multiple holdings)
        corr = None
        if len(holdings) > 1:
            # Mock returns for correlation — in production, use actual returns
            returns_dict = {}
            for h in holdings:
                returns_dict[h["ticker"]] = [random.gauss(0.0003, 0.015) for _ in range(100)]
            corr = correlation_matrix(returns_dict)

        # AI rebalancing
        try:
            ai_advice = rebalancing_advice(summary, risk)
        except Exception:
            ai_advice = None

        return fuse_portfolio(holdings, summary, risk, corr, ai_advice)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Simulation ---

@router.post("/simulate")
async def run_simulation(request: SimulationRequest):
    """
    Monte Carlo simulation with optional scenario testing.
    """
    try:
        if request.scenario:
            result = scenario_test(
                request.initial_price,
                request.expected_return,
                request.volatility,
                request.time_horizon,
                request.scenario,
                request.n_paths
            )
        else:
            result = simulate_paths(
                request.initial_price,
                request.expected_return,
                request.volatility,
                request.time_horizon,
                request.n_paths
            )

        return result

    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Options Payoff ---

@router.post("/payoff")
async def get_payoff(request: PayoffRequest):
    """Generate payoff diagram data for options strategies."""
    try:
        if request.strategy == "covered_call":
            data = covered_call_payoff(request.stock_price, request.strike, request.premium)
        elif request.strategy == "straddle":
            call_p = request.premium
            put_p = request.premium2 or request.premium
            data = straddle_payoff(request.strike, call_p, put_p)
        elif request.strategy == "bull_call_spread":
            data = spread_payoff(
                request.strike, request.strike2 or request.strike + 10,
                request.premium, request.premium2 or request.premium * 0.4,
                "bull_call"
            )
        elif request.strategy == "iron_condor":
            data = iron_condor_payoff(
                request.strike - 10, request.strike - 5,
                request.strike + 5, request.strike + 10,
                request.premium
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown strategy: {request.strategy}")

        return {"strategy": request.strategy, "payoff": data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Macro ---

@router.get("/macro")
async def get_macro_data():
    """
    Macro overlay data — Fed rate, CPI, GDP, yield curve.
    Currently returns curated data; replace with FRED API in production.
    """
    return {
        "fed_rate": 5.25,
        "fed_rate_direction": "HOLD",
        "cpi": 3.1,
        "cpi_trend": "DECLINING",
        "gdp_growth": 2.8,
        "unemployment": 3.7,
        "yield_curve": "NORMAL",
        "ten_year_yield": 4.25,
        "two_year_yield": 4.60,
        "spread_10y_2y": -0.35,
        "vix": 14.5,
        "dollar_index": 103.2,
        "outlook": "Mixed macro: inflation declining but rates elevated. Monitor for rate cut timing.",
        "last_fed_meeting": "2026-03-19",
        "next_fed_meeting": "2026-05-07"
    }


# --- AI Q&A ---

@router.post("/ai/query")
async def ai_query(request: AIQueryRequest):
    """
    Ask the AI anything about markets. Context injected automatically.
    """
    try:
        context = {}
        
        # Inject ticker-specific context if provided
        if request.ticker:
            quote = fetch_quote(request.ticker)
            context["ticker_data"] = quote
            
            ohlcv = fetch_ohlcv(request.ticker, period="3mo")
            if ohlcv.get("prices"):
                trend = detect_trend(ohlcv["prices"])
                context["trend"] = trend

        answer = answer_query(request.question, context)
        
        return {
            "question": request.question,
            "answer": answer,
            "context_ticker": request.ticker,
            "has_context": bool(context)
        }

    except Exception as e:
        logger.error(f"AI query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Batch Quotes ---

@router.get("/quotes")
async def get_batch_quotes(
    tickers: str = Query("AAPL,MSFT,GOOGL,TSLA,NVDA,SPY")
):
    """Fetch quotes for multiple tickers (comma-separated)."""
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    quotes = fetch_batch_quotes(ticker_list)
    return {"quotes": quotes, "count": len(quotes)}


# --- Technical Analysis ---

@router.get("/technicals/{ticker}")
async def get_technicals(ticker: str, period: str = "6mo"):
    """Full technical analysis for a ticker."""
    ohlcv = fetch_ohlcv(ticker, period=period)
    if not ohlcv.get("prices"):
        raise HTTPException(status_code=404, detail=f"No data for {ticker}")
    
    indicators = compute_all_indicators(ohlcv["prices"], ohlcv.get("volumes"))
    
    return {
        "ticker": ticker,
        "period": period,
        "data_points": len(ohlcv["prices"]),
        "indicators": indicators
    }


# --- Helpers ---

def _get_mock_headlines(ticker: str) -> List[str]:
    """Mock headlines for development. Replace with actual news API."""
    base_headlines = {
        "AAPL": [
            "Apple reports record quarterly revenue, beating analyst expectations",
            "iPhone 17 Pro demand surges in Asia markets",
            "Apple announces $90B share buyback program",
            "Concerns rise over Apple's AI strategy lagging behind competitors",
            "Apple Vision Pro sales disappoint in Q1"
        ],
        "TSLA": [
            "Tesla delivers 500K vehicles in Q1, exceeding estimates",
            "Elon Musk announces new affordable Tesla model",
            "Tesla faces investigation over Autopilot safety concerns",
            "Tesla energy division revenue surges 65%",
            "Analysts downgrade Tesla citing valuation concerns"
        ],
        "MSFT": [
            "Microsoft Azure revenue grows 30% year-over-year",
            "Microsoft Copilot adoption accelerates across enterprise",
            "Microsoft acquires AI startup for $2B",
            "Regulatory concerns delay Microsoft gaming expansion",
            "Microsoft beats earnings estimates on cloud strength"
        ]
    }
    
    if ticker in base_headlines:
        return base_headlines[ticker]
    
    # Generic headlines for any ticker
    name = ticker.replace(".NS", "").replace("-USD", "")
    return [
        f"{name} stock shows strong momentum amid sector rotation",
        f"Analysts upgrade {name} citing improving fundamentals",
        f"{name} faces headwinds from rising interest rate environment",
        f"{name} reports solid quarterly results, revenue in line",
        f"Institutional investors increase {name} holdings",
    ]
