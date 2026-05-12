"""
FinMotion AI — FastAPI Backend v3.0
One server, one bus, one cache.

Routes:
  GET  /health
  GET  /api/snapshots              — batched Alpaca snapshots
  GET  /api/bars/{symbol}          — OHLCV closing prices
  GET  /api/quotes                 — batch quotes (legacy compat)
  GET  /api/quote/{ticker}         — single quote (legacy compat)
  POST /api/portfolio/analyze      — real Sharpe/Beta/VaR
  POST /api/watchlist/add          — dynamic ticker registry
  GET  /api/forecast/{symbol}      — TA ensemble + Llama reasoning
  POST /api/simulate/{symbol}      — start Monte Carlo (background)
  GET  /api/simulate/{symbol}      — poll simulation result
  GET  /api/news/{symbol}          — Finnhub + keyword sentiment
  GET  /api/macro                  — FRED macroeconomic data
  POST /api/strategy/covered-call  — payoff + Llama narration
  POST /api/strategy/iron-condor   — payoff + Llama narration
  GET  /api/strategy/suggest       — IV + trend recommendation
  WS   /ws/data-hub                — Alpaca stream → frontend
"""

import uvicorn
import logging
import os
import asyncio
import time
from datetime import datetime
from typing import List, Dict, Optional, Any

from fastapi import FastAPI, Query, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ── Core Internals ─────────────────────────────────────────────────
from backend.backend.bus.bus import bus, BusEvent
from backend.backend.cache.cache import unified_cache
from backend.backend.shared_state import sim_store

# ── Services ───────────────────────────────────────────────────────
from backend.backend.services.alpaca import get_all_snapshots, get_bars, refresh_all_market_data
from backend.backend.services.intelligence import fetch_and_score_news
from backend.backend.services.fred import get_macro_data
from backend.backend.services.llama_service import (
    generate_forecast_reasoning,
    generate_strategy_narration,
)
from backend.backend.services.quant_service import quant_service

# ── Engines ────────────────────────────────────────────────────────
from backend.backend.engines.monte_carlo import run_monte_carlo
from backend.backend.engines.portfolio_analyzer import portfolio_summary
from backend.backend.engines.risk_engine import risk_summary
from backend.backend.engines.strategy_engine import StrategyEngine, suggest_strategy
from backend.backend.engines.market_pulse import MarketPulseEngine, create_pulse_engine
from backend.backend.engines.asymmetric_edge import AsymmetricEdgeEngine
from backend.backend.engines.auto_hedging import AutoHedgingOrchestrator

# ── WebSocket Hub ──────────────────────────────────────────────────
from backend.backend.api.ws_hub import router as ws_router, manager as ws_manager

# ── Logging ────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FinMotion AI", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)


