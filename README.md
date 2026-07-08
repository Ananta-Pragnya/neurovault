# NeuroVault Intelligence

**Institutional-grade financial intelligence terminal. Real-time regime detection, asymmetric edge scanning, AI-augmented forecasting, and defined-risk options structures - built on the Universa/Taleb playbook.**

> Live: [neurovault.vercel.app](https://neurovault.vercel.app) · Backend: Local PC → Cloudflare Quick Tunnel · Repo: [github.com/Ananta-Pragnya/neurovault](https://github.com/Ananta-Pragnya/neurovault)

---

## Table of Contents

1. [The Thesis](#i-the-thesis)
2. [Frontend Architecture](#ii-frontend-architecture)
3. [Backend Architecture](#iii-backend-architecture)
4. [Quantitative Engines](#iv-quantitative-engines)
5. [Deployment](#v-deployment)
6. [Problems Solved](#vi-problems-solved)
7. [Contributions](#vii-contributions)
8. [Running Locally](#viii-running-locally)
9. [API Reference](#ix-api-reference)
10. [Environment Variables](#x-environment-variables)

---

## I. The Thesis

Most retail trading tools are wrong by design. They encourage overtrading, present fabricated confidence, show signals without defined risk, and optimize for engagement rather than edge.

NeuroVault was built against that. The intellectual foundation is the Universa/Nassim Taleb framework: financial markets systematically misprice tail events because the majority of participants are structurally forced to sell volatility (covered calls, vol-target funds, cash-secured puts). When that mispricing is extreme, a defined-risk bet on the other side has positive expected value even if it loses 70% of the time - because the wins are convex.

That philosophy dictated every architectural decision. Every endpoint, every UI component, every number displayed had to earn its place against that standard. An RSI number alone is not intelligence. A Monte Carlo distribution with defined percentiles is. A "BUY" button is not intelligence. A Kelly-sized entry cost percentage with a stated maximum loss is.

**The system refuses to trade ~70% of the time. That discipline is the edge.**

---

## II. Frontend Architecture

### Stack

| Package | Version | Role |
|---------|---------|------|
| React | 19.2.4 | UI framework (concurrent features) |
| TypeScript | 5.8.2 | Full type safety across 60+ files |
| Vite | 6.2.0 | Build tool - sub-100ms HMR, native ESM |
| Tailwind CSS | v4.1.18 | Utility-first styling (PostCSS-based) |
| Zustand | 5.0.12 | Minimal global state |
| Framer Motion | 12.34.0 | Layout animations, tab transitions |
| Recharts | 2.15.1 | SVG charts - area, line, pie, payoff diagrams |
| React Three Fiber | 9.0.0 | 3D globe via Three.js |
| Lucide React | 0.577.0 | Icon system |
| React Router DOM | 7.1.5 | Landing page vs terminal routing |

### Two Worlds, One Repo

**Landing page** (`/`) - marketing surface with 3D globe animation, gold gradient branding, pricing, and auth.

**Terminal** (`/terminal`) - the actual product. `InstitutionalTerminal` is the shell. `InstitutionalNav` is the tab bar. Seven modules:

| Tab | Component | Data Source |
|-----|-----------|-------------|
| Market Intel | `MarketIntelTerminal.tsx` + `MarketPulseDashboard.tsx` | Alpaca snapshots + Finnhub news |
| Deep Intel | `SentimentNews.tsx` | Finnhub articles + Groq/Llama synthesis |
| Forecasting | `QuantPulseTerminal.tsx` | Alpaca bars + SMA/RSI/Bollinger ensemble |
| AI Signals | `SignalEngine.tsx` | TA ensemble → STRONG_BUY / STRONG_SELL / HOLD |
| Options Intel | `OptionsIntel.tsx` | Black-Scholes chain + Greeks (no options subscription needed) |
| Portfolio | `PortfolioTracker.tsx` | Sharpe, VaR, sector exposure, AI rebalancing |
| Simulation Lab | `SimulationLab.tsx` | 1000-path GBM Monte Carlo |

Plus standalone: `EdgeScanner.tsx` (vol mispricing scanner, asymmetric bet generation).

### Design System - NV Palette

```css
--nv-bg:       #0A0A0B   /* obsidian black - backgrounds */
--nv-surface:  #111113   /* near-black - card surfaces */
--nv-gold:     #C9962A   /* molten gold - CTAs, accents */
--nv-gold-text:#D4A843   /* gold text variant */
--nv-platinum: #9EA8B3   /* platinum - body text */
--nv-sage:     #4CAF82   /* sage green - bullish, live data */
--nv-coral:    #C94F4F   /* coral red - bearish, alerts */
--nv-ice:      #5B9BD5   /* ice blue - metadata, feed status */
--nv-border:   #1E1E21   /* card borders */
--nv-border-2: #2A2A2E   /* inner borders */
```

**Typography:** Inter for all UI text and headings. JetBrains Mono strictly for numerical data values. JetBrains Mono is monospaced - every digit takes identical width, preventing price numbers from jumping horizontally as they update.

The landing page runs a parallel legacy gold system (`bg-gold-gradient`, `gold-primary` Tailwind tokens) in the same stylesheet with no conflicts - two namespaces, one `index.css`.

### Navigation Architecture

`InstitutionalNav.tsx` - 48px total height: 2px breathing gold stripe (CSS animation, no JS) + 46px main bar. Text-only tabs - no icons on inactive tabs. Active tab underline uses Framer Motion `layoutId="nvTabLine"` - a single DOM node sliding between tabs with spring physics (`stiffness: 380, damping: 30`). Terminal content uses `paddingTop: '48px'` to match exactly.

Status bar uses `grid-template-columns: '1fr auto 1fr'`:
- Left: sage green dot + system status
- Center: JetBrains Mono metadata (latency, data sources)
- Right: ice blue feed status + live clock

### State Management

`src/stores/tradingStore.ts` (Zustand) holds: `selectedTicker`, `quote`, `portfolio`, `holdings`, `simulation`, per-module `loading` flags, `errors`. Components subscribe selectively - no prop drilling, no Redux ceremony.

### WebSocket Client

`services/MarketSocket.ts` derives the WS URL from `VITE_API_BASE` by replacing `http://` → `ws://` / `https://` → `wss://`. Reconnects on disconnect. QuantPulseTerminal opens a secondary WS connection for live tick updates to the chart.

---

## III. Backend Architecture

### Stack

| Package | Version | Role |
|---------|---------|------|
| FastAPI | 0.111.0 | Async-native web framework |
| Uvicorn | 0.29.0 | ASGI server with WebSocket support |
| Pydantic | 2.7.1 | Request validation, typed models |
| NumPy | 1.26.4 | All quantitative calculations |
| SciPy | 1.13.0 | Statistical functions (VaR, distributions) |
| Groq | 0.9.0 | GPT-OSS 120B inference |
| yfinance | 0.2.55 | Fallback OHLCV data |
| finnhub-python | 2.4.19+ | News articles, sentiment |
| google-generativeai | 0.24+ | Optional Gemini analysis layer |
| httpx | 0.27.0 | Async HTTP for Alpaca REST |
| python-dotenv | 1.0.1 | Loads `backend/.env` |

### Philosophy: One Process, One Cache, One Bus

No database. No Redis. No microservices. A single uvicorn process with three asyncio background tasks running concurrently:

1. **Market data loop** - refreshes all registered symbols from Alpaca every 30 seconds
2. **WebSocket streamer** - broadcasts Alpaca tick updates to all connected frontends
3. **MarketPulse engine** - computes regime state from rolling deques, broadcasts transitions

### File Structure

```
backend/
  main.py                          ← single entry point, all 25+ routes
  requirements.txt
  .env                             ← API keys (never committed)
  backend/
    bus/bus.py                     ← in-process pub/sub event bus
    cache/cache.py                 ← unified TTL cache (dict + timestamps)
    shared_state.py                ← avoids circular imports
    services/
      alpaca.py        (354 lines) ← live quotes, OHLCV bars, 4-tier fallback
      quant_service.py (312 lines) ← SMA/RSI/Bollinger ensemble
      llama_service.py             ← Groq GPT-OSS 120B calls
      intelligence.py              ← Finnhub news + keyword sentiment
      fred.py                      ← FRED macroeconomic data
    engines/
      monte_carlo.py    (88 lines) ← 1000-path GBM simulation
      portfolio_analyzer.py (270)  ← Sharpe, VaR, sector exposure
      risk_engine.py               ← 95% VaR, beta, drawdown
      strategy_engine.py           ← covered-call, iron-condor payoff math
      market_pulse.py   (425 lines)← real-time regime state machine
      asymmetric_edge.py (260 lines)← vol mispricing detector
      auto_hedging.py              ← orchestrator (advisory, no auto-execute)
      black_scholes.py             ← option pricing engine
    api/
      ws_hub.py                    ← WebSocket manager + shared data streamer
```

### Unified Cache

Dictionary with per-key TTL. Quotes: 30s. Forecasts: 300s. Portfolio: 30s. Prevents hammering Alpaca's 200 calls/minute free tier limit. Cache is in-memory - cleared on restart, no Redis dependency, no serialization overhead.

### Event Bus

In-process pub/sub. Events: `SENTIMENT_BEARISH`, `SENTIMENT_BULLISH`, `FORECAST_UPDATED`, `ANOMALY_DETECTED`, `PORTFOLIO_CHANGED`, `SIMULATION_READY`. When a bearish sentiment event fires for a symbol, a subscribed handler immediately penalises the cached forecast confidence for that symbol by up to 10% (proportional to signal magnitude). News and forecasting modules never call each other directly - they communicate through the bus.

### PYTHONPATH - Critical

The import chain is non-obvious. Project root → `backend/` (package) → `backend/` (inner package) → module. Must set before running:

```powershell
$env:PYTHONPATH = "C:\Users\user\Documents\AI\finmotion_-premium-financial-intelligence"
```

Without this, every import fails with `ModuleNotFoundError`.

---

## IV. Quantitative Engines

### Alpaca 4-Tier Fallback

Alpaca free plan returns HTTP 200 with `{"bars": null}` for historical OHLCV. `get_bars()` cascades:

1. Alpaca v2 bars API
2. Finnhub candle endpoint
3. yfinance
4. **Synthetic GBM** - generates statistically plausible bars using geometric Brownian motion, anchored to the real current Alpaca snapshot price. Last bar always equals live price.

### TA Ensemble (quant_service.py)

Three signals, equal weight by default:

- **SMA Trend**: SMA(20) vs SMA(50) crossover → score ∈ {-1, 0, +1}
- **RSI Momentum**: RSI(14), Wilder smoothing. >70 = overbought (bearish), <30 = oversold (bullish)
- **Bollinger Bands**: 20-day mean ± 2σ. Price vs band position determines mean-reversion signal

Composite = weighted average. Direction: composite > 0.15 → bullish, < -0.15 → bearish, ±0.15 → neutral. Confidence = `abs(composite) × 100`, capped at 95%.

### Monte Carlo GBM (monte_carlo.py)

`dS = S(μ·dt + σ·√dt·Z)` where μ = drift from recent history, σ = volatility parameter, dt = 1/252, Z ~ N(0,1). 1000 paths × 252 steps. Runs as FastAPI `BackgroundTask` - POST returns immediately, GET polls for result. Statistics: mean, median, p5, p95, prob_above_start, prob_loss_10pct.

### Portfolio Analyzer (portfolio_analyzer.py)

Fetches live prices via Alpaca batch snapshot. Computes:
- Position weight, P&L, current value per holding
- Sharpe: `(mean_daily_return - rf_daily) / std_daily × √252`, rf = 5% annualized
- VaR 95%: historical simulation on position returns
- Sector exposure via ticker → sector mapping
- Diversification score (0–100) from pairwise correlation matrix
- AI rebalancing advice via Groq

### Asymmetric Edge Engine (asymmetric_edge.py)

Detects vol mispricing vs historical norms:

- **Compressed** (realized vol < 20th percentile) → buy convexity: long vol put spreads, tail protection
- **Normal** (20th–80th) → selective, high-conviction only
- **Stressed** (80th–95th) → sell premium: iron condors
- **Crisis** (>95th) → pure defense

Kelly sizing: `f* = (p×b - q) / b` at ¼ Kelly. Minimum thresholds: upside multiple > 2×, max loss < 2% of capital. Bets that don't clear both thresholds are discarded. Position history tracked to prevent overconcentration.

### Market Pulse Engine (market_pulse.py)

425 lines. Rolling deques of tick data per symbol. Realized vol at three timeframes: 5-minute (instant), 60-minute (hourly), 20-day (daily). Regime state machine with hysteresis - 3 consecutive confirmations required before transition to prevent whipsaw. Emergency broadcast within 100ms of confirmed transition. Max 1 broadcast/second/symbol. Zero additional API calls - piggybacks on existing Alpaca WS stream.

Regimes: `COMPRESSED | NORMAL | STRESSED | CRISIS | TRANSITION`

### Black-Scholes (inline in main.py)

Self-contained implementation, ~25 lines. CDF via `math.erf`. Computes call/put price, delta, theta. 19 strikes from 85% to 115% of spot. Bid/ask spread = 5% of theoretical price. Full chain generated in <1ms.

### Strategy Engine (strategy_engine.py)

Real payoff mathematics, no approximations:

- **Covered call**: max profit = premium + (strike - cost basis) × shares. Breakeven = cost basis - premium/share.
- **Iron condor**: 4-leg. Max profit = net credit. Max loss = wing width - net credit. Payoff table across ±20% price range.

Groq narrates each result in plain English after math runs.

---

## V. Deployment

### Frontend - Vercel

```json
{
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `--legacy-peer-deps`: React 19 + Three.js peer dependency conflict bypass
- SPA rewrite: all routes → `index.html` (prevents 404 on direct navigation to `/terminal`)
- Auto-deploys on every `git push origin main`

### Backend - Local PC + Cloudflare Quick Tunnel

```powershell
# 1. Start backend
$env:PYTHONPATH = "C:\Users\user\Documents\AI\finmotion_-premium-financial-intelligence"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Start tunnel
& "$env:TEMP\cloudflared.exe" tunnel --url http://localhost:8000
# → generates https://*.trycloudflare.com

# 3. Update Vercel env var VITE_API_BASE → new tunnel URL → redeploy
```

Cloudflare handles TLS termination. URL is ephemeral - changes every tunnel restart, requiring Vercel env var update + redeploy (~90 seconds).

### What Failed

| Platform | Reason |
|----------|--------|
| Render | Requires paid plan for always-on (free tier sleeps after 15min - kills WebSocket) |
| Railway | OOM killed - NumPy + SciPy + Monte Carlo hits ~400MB; free tier limit ~512MB with insufficient headroom |
| Koyeb | Attempted via Dockerfile; HF Spaces port 7860 conflicts, cold start 8–12s breaks WS |
| Hugging Face Spaces | Latency too high for real-time streaming use case |

---

## VI. Problems Solved

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Alpaca returns null OHLCV | Free plan limitation | 4-tier fallback ending in synthetic GBM anchored to live price |
| Quant signals were random | `random.uniform()` dressed as analysis | Rewrote with real SMA/RSI/Bollinger on actual price history |
| `new URL('#')` runtime crash | Hash-only URL without base | try/catch around constructor |
| WebSocket URL hardcoded | `ws://localhost:8000` everywhere | Derive from `VITE_API_BASE` by replacing protocol prefix |
| `/api/sentiment/` 404 | Endpoint never existed | Reuse `/api/news/{ticker}` which returns sentiment score |
| Portfolio score showing `–/100` | `0` (falsy) vs `null` confusion | Explicit `> 0` check instead of truthiness |
| QuantPulse header overlaps nav | `sticky top-0 z-50` inner header | Remove inner header, replace with non-sticky inline toolbar |
| "Get Access" button invisible | Redesign destroyed landing page gold classes | Dual-namespace: preserve all `gold-*` tokens, add `nv-*` in parallel |
| All-monospace font rejected | IBM Plex Mono looked cold/austere | Inter (UI) + JetBrains Mono (data values only) |
| PYTHONPATH import failures | Nested `backend/backend/` package structure | Explicit `PYTHONPATH` = project root before every server start |

---

## VII. Contributions

This project was built in collaboration with Claude (Anthropic). The user came in as a beginner with a working prototype that had significant gaps across every layer. What followed was full-stack engineering partnership, not task completion.

**Backend engineering**: Diagnosed and architected the Alpaca 4-tier fallback. Rewrote `quant_service.py` from `random.uniform()` noise to real TA calculations with correct Wilder's smoothing for RSI, proper SMA crossover scoring, and Bollinger Band position analysis. Identified and resolved the nested PYTHONPATH import chain. Traced every 404 to its missing endpoint and either created it or redirected. Wrote live price injection into the portfolio analyzer (Alpaca batch snapshot at analysis time, merged before Sharpe/VaR computation).

**Frontend debugging**: Traced and fixed every runtime crash - `new URL('#')` exception, `charAt` on undefined `forecast.direction`, WebSocket URL derivation errors. Refactored `VITE_API_BASE` pattern across every component and service file. Fixed Zustand fetch logic to call endpoints that actually exist.

**Design execution**: Executed three complete design iterations (Meridian / Obsidian Gold / NV system). Identified landing page breakage from the first redesign and architected the dual-namespace solution. Introduced Framer Motion `layoutId` tab animation, 3-zone CSS grid status bar, `.skeleton` loading class, `.nv-slider` range input override, and the 48px nav height math. Applied the NV design system across 10 files in a single session - QuantPulseTerminal, MarketDashboard, EdgeScanner, PortfolioTracker, SimulationLab, MarketPulseDashboard, InstitutionalNav, InstitutionalTerminal, index.css, index.html, tailwind.config.js.

**Strategic judgment**: Pushed back on generic aesthetics. Replaced every empty dark void state with structured placeholders (icon, message, action button). Toned the EdgeScanner green from saturated emerald to NV sage without being asked. Made the "NO DATA" badge prominent (gold-bordered pill) instead of a small amber text fragment. Identified which technical debt was load-bearing and which was safe to remove.

The contributions were not mechanical task completion - they were made with enough understanding of the product's thesis to make judgment calls about design consistency, API design, and quantitative correctness.

---

## VIII. Running Locally

### Prerequisites

- Node.js v18+
- Python 3.12+
- API keys (see [Environment Variables](#x-environment-variables))

### Frontend

```bash
npm install --legacy-peer-deps
npm run dev
# → http://localhost:5173
```

### Backend

```powershell
# Windows PowerShell
$env:PYTHONPATH = "C:\path\to\finmotion_-premium-financial-intelligence"
cd "C:\path\to\finmotion_-premium-financial-intelligence"
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000
```

```bash
# Linux/Mac
export PYTHONPATH="/path/to/finmotion_-premium-financial-intelligence"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend `.env`:
```
VITE_API_BASE=http://localhost:8000
```

---

## IX. API Reference

```
GET  /health                          health check + registry size
GET  /api/quote/{ticker}              single live quote (Alpaca)
GET  /api/quotes?tickers=A,B,C        batch quotes (cache-first)
GET  /api/snapshots?symbols=A,B       Alpaca snapshot batch
GET  /api/bars/{symbol}?days=60       closing prices for TA (4-tier fallback)
GET  /api/candles/{ticker}            OHLCV bars (legacy alias)
GET  /api/forecast/{symbol}           TA ensemble forecast + Groq reasoning
GET  /api/news/{symbol}               Finnhub news + sentiment score
GET  /api/macro                       FRED: fed rate, CPI, yield, GDP
GET  /api/options/chain/{ticker}      Black-Scholes options chain (19 strikes)
GET  /api/options/expirations/{ticker}next 4 monthly expiration dates
GET  /api/strategy/suggest            IV + trend recommendation
GET  /api/pulse/state                 current regime state for all symbols
GET  /api/simulate/{symbol}           poll Monte Carlo result
POST /api/signal                      AI signal {ticker, price, change_pct}
POST /api/intelligence/news           Groq synthesis {query}
POST /api/portfolio/analyze           portfolio metrics {holdings[]}
POST /api/simulate/{symbol}           start Monte Carlo (background task)
POST /api/strategy/covered-call       payoff + Groq narration
POST /api/strategy/iron-condor        payoff + Groq narration
POST /api/watchlist/add               add ticker to registry
POST /api/edge/scan/{symbol}          asymmetric vol edge detection
POST /api/hedge/approve/{timestamp}   approve pending hedge decision
WS   /ws/data-hub                     Alpaca stream → all connected frontends
```

---

## X. Environment Variables

`backend/.env`:

```env
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
GROQ_API_KEY=your_key
FINNHUB_API_KEY=your_key
FRED_API_KEY=your_key
GEMINI_API_KEY=your_key          # optional
```

Frontend (Vercel dashboard or local `.env`):

```env
VITE_API_BASE=https://your-tunnel.trycloudflare.com
```

**Never commit `.env` to git.**

---

## Tech Stack Summary

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Zustand 5, Framer Motion 12, Recharts, Three.js, React Three Fiber |
| Backend | FastAPI, uvicorn, Python 3.12, NumPy, SciPy, Pydantic v2 |
| AI/LLM | Groq (GPT-OSS 120B), optional Gemini 1.5 Flash |
| Market Data | Alpaca Markets (live), Finnhub (news), FRED (macro) |
| Deployment | Vercel (frontend) + Cloudflare Quick Tunnel (backend) |
| Math | Black-Scholes (options), GBM (simulation), Kelly criterion (sizing), Wilder RSI, Bollinger Bands, historical VaR |

---

*Built May 2026. Backend v3.0. Frontend NV design system.*
