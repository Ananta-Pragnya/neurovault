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

# ── Database ────────────────────────────────────────────────────────
from backend.backend.database.db import engine, SessionLocal
from backend.backend.database import models as db_models

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

# ── Auth router ────────────────────────────────────────────────────
try:
    from backend.backend.api.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/v1")
    logger.info("Auth router mounted at /api/v1/auth")
except Exception as _e:
    logger.warning(f"Auth router not loaded: {_e}")


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
            # Check price alerts against live prices
            await _check_price_alerts(data)
        except Exception as e:
            logger.error(f"[DataLoop] Error: {e}")
        await asyncio.sleep(30)


async def _check_price_alerts(market_data: dict):
    """Fire WebSocket notification when a price alert threshold is crossed."""
    import json as _json
    from datetime import datetime as _dt
    try:
        with SessionLocal() as db:
            active = db.query(db_models.PriceAlert).filter_by(is_active=True).all()
            for alert in active:
                snap = market_data.get(alert.symbol)
                if not snap:
                    continue
                price = snap.get("price", 0)
                triggered = (
                    (alert.direction == "above" and price >= alert.trigger_price) or
                    (alert.direction == "below" and price <= alert.trigger_price)
                )
                if triggered:
                    alert.is_active = False
                    alert.triggered_at = _dt.utcnow()
                    db.commit()
                    msg = _json.dumps({
                        "type":    "alert_triggered",
                        "symbol":  alert.symbol,
                        "price":   price,
                        "trigger": alert.trigger_price,
                        "direction": alert.direction,
                    })
                    await ws_manager.broadcast(msg)
                    logger.info(f"[Alert] {alert.symbol} crossed ${alert.trigger_price} ({alert.direction})")
    except Exception as e:
        logger.warning(f"[AlertCheck] {e}")


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

    # ── Init SQLite DB (create tables if missing) ──────────────────
    db_models.Base.metadata.create_all(bind=engine)
    with SessionLocal() as _db:
        if not _db.query(db_models.User).filter_by(id=1).first():
            _db.add(db_models.User(id=1, email="default@finmotion.ai", username="default"))
            _db.commit()
        # Restore watchlist into in-memory registry
        for row in _db.query(db_models.Watchlist).filter_by(user_id=1).all():
            ticker_registry.add_to_watchlist(row.symbol)

    logger.info("✅ FinMotion AI v3.0 started — unified bus · Groq · Alpaca sandbox · dynamic tickers · pulse engine · SQLite DB")


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

class SignalRequest(BaseModel):
    ticker: str
    price: float = 0.0
    change_pct: float = 0.0
    volume: float = 0.0

class IntelligenceRequest(BaseModel):
    query: str

class HoldingRequest(BaseModel):
    symbol:   str
    quantity: float
    avg_cost: float = 0.0

class HoldingsPayload(BaseModel):
    holdings: List[HoldingRequest]

class PriceAlertRequest(BaseModel):
    symbol:        str
    trigger_price: float
    direction:     str  # "above" or "below"


# ── Black-Scholes helpers (used by options chain endpoint) ─────────
import math as _math

def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + _math.erf(x / _math.sqrt(2.0)))