# ── Dynamic Ticker Registry ────────────────────────────────────────
class TickerRegistry:
    def __init__(self):
        self._watchlist: set = set()
        self._portfolio: set = set()
        self._defaults:  set = {"AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "SPY", "QQQ"}
        self._crypto_defaults: set = {"BTC/USD", "ETH/USD"}

    def add_from_portfolio(self, holdings: list):
        for h in holdings:
            sym = (h.get("symbol") or h.get("ticker", "")).upper()
            if sym:
                self._portfolio.add(sym)

    def add_to_watchlist(self, symbol: str):
        self._watchlist.add(symbol.upper())

    def all_symbols(self) -> list:
        return list(self._defaults | self._watchlist | self._portfolio)

    def stock_symbols(self) -> list:
        return [s for s in self.all_symbols() if "/" not in s]

    def crypto_symbols(self) -> list:
        return list(self._crypto_defaults | {s for s in self.all_symbols() if "/" in s})


ticker_registry = TickerRegistry()

# ── Engine References ──────────────────────────────────────────────
pulse_engine: Optional[MarketPulseEngine] = None
orchestrator: Optional[AutoHedgingOrchestrator] = None


# ── Signal Bus Wiring (startup) ────────────────────────────────────
def _on_bearish_signal(payload: dict):
    """Penalise cached forecast confidence when news is bearish."""
    symbol    = payload.get("symbol", "")
    magnitude = payload.get("magnitude", 0.0)
    cached    = unified_cache.get(f"forecast:{symbol}")
    if cached and isinstance(cached, dict):
        penalty = magnitude * 10          # up to 10% confidence reduction
        cached["confidence"]          = max(10, cached.get("confidence", 50) - penalty)
        cached["sentiment_adjusted"]  = True
        unified_cache.set(f"forecast:{symbol}", cached, ttl=300)
        logger.info(f"[Bus] Bearish signal for {symbol} → confidence penalised by {penalty:.1f}%")


# ── Background Loops ───────────────────────────────────────────────
async def market_data_loop():
    while True:
        try:
            stocks  = ticker_registry.stock_symbols()
            cryptos = ticker_registry.crypto_symbols()
            data    = await refresh_all_market_data(stocks, cryptos)
            for symbol, snapshot in data.items():
                unified_cache.set(symbol, snapshot)
        except Exception as e:
            logger.error(f"[DataLoop] Error: {e}")
        await asyncio.sleep(30)


# ── Startup ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    global pulse_engine, orchestrator

    bus.subscribe(BusEvent.SENTIMENT_BEARISH, _on_bearish_signal)
    await quant_service.initialize()
    asyncio.create_task(market_data_loop())
    from backend.backend.api.ws_hub import shared_data_streamer
    asyncio.create_task(shared_data_streamer())

    # ── Initialize Market Pulse Engine ────────────────────────────
    import json as _json

    async def _broadcast_pulse(data: dict):
        await ws_manager.broadcast(_json.dumps(data))

    pulse_engine = await create_pulse_engine(
        broadcast_fn=_broadcast_pulse,
        symbols=ticker_registry.stock_symbols(),
    )

    # ── Initialize Auto-Hedging Orchestrator ───────────────────────
    orchestrator = AutoHedgingOrchestrator(
        pulse_engine=pulse_engine,
        edge_engine=AsymmetricEdgeEngine(account_capital=10_000),
        broadcast_fn=_broadcast_pulse,
        account_capital=10_000,
        max_portfolio_heat=0.10,
        auto_execute=False,
    )
    asyncio.create_task(orchestrator.start())

    # Register in shared state so ws_hub can access pulse_engine
    import backend.backend.shared_state as _ss
    _ss.pulse_engine = pulse_engine
    _ss.orchestrator = orchestrator

    logger.info("✅ FinMotion AI v3.0 started — unified bus · Groq · Alpaca sandbox · dynamic tickers · pulse engine")


# ── Pydantic Models ────────────────────────────────────────────────
class PortfolioHolding(BaseModel):
    symbol:    str
    quantity:  float
    avg_cost:  float = 0.0

class PortfolioRequest(BaseModel):
    holdings: List[PortfolioHolding]

class WatchlistRequest(BaseModel):
    symbol: str

class StrategyRequest(BaseModel):
    symbol:         str
    shares:         int   = 100
    target_premium: float = 2.0
    width:          float = 5.0
    expiry_days:    int   = 30


# ── Health ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status":          "ok",
        "version":         "3.0.0",
        "ts":              time.time(),
        "bus_type":        type(bus).__name__,
        "registry_size":   len(ticker_registry.all_symbols()),
    }


# ── Market Data ────────────────────────────────────────────────────
@app.get("/api/snapshots")
async def snapshots(symbols: str = Query(...), market: str = "stock"):
    syms = [s.strip() for s in symbols.split(",") if s.strip()]
    return await get_all_snapshots(syms, market=market)


@app.get("/api/bars/{symbol}")
async def bars(symbol: str, days: int = 60):
    cache_key = f"bars:{symbol}:{days}"
    cached    = unified_cache.get(cache_key)
    if cached:
        closes = [b.get("close") or b.get("c") for b in cached if b.get("close") or b.get("c")]
        return {"symbol": symbol, "closes": closes, "source": "cache"}
    raw    = await get_bars(symbol, timeframe="1Day", limit=days)
    closes = [b.get("close") or b.get("c") for b in raw if b.get("close") or b.get("c")]
    return {"symbol": symbol, "closes": closes, "source": "alpaca"}


# Legacy batch quotes (backward compat with existing frontend components)
@app.get("/api/quotes")
async def batch_quotes(tickers: str = Query(...)):
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    results     = []
    uncached    = []

    for t in ticker_list:
        cached = unified_cache.get(t)
        if cached:
            results.append(cached)
        else:
            uncached.append(t)

    if uncached:
        crypto_syms = [s for s in uncached if "/" in s]
        stock_syms  = [s for s in uncached if "/" not in s]
        try:
            if stock_syms:
                data = await get_all_snapshots(stock_syms, market="stock")
                for sym, d in data.items():
                    unified_cache.set(sym, d)
                    results.append(d)
        except Exception as e:
            logger.warning(f"Batch stock snapshot failed: {e}")
        try:
            if crypto_syms:
                data = await get_all_snapshots(crypto_syms, market="crypto")
                for sym, d in data.items():
                    unified_cache.set(sym, d)
                    results.append(d)
        except Exception as e:
            logger.warning(f"Batch crypto snapshot failed: {e}")

    return results


@app.get("/api/quote/{ticker}")
async def single_quote(ticker: str):
    cached = unified_cache.get(ticker)
    if cached:
        return cached
    data = await get_all_snapshots([ticker], market="stock")
    if ticker in data:
        return data[ticker]
    raise HTTPException(status_code=404, detail=f"Quote not found for {ticker}")


# ── Portfolio ──────────────────────────────────────────────────────
@app.post("/api/portfolio/analyze")
async def analyze_portfolio(req: PortfolioRequest):
    holdings_raw = [h.dict() for h in req.holdings]
    ticker_registry.add_from_portfolio(holdings_raw)

    cache_key = "portfolio:" + str(sorted([(h["symbol"], h.get("quantity", 0)) for h in holdings_raw]))
    cached    = unified_cache.get(cache_key)
    if cached:
        return cached

    # Inject live prices (single Alpaca batch call)
    symbols = [h["symbol"] for h in holdings_raw]
    try:
        snaps = await get_all_snapshots(symbols, market="stock")
        for h in holdings_raw:
            snap = snaps.get(h["symbol"], {})
            h["current_price"] = snap.get("price") or h.get("avg_cost", 0)
            h["buy_price"]     = h.get("avg_cost", h["current_price"])
    except Exception as e:
        logger.warning(f"Portfolio Alpaca snapshot failed: {e}")
        for h in holdings_raw:
            h["current_price"] = h.get("avg_cost", 0)
            h["buy_price"]     = h.get("avg_cost", 0)

    try:
        summary = portfolio_summary(holdings_raw)
    except Exception as e:
        logger.error(f"PortfolioAnalyzer error: {e}")
        return {"error": str(e), "status": "engine_failed"}

    risk = {}
    try:
        prices = [h.get("current_price", 1) for h in holdings_raw if h.get("current_price")]
        if len(prices) >= 2:
            returns = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]
            total_capital = sum(h.get("quantity", 1) * h.get("current_price", 0) for h in holdings_raw)
            risk = risk_summary(returns, capital=total_capital)
    except Exception as e:
        logger.warning(f"RiskEngine error: {e}")

    result = {**summary, "risk_metrics": risk, "cached_at": time.time()}
    unified_cache.set(cache_key, result, ttl=30)

    bus.publish(BusEvent.PORTFOLIO_CHANGED, {
        "beta":       risk.get("beta", 1.0),
        "risk_class": risk.get("risk_class", "MEDIUM"),
    })
    return result


@app.post("/api/watchlist/add")
async def add_to_watchlist(req: WatchlistRequest):
    ticker_registry.add_to_watchlist(req.symbol)
    return {"status": "added", "symbol": req.symbol.upper()}