def _bs_option(S: float, K: float, T: float, r: float, sigma: float, opt_type: str) -> dict:
    if T <= 0:
        intrinsic = max(S - K, 0) if opt_type == "call" else max(K - S, 0)
        return {"price": round(intrinsic, 2), "delta": 1.0 if (opt_type == "call" and S > K) else 0.0, "theta": 0.0}
    sq_T = _math.sqrt(T)
    d1 = (_math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sq_T)
    d2 = d1 - sigma * sq_T
    disc = _math.exp(-r * T)
    phi_d1 = _norm_cdf(d1)
    if opt_type == "call":
        price = S * phi_d1 - K * disc * _norm_cdf(d2)
        delta = phi_d1
        theta = (-S * phi_d1 * sigma / (2 * sq_T) - r * K * disc * _norm_cdf(d2)) / 365.0
    else:
        price = K * disc * _norm_cdf(-d2) - S * _norm_cdf(-d1)
        delta = phi_d1 - 1.0
        theta = (-S * phi_d1 * sigma / (2 * sq_T) + r * K * disc * _norm_cdf(-d2)) / 365.0
    return {"price": round(max(price, 0.01), 2), "delta": round(delta, 3), "theta": round(theta, 4)}


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
    sym = req.symbol.upper()
    ticker_registry.add_to_watchlist(sym)
    with SessionLocal() as db:
        exists = db.query(db_models.Watchlist).filter_by(user_id=1, symbol=sym).first()
        if not exists:
            db.add(db_models.Watchlist(user_id=1, symbol=sym))
            db.commit()
    return {"status": "added", "symbol": sym}


@app.get("/api/watchlist")
async def get_watchlist():
    with SessionLocal() as db:
        rows = db.query(db_models.Watchlist).filter_by(user_id=1).all()
    return {"watchlist": [{"symbol": r.symbol, "volatility_tier": r.volatility_tier, "added_at": str(r.added_at)} for r in rows]}


@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str):
    sym = symbol.upper()
    with SessionLocal() as db:
        row = db.query(db_models.Watchlist).filter_by(user_id=1, symbol=sym).first()
        if row:
            db.delete(row)
            db.commit()
    return {"status": "removed", "symbol": sym}


# ── Portfolio Holdings Persistence ────────────────────────────────
@app.get("/api/portfolio/holdings")
async def get_holdings():
    with SessionLocal() as db:
        rows = db.query(db_models.Position).filter_by(user_id=1, is_active=True).all()
    return {"holdings": [{"symbol": r.symbol, "quantity": r.quantity, "avg_cost": r.entry_price} for r in rows]}


@app.post("/api/portfolio/holdings")
async def save_holdings(payload: HoldingsPayload):
    with SessionLocal() as db:
        # Deactivate all existing positions for this user
        db.query(db_models.Position).filter_by(user_id=1).update({"is_active": False})
        db.commit()
        for h in payload.holdings:
            sym = h.symbol.upper()
            db.add(db_models.Position(
                user_id=1,
                symbol=sym,
                entry_price=h.avg_cost,
                peak_price=h.avg_cost,
                quantity=h.quantity,
                is_active=True,
            ))
        db.commit()
    return {"status": "saved", "count": len(payload.holdings)}


# ── Price Alerts ───────────────────────────────────────────────────
@app.post("/api/alerts")
async def create_alert(req: PriceAlertRequest):
    direction = req.direction.lower()
    if direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail="direction must be 'above' or 'below'")
    with SessionLocal() as db:
        alert = db_models.PriceAlert(
            symbol=req.symbol.upper(),
            trigger_price=req.trigger_price,
            direction=direction,
            is_active=True,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        alert_id = alert.id
    return {"status": "created", "id": alert_id, "symbol": req.symbol.upper(),
            "trigger_price": req.trigger_price, "direction": direction}


@app.get("/api/alerts")
async def list_alerts():
    with SessionLocal() as db:
        rows = db.query(db_models.PriceAlert).filter_by(is_active=True).all()
    return {"alerts": [
        {"id": r.id, "symbol": r.symbol, "trigger_price": r.trigger_price,
         "direction": r.direction, "created_at": str(r.created_at)}
        for r in rows
    ]}


@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: int):
    with SessionLocal() as db:
        row = db.query(db_models.PriceAlert).filter_by(id=alert_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")
        db.delete(row)
        db.commit()
    return {"status": "deleted", "id": alert_id}


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


# ── AI Signal Endpoint ─────────────────────────────────────────────
@app.post("/api/signal")
async def ai_signal(req: SignalRequest):
    """Map TA ensemble forecast → frontend SignalEngine shape."""
    sym = req.ticker.upper()
    cache_key = f"forecast:{sym}"
    result = unified_cache.get(cache_key)
    if not result:
        try:
            result = await quant_service.run_ensemble_forecast(sym)
            if "error" not in result:
                try:
                    result["reasoning"] = await generate_forecast_reasoning(result)
                except Exception:
                    result["reasoning"] = result.get("market_analysis", "")
                unified_cache.set(cache_key, result, ttl=300)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    direction  = result.get("direction", "neutral")
    confidence = result.get("confidence", 50)
    _sig  = {"bullish": "STRONG_BUY",  "bearish": "STRONG_SELL",  "neutral": "HOLD"}
    _risk = {"bullish": "LOW",          "bearish": "HIGH",          "neutral": "MEDIUM"}
    _act  = {
        "bullish": f"Enter long position on {sym}. TA ensemble confirms bullish momentum with {confidence:.0f}% confidence.",
        "bearish": f"Reduce exposure or hedge {sym}. Bearish pressure detected with {confidence:.0f}% confidence.",
        "neutral": f"Hold {sym}. Mixed signals — wait for directional confirmation before adding.",
    }
    return {
        "signal":           _sig.get(direction, "HOLD"),
        "trend":            direction.upper(),
        "confidence":       confidence,
        "risk_level":       _risk.get(direction, "MEDIUM"),
        "reasoning":        result.get("reasoning", result.get("market_analysis", "")),
        "suggested_action": _act.get(direction, ""),
        "price_target":     result.get("price_target"),
        "last_close":       result.get("last_close"),
        "rsi":              result.get("rsi"),
        "momentum_pct":     result.get("momentum_pct"),
        "source":           "real_ta",
    }


# ── Deep Intel — News Intelligence Synthesis ──────────────────────
@app.post("/api/intelligence/news")
async def intelligence_news(req: IntelligenceRequest):
    """Fetch Finnhub news + Groq synthesis → NewsIntelligenceResponse shape."""
    import asyncio as _asyncio, json as _json

    name_map = {
        "TESLA": "TSLA", "APPLE": "AAPL", "MICROSOFT": "MSFT",
        "NVIDIA": "NVDA", "GOOGLE": "GOOGL", "ALPHABET": "GOOGL",
        "AMAZON": "AMZN", "BITCOIN": "BTC", "ETHEREUM": "ETH",
        "S&P500": "SPY", "SP500": "SPY", "NASDAQ": "QQQ",
    }
    symbol = name_map.get(req.query.upper().strip(), req.query.upper().strip())
    if not symbol:
        raise HTTPException(status_code=400, detail="query is required")

    news_data = await fetch_and_score_news(symbol)
    articles  = news_data.get("articles", [])
    sent_raw  = news_data.get("sentiment", "neutral")
    sentiment = {"bullish": "Bullish", "bearish": "Bearish"}.get(sent_raw, "Neutral")

    headlines_ctx = "\n".join(f"- {a.get('headline','')}" for a in articles[:5]) if articles else "No recent headlines available."

    system_prompt = (
        "You are a market intelligence analyst. Given news context, return ONLY valid JSON:\n"
        '{"summary":"2-sentence executive summary","keyPoints":["point1","point2","point3"],"prediction":"1-sentence short-term outlook"}'
    )
    user_prompt = (
        f"Symbol: {symbol}\nSentiment: {sentiment} (score {news_data.get('score', 0):.3f})\n"
        f"Recent Headlines:\n{headlines_ctx}\n\nGenerate intelligence report."
    )

    summary, key_points, prediction = "", [], ""
    try:
        from backend.backend.services.llama_service import _call_groq
        raw = await _asyncio.to_thread(_call_groq, system_prompt, user_prompt, 400, "primary")
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed  = _json.loads(cleaned)
        summary    = parsed.get("summary", "")
        key_points = parsed.get("keyPoints", [])[:3]
        prediction = parsed.get("prediction", "")
    except Exception as e:
        logger.warning(f"[Intel] Groq synthesis failed for {symbol}: {e}")
        summary    = f"{symbol} shows {sent_raw} sentiment based on {len(articles)} recent articles."
        key_points = [
            f"Sentiment score: {news_data.get('score', 0):.3f} ({sentiment})",
            f"{len(articles)} articles analyzed over the past 7 days.",
            "Monitor for earnings, macro shifts, or sector catalysts.",
        ]
        prediction = f"Near-term outlook is {sent_raw} for {symbol} based on current news flow."

    sources = [
        {"title": a.get("headline", ""), "uri": a.get("url", "#")}
        for a in articles[:3] if a.get("headline")
    ]
    return {
        "symbol":    symbol,
        "summary":   summary,
        "keyPoints": key_points,
        "sentiment": sentiment,
        "prediction": prediction,
        "sources":   sources,
        "score":     news_data.get("score", 0),
        "timestamp": time.time(),
    }


# ── Options Chain Endpoints ────────────────────────────────────────
@app.get("/api/options/expirations/{symbol}")
async def options_expirations(symbol: str):
    """Return next 4 monthly option expiration dates (3rd Friday)."""
    from datetime import date as _date, timedelta as _td
    today = _date.today()
    expirations = []
    for months_ahead in range(1, 5):
        raw_month = today.month + months_ahead
        year  = today.year + (raw_month - 1) // 12
        month = (raw_month - 1) % 12 + 1
        first = _date(year, month, 1)
        days_to_friday = (4 - first.weekday()) % 7   # 4 = Friday
        third_friday   = first + _td(days=days_to_friday + 14)
        expirations.append(third_friday.isoformat())
    return expirations


@app.get("/api/options/chain/{symbol}")
async def options_chain(symbol: str, expiry: str = Query("")):
    """Generate Black-Scholes options chain around current spot price."""
    from datetime import date as _date
    sym  = symbol.upper()
    snap = unified_cache.get(sym)
    S    = snap.get("price", 100.0) if snap else 100.0

    today = _date.today()
    if expiry:
        try:
            exp_date = _date.fromisoformat(expiry)
            dte = max((exp_date - today).days, 1)
        except Exception:
            dte = 30
    else:
        dte = 30

    T     = dte / 365.0
    r     = 0.05    # risk-free rate
    sigma = 0.25    # approximate IV

    multipliers = [0.85, 0.88, 0.90, 0.92, 0.94, 0.96, 0.97, 0.98, 0.99,
                   1.00, 1.01, 1.02, 1.03, 1.04, 1.06, 1.08, 1.10, 1.12, 1.15]
    chain = []
    for m in multipliers:
        K      = round(S * m, 2)
        call   = _bs_option(S, K, T, r, sigma, "call")
        put    = _bs_option(S, K, T, r, sigma, "put")
        spread = round(max(call["price"] * 0.05, 0.05), 2)
        chain.append({
            "strike":      K,
            "call_bid":    round(max(call["price"] - spread / 2, 0.01), 2),
            "call_ask":    round(call["price"] + spread / 2, 2),
            "call_greeks": {"delta": call["delta"], "theta": call["theta"]},
            "put_bid":     round(max(put["price"]  - spread / 2, 0.01), 2),
            "put_ask":     round(put["price"]  + spread / 2, 2),
            "put_greeks":  {"delta": put["delta"],  "theta": put["theta"]},
            "source":      "black-scholes",
        })
    return chain


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


# ── Earnings Calendar ──────────────────────────────────────────────
@app.get("/api/earnings/{symbol}")
async def earnings_calendar(symbol: str):
    """Upcoming earnings date from Finnhub. Cached 1 hour."""
    sym = symbol.upper()
    cache_key = f"earnings:{sym}"
    cached = unified_cache.get(cache_key)
    if cached:
        return cached

    try:
        import httpx as _httpx
        finnhub_key = os.getenv("FINNHUB_API_KEY", "")
        if not finnhub_key:
            return {"symbol": sym, "earnings": []}
        async with _httpx.AsyncClient(timeout=8) as client:
            res = await client.get(
                "https://finnhub.io/api/v1/calendar/earnings",
                params={"symbol": sym, "token": finnhub_key},
            )
            res.raise_for_status()
            data = res.json()
        entries = data.get("earningsCalendar", [])[:4]
        result = {
            "symbol":   sym,
            "earnings": [
                {"date": e.get("date"), "eps_estimate": e.get("epsEstimate"),
                 "revenue_estimate": e.get("revenueEstimate"), "quarter": e.get("quarter")}
                for e in entries
            ],
        }
        unified_cache.set(cache_key, result, ttl=3600)
        return result
    except Exception as e:
        logger.warning(f"[Earnings] Failed for {sym}: {e}")
        return {"symbol": sym, "earnings": []}


# ── Sector Rotation ────────────────────────────────────────────────
@app.get("/api/sectors")
async def sector_rotation():
    """S&P 500 sector ETF relative strength (1W/1M/3M returns)."""
    cache_key = "sectors:rotation"
    cached = unified_cache.get(cache_key)
    if cached:
        return cached

    SECTOR_ETFS = {
        "XLK": "Technology", "XLF": "Financials",  "XLE": "Energy",
        "XLV": "Health Care", "XLY": "Cons. Discret.", "XLP": "Cons. Staples",
        "XLI": "Industrials", "XLB": "Materials",  "XLRE": "Real Estate",
        "XLU": "Utilities",   "XLC": "Comm. Services",
    }

    sectors = []
    for etf, name in SECTOR_ETFS.items():
        try:
            bars = await get_bars(etf, timeframe="1Day", limit=90)
            closes = [b.get("close") or b.get("c", 0) for b in bars if b.get("close") or b.get("c")]
            if len(closes) < 2:
                continue
            c = closes[-1]
            r1w = (c / closes[-6]  - 1) * 100 if len(closes) >= 6  else 0.0
            r1m = (c / closes[-23] - 1) * 100 if len(closes) >= 23 else 0.0
            r3m = (c / closes[-64] - 1) * 100 if len(closes) >= 64 else 0.0
            sectors.append({"symbol": etf, "name": name,
                             "return_1w": round(r1w, 2), "return_1m": round(r1m, 2), "return_3m": round(r3m, 2)})
        except Exception as e:
            logger.warning(f"[Sectors] {etf} failed: {e}")

    result = {"sectors": sectors, "ts": time.time()}
    unified_cache.set(cache_key, result, ttl=1800)
    return result


# ── Correlation Matrix ─────────────────────────────────────────────
@app.post("/api/portfolio/correlation")
async def portfolio_correlation(req: PortfolioRequest):
    """Pearson correlation matrix for portfolio holdings (60-day daily returns)."""
    symbols = [h.symbol.upper() for h in req.holdings]
    if len(symbols) < 2:
        return {"symbols": symbols, "matrix": [[1.0]]}

    price_series: dict[str, list[float]] = {}
    for sym in symbols:
        bars = await get_bars(sym, timeframe="1Day", limit=62)
        closes = [b.get("close") or b.get("c", 0) for b in bars if b.get("close") or b.get("c")]
        if closes:
            price_series[sym] = closes

    valid = [s for s in symbols if s in price_series]
    if len(valid) < 2:
        return {"symbols": valid, "matrix": [[1.0] * len(valid)] * len(valid)}

    import numpy as _np
    min_len = min(len(price_series[s]) for s in valid)
    returns = _np.array([[
        (price_series[s][i] - price_series[s][i - 1]) / price_series[s][i - 1]
        for i in range(1, min_len)
    ] for s in valid])

    corr = _np.corrcoef(returns)
    return {"symbols": valid, "matrix": [[round(float(v), 3) for v in row] for row in corr]}


# ── Backtest Engine ────────────────────────────────────────────────
class BacktestRequest(BaseModel):
    strategy: str = "sma_crossover"
    fast:     int   = 20
    slow:     int   = 50
    capital:  float = 10_000.0
    days:     int   = 180

@app.post("/api/backtest/{symbol}")
async def backtest(symbol: str, req: BacktestRequest):
    """Run a TA strategy backtest against real historical bars."""
    sym = symbol.upper()
    bars = await get_bars(sym, timeframe="1Day", limit=req.days)
    closes = [b.get("close") or b.get("c", 0) for b in bars if b.get("close") or b.get("c")]
    if len(closes) < req.slow + 5:
        raise HTTPException(status_code=400, detail=f"Not enough bar data for {sym} — need at least {req.slow + 5} days")

    from backend.backend.engines.backtest_engine import run_backtest
    result = run_backtest(closes, strategy=req.strategy, fast=req.fast, slow=req.slow, capital=req.capital)
    return result


# ═══════════════════════════════════════════════════════════════════════
#  NEW ENDPOINTS — MASTER_PROMPT_STOCK_TRACKER reference additions
# ═══════════════════════════════════════════════════════════════════════

# ── Enhanced forecast endpoint (Claude + full indicators) ────────────
@app.get("/api/v1/forecast/{symbol}")
async def forecast_v1(symbol: str, refresh: bool = False):
    """
    Enhanced forecast using the full indicator engine (MACD, ATR, BB %B, VWAP)
    + Claude 3-sentence analysis with 5-min cache.
    Parallel route to /api/forecast/{symbol} (legacy kept for backward compat).
    """
    try:
        from backend.backend.intelligence.forecast import generate_ticker_forecast
        return await generate_ticker_forecast(symbol.upper(), force_refresh=refresh)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── SSE signal stream ─────────────────────────────────────────────────
@app.get("/api/v1/stream/{symbol}")
async def signal_stream(symbol: str):
    """
    Server-Sent Events endpoint. Streams live signal updates for a ticker.
    Emits:
      - signal payloads from the unified_cache every 5 s
      - heartbeat every 30 s
    Frontend: new EventSource('/api/v1/stream/AAPL')
    """
    from fastapi.responses import StreamingResponse
    import json as _json

    ticker = symbol.upper()

    async def event_generator():
        heartbeat_interval = 30
        data_interval = 5
        elapsed = 0

        while True:
            await asyncio.sleep(data_interval)
            elapsed += data_interval

            # Push latest cached signal/forecast
            try:
                cache_key = f"forecast:{ticker}"
                data = unified_cache.get(cache_key)
                if data:
                    payload = data if isinstance(data, dict) else {"raw": data}
                    payload["ticker"] = ticker
                    payload["ts"] = int(asyncio.get_event_loop().time())
                    yield f"data: {_json.dumps(payload)}\n\n"
                else:
                    # Trigger a fresh forecast in background, send placeholder
                    yield f"data: {_json.dumps({'ticker': ticker, 'type': 'pending'})}\n\n"
            except Exception as exc:
                logger.warning(f"SSE stream error for {ticker}: {exc}")

            if elapsed % heartbeat_interval == 0:
                yield f"data: {_json.dumps({'type': 'heartbeat', 'ticker': ticker})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── AI Assistant (streaming SSE) ──────────────────────────────────────
class AssistantRequest(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []


@app.post("/api/v1/assistant/{symbol}")
async def assistant(symbol: str, req: AssistantRequest):
    """
    Streaming Claude analysis scoped to a single ticker.
    Returns text/event-stream chunks for the AssistantDrawer component.

    POST body: { "message": "Why is the score bullish?", "history": [...] }
    """
    from fastapi.responses import StreamingResponse
    from backend.backend.intelligence.llm import stream_ticker_analysis

    ticker = symbol.upper()

    async def sse_gen():
        try:
            async for chunk in stream_ticker_analysis(ticker, req.message, req.history):
                if chunk:
                    yield f"data: {chunk}\n\n"
        except Exception as exc:
            yield f"data: [Error: {exc}]\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Anomaly detection endpoint ────────────────────────────────────────
@app.get("/api/v1/anomaly/{symbol}")
async def anomaly_check(symbol: str):
    """
    Z-score anomaly detection on price + volume for the last 20 bars.
    Returns {price_z, price_anomaly, volume_z, volume_anomaly, combined_flag}.
    """
    sym = symbol.upper()
    try:
        from backend.backend.lib.indicators import detect_anomaly
        bars = await get_bars(sym, timeframe="1Day", limit=25)
        closes  = [b["close"]  for b in bars if "close"  in b]
        volumes = [b["volume"] for b in bars if "volume" in b]

        pz, pa = detect_anomaly(closes)  if len(closes)  >= 3 else (0.0, False)
        vz, va = detect_anomaly(volumes) if len(volumes) >= 3 else (0.0, False)

        return {
            "ticker": sym,
            "price_z":       round(pz, 3),
            "price_anomaly": pa,
            "volume_z":      round(vz, 3),
            "volume_anomaly": va,
            "combined_flag": pa or va,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Full indicator snapshot ───────────────────────────────────────────
@app.get("/api/v1/indicators/{symbol}")
async def full_indicators(symbol: str):
    """
    Complete indicator snapshot: RSI, MACD, Bollinger Bands, ATR, VWAP, composite.
    Uses the new lib/indicators.py engine with proper Wilder smoothing.
    """
    sym = symbol.upper()
    try:
        from backend.backend.lib.indicators import (
            calc_rsi, calc_macd, calc_bollinger_bands, calc_atr, calc_vwap,
            composite_score, detect_anomaly, dict_bars_to_ohlcv,
        )
        bars     = await get_bars(sym, timeframe="1Day", limit=60)
        closes   = [b["close"] for b in bars if "close" in b]
        ohlcv    = dict_bars_to_ohlcv(bars)

        if len(closes) < 14:
            raise HTTPException(status_code=422, detail="Need at least 14 bars of history")

        rsi_r  = calc_rsi(closes)[-1]
        macd_r = calc_macd(closes)[-1]
        bb_r   = calc_bollinger_bands(closes)[-1]
        atr_r  = calc_atr(ohlcv)[-1]  if ohlcv else None
        vwap_r = calc_vwap(ohlcv)[-1] if ohlcv else None
        comp   = composite_score(closes)

        pz, pa = detect_anomaly(closes)
        vols   = [b.get("volume", 0) for b in bars]
        vz, va = detect_anomaly(vols)

        return {
            "ticker": sym,
            "composite": {
                "score":  comp.score,
                "signal": comp.signal,
                "weights": comp.weights_used,
            },
            "rsi": {
                "value":  rsi_r.value,
                "signal": rsi_r.signal,
                "score":  rsi_r.score,
            },
            "macd": {
                "macd_line":    macd_r.macd_line,
                "signal_line":  macd_r.signal_line,
                "histogram":    macd_r.histogram,
                "signal":       macd_r.signal,
                "score":        macd_r.score,
            },
            "bollinger": {
                "upper":      bb_r.upper      if bb_r else None,
                "mid":        bb_r.mid        if bb_r else None,
                "lower":      bb_r.lower      if bb_r else None,
                "percent_b":  bb_r.percent_b  if bb_r else None,
                "bandwidth":  bb_r.bandwidth  if bb_r else None,
                "signal":     bb_r.signal     if bb_r else None,
                "score":      bb_r.score      if bb_r else None,
            },
            "atr": {
                "value":   atr_r.value   if atr_r else None,
                "percent": atr_r.percent if atr_r else None,
            },
            "vwap": {
                "value":     vwap_r.value     if vwap_r else None,
                "signal":    vwap_r.signal    if vwap_r else None,
                "deviation": vwap_r.deviation if vwap_r else None,
            },
            "anomaly": {
                "price_z":       round(pz, 3),
                "price_anomaly": pa,
                "volume_z":      round(vz, 3),
                "volume_anomaly": va,
            },
            "bars_used": len(closes),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