# ── Forecasting ────────────────────────────────────────────────────
@app.get("/api/forecast/{symbol}")
async def forecast(symbol: str):
    sym       = symbol.upper()
    cache_key = f"forecast:{sym}"
    cached    = unified_cache.get(cache_key)
    if cached:
        return cached

    try:
        result = await quant_service.run_ensemble_forecast(sym)
        if "error" in result:
            return result

        # Enrich with Llama reasoning (cached separately)
        try:
            result["reasoning"] = await generate_forecast_reasoning(result)
        except Exception as e:
            logger.warning(f"Llama forecast reasoning skipped for {sym}: {e}")
            result["reasoning"] = result.get("market_analysis", "")

        unified_cache.set(cache_key, result, ttl=300)
        return result
    except Exception as e:
        logger.error(f"Forecast error for {sym}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Monte Carlo Simulation ─────────────────────────────────────────
@app.post("/api/simulate/{symbol}")
async def start_simulation(symbol: str, background_tasks: BackgroundTasks):
    sym        = symbol.upper()
    cached_snap = unified_cache.get(sym)
    price       = cached_snap.get("price", 100.0) if cached_snap else 100.0
    background_tasks.add_task(run_monte_carlo, sym, price)
    return {"status": "started", "symbol": sym, "start_price": price}


@app.get("/api/simulate/{symbol}")
async def poll_simulation(symbol: str):
    result = sim_store.get(symbol.upper())
    if result is None:
        return {"status": "pending"}
    return result


# ── News & Sentiment ───────────────────────────────────────────────
@app.get("/api/news/{symbol}")
async def news(symbol: str):
    return await fetch_and_score_news(symbol.upper())


# ── Macro (FRED) ───────────────────────────────────────────────────
@app.get("/api/macro")
async def macro():
    return await get_macro_data()


# ── Strategy Endpoints ─────────────────────────────────────────────
@app.post("/api/strategy/covered-call")
async def covered_call(req: StrategyRequest):
    sym       = req.symbol.upper()
    snap      = unified_cache.get(sym)
    price     = snap.get("price", 100.0) if snap else 100.0
    engine    = StrategyEngine(sym, price)
    result    = engine.covered_call(shares=req.shares, target_premium=req.target_premium)
    forecast  = unified_cache.get(f"forecast:{sym}")
    result["narration"] = await generate_strategy_narration(
        "covered-call", sym,
        {"shares": req.shares, "max_profit": result["max_profit"],
         "breakeven": result["breakeven"], "premium": result["premium"]},
        forecast,
    )
    return result


@app.post("/api/strategy/iron-condor")
async def iron_condor(req: StrategyRequest):
    sym      = req.symbol.upper()
    snap     = unified_cache.get(sym)
    price    = snap.get("price", 100.0) if snap else 100.0
    engine   = StrategyEngine(sym, price)
    result   = engine.iron_condor(width=req.width, expiry_days=req.expiry_days)
    forecast = unified_cache.get(f"forecast:{sym}")
    result["narration"] = await generate_strategy_narration(
        "iron-condor", sym,
        {"width": req.width, "expiry_days": req.expiry_days,
         "max_profit": result["max_profit"], "max_loss": result["max_loss"]},
        forecast,
    )
    return result


@app.get("/api/strategy/suggest")
async def strategy_suggest(
    symbol: str,
    iv_rank: float     = Query(50.0, ge=0, le=100),
    trend:   str       = Query("NEUTRAL"),
    days_to_expiry: int = Query(30, ge=1),
    earnings_soon:  bool = False,
):
    return suggest_strategy(iv_rank, trend.upper(), days_to_expiry,
                            earnings_soon=earnings_soon)


# ── Legacy routes (backward compat with landing page components) ───
@app.get("/api/candles/{ticker}")
async def get_candles(ticker: str, timeframe: str = "day", limit: int = 90):
    raw    = await get_bars(ticker, timeframe="1Day", limit=limit)
    return raw or []


@app.get("/api/monte-carlo/{symbol}")
async def monte_carlo_poll_legacy(symbol: str):
    return await poll_simulation(symbol)


@app.post("/api/simulate")
async def simulate_legacy(background_tasks: BackgroundTasks,
                          ticker: str = Query(...),
                          current_price: float = Query(100.0),
                          volatility: float = Query(0.02)):
    background_tasks.add_task(run_monte_carlo, ticker.upper(), current_price)
    return {"status": "accepted"}


# ── Market Pulse Endpoints ─────────────────────────────────────────
@app.get("/api/pulse/state")
async def get_pulse_state():
    """Current regime state for all symbols. Frontend calls once on mount."""
    if not pulse_engine:
        return {"error": "Pulse engine not initialized"}

    state = {}
    for symbol in pulse_engine.symbols:
        if len(pulse_engine.minute_bars[symbol]) > 20:
            pulse = await pulse_engine._calculate_pulse(symbol)
            state[symbol] = {
                "regime":              pulse.regime.value,
                "confidence":          pulse.regime_confidence,
                "last_price":          pulse.last_price,
                "realized_vol_daily":  pulse.realized_vol_daily,
                "tail_risk_score":     pulse.tail_risk_score,
                "requires_attention":  pulse.requires_attention,
            }

    return {"state": state, "timestamp": time.time()}


@app.post("/api/edge/scan/{symbol}")
async def scan_for_edge(symbol: str):
    """Scan a symbol for asymmetric volatility edge."""
    sym = symbol.upper()
    bars_data = await get_bars(sym, timeframe="1Day", limit=90)
    prices = [b.get("close") or b.get("c") for b in bars_data if b.get("close") or b.get("c")]

    if not prices:
        raise HTTPException(status_code=404, detail=f"No price data for {sym}")

    sentiment = unified_cache.get(f"sentiment:{sym}") or 0.0
    macro_stress = unified_cache.get("macro:stress_index") or 0.3

    engine = AsymmetricEdgeEngine(account_capital=10_000)
    bet = engine.generate_bet(sym, prices, float(sentiment) if isinstance(sentiment, (int, float)) else 0.0, float(macro_stress) if isinstance(macro_stress, (int, float)) else 0.3)

    if bet is None:
        return {"action": "NO_TRADE", "reason": "No asymmetric edge detected"}

    return {
        "action":  "EVALUATE",
        "bet":     bet.__dict__,
        "warning": "Paper trade for 30 days before live deployment",
    }


@app.post("/api/hedge/approve/{timestamp}")
async def approve_hedge_decision(timestamp: float):
    """Approve a pending hedge decision from the orchestrator."""
    if not orchestrator:
        return {"error": "Orchestrator not initialized"}
    return await orchestrator.approve_decision(timestamp)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
