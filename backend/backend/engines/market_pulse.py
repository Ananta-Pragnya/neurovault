"""
MARKET PULSE ENGINE — Real-Time Regime Tracking
===============================================
Continuously monitors market state, detects regime transitions AS THEY HAPPEN,
and broadcasts urgent signals to the frontend before humans can react.

Architecture:
- WebSocket stream from Alpaca → updates every tick
- Rolling calculation window (no DB, all in-memory deques)
- Regime state machine with hysteresis (prevents whipsaw)
- Emergency broadcast on regime TRANSITIONS (not every tick)
- Throttled updates to frontend (max 1/sec) to prevent UI flooding

API Cost: ZERO new calls. Uses existing Alpaca WS stream.
"""

import asyncio
import time
from collections import deque
from dataclasses import dataclass, asdict
from typing import Dict, Optional, Callable
import numpy as np
from enum import Enum


class RegimeState(str, Enum):
    """Market regime states. These trigger different trading modes."""
    UNKNOWN = "unknown"           # Insufficient data
    COMPRESSED = "compressed"     # Vol abnormally low — BUY convexity
    NORMAL = "normal"             # Mean state — selective trading
    STRESSED = "stressed"         # Vol elevated — SELL premium carefully
    CRISIS = "crisis"             # Fat tail event — pure defense
    TRANSITION = "transition"     # Regime changing NOW — halt new trades


@dataclass
class RealtimePulse:
    """
    This is what gets broadcast to the frontend every second.
    Keep it lean — this crosses the wire constantly.
    """
    symbol: str
    timestamp: float

    # Current state
    last_price: float
    regime: RegimeState
    regime_confidence: float     # 0-1, how certain we are

    # Live volatility metrics (annualized)
    realized_vol_instant: float  # last 5min of ticks
    realized_vol_hourly: float   # last hour
    realized_vol_daily: float    # last 20 days
    vol_of_vol: float            # regime instability

    # Microstructure (from tick data)
    bid_ask_spread_bps: float    # liquidity stress indicator
    tick_velocity: float         # trades per minute
    volume_surge_ratio: float    # current vs 20-day average

    # Regime transition flags
    regime_changed: bool         # True if regime just flipped
    regime_age_seconds: float    # time since last transition

    # Risk signals
    tail_risk_score: float       # 0-10, composite of skew + kurtosis
    liquidity_stress: float      # 0-1, from bid-ask + depth
    requires_attention: bool     # True if human should look NOW


class MarketPulseEngine:
    """
    Real-time regime tracker. Processes every tick from Alpaca WS stream,
    maintains rolling calculations, detects regime transitions, and
    broadcasts to frontend via your existing WebSocket hub.
    """

    def __init__(
        self,
        broadcast_callback: Callable,
        symbols: list = None,
    ):
        self.broadcast = broadcast_callback
        self.symbols = symbols or ["SPY", "QQQ", "IWM"]

        # Rolling tick buffers (in-memory, no DB)
        self.tick_buffers: Dict[str, deque] = {
            sym: deque(maxlen=10_000) for sym in self.symbols
        }

        # Price snapshots for bar calculations
        self.minute_bars: Dict[str, deque] = {
            sym: deque(maxlen=1440) for sym in self.symbols  # 24 hours of minute bars
        }

        # Current regime state (mutable)
        self.current_regime: Dict[str, RegimeState] = {
            sym: RegimeState.UNKNOWN for sym in self.symbols
        }
        self.regime_entry_time: Dict[str, float] = {
            sym: time.time() for sym in self.symbols
        }

        # Hysteresis buffers to prevent regime whipsaw
        # A regime must be "confirmed" for 3 consecutive calculations
        self.regime_buffer: Dict[str, deque] = {
            sym: deque(maxlen=3) for sym in self.symbols
        }

        # Volume tracking for surge detection
        self.volume_history: Dict[str, deque] = {
            sym: deque(maxlen=20) for sym in self.symbols  # 20-day volume
        }

        # Broadcast throttle (don't spam frontend)
        self.last_broadcast: Dict[str, float] = {
            sym: 0.0 for sym in self.symbols
        }
        self.broadcast_interval = 1.0  # seconds

        # Emergency broadcast bypass (regime transitions always go through)
        self.last_regime_broadcast: Dict[str, RegimeState] = {
            sym: RegimeState.UNKNOWN for sym in self.symbols
        }

    async def ingest_tick(self, symbol: str, tick_data: dict):
        """
        Called on every tick from Alpaca WS. This is the entry point.

        tick_data = {
            'price': float,
            'size': int,
            'timestamp': float,
            'bid': float,
            'ask': float,
        }
        """
        if symbol not in self.tick_buffers:
            return

        self.tick_buffers[symbol].append({
            'p': tick_data['price'],
            't': tick_data['timestamp'],
            's': tick_data.get('size', 0),
            'b': tick_data.get('bid', tick_data['price']),
            'a': tick_data.get('ask', tick_data['price']),
        })

        await self._maybe_aggregate_minute_bar(symbol)
        await self._maybe_recalculate_regime(symbol)

    async def _maybe_aggregate_minute_bar(self, symbol: str):
        """Aggregate ticks → minute bars. Runs every 60 seconds."""
        ticks = self.tick_buffers[symbol]
        if len(ticks) < 10:
            return

        now = time.time()
        if len(self.minute_bars[symbol]) > 0:
            last_bar_time = self.minute_bars[symbol][-1]['t']
            if now - last_bar_time < 60:
                return

        cutoff = now - 60
        recent_ticks = [t for t in ticks if t['t'] > cutoff]
        if not recent_ticks:
            return

        prices = [t['p'] for t in recent_ticks]
        volumes = [t['s'] for t in recent_ticks]

        bar = {
            't': now,
            'o': prices[0],
            'h': max(prices),
            'l': min(prices),
            'c': prices[-1],
            'v': sum(volumes),
        }
        self.minute_bars[symbol].append(bar)

    async def _maybe_recalculate_regime(self, symbol: str):
        """
        Recalculate regime state every 5 seconds.
        If a regime transition is detected, broadcast IMMEDIATELY.
        """
        now = time.time()

        should_recalc = (
            len(self.minute_bars[symbol]) > 20 and
            (now - self.regime_entry_time[symbol]) > 5.0
        )

        if not should_recalc:
            return

        pulse = await self._calculate_pulse(symbol)

        regime_changed = pulse.regime != self.current_regime[symbol]

        if regime_changed:
            self.current_regime[symbol] = pulse.regime
            self.regime_entry_time[symbol] = now
            pulse.regime_changed = True
            pulse.requires_attention = True

            await self._broadcast_pulse(symbol, pulse, force=True)
        else:
            pulse.regime_changed = False
            await self._broadcast_pulse(symbol, pulse, force=False)

    async def _calculate_pulse(self, symbol: str) -> RealtimePulse:
        """
        Core calculation. Produces a RealtimePulse from rolling buffers.
        """
        bars = list(self.minute_bars[symbol])
        ticks = list(self.tick_buffers[symbol])

        if len(bars) < 20:
            return self._unknown_pulse(symbol)

        closes = np.array([b['c'] for b in bars])
        last_price = closes[-1]

        rv_instant = self._realized_vol(closes[-5:]) if len(closes) >= 5 else 0.0
        rv_hourly = self._realized_vol(closes[-60:]) if len(closes) >= 60 else 0.0
        rv_daily = self._realized_vol(closes[-1440:]) if len(closes) >= 1440 else 0.0

        vov = self._vol_of_vol(closes)

        recent_ticks = ticks[-100:] if len(ticks) >= 100 else ticks
        bid_ask_bps = self._avg_bid_ask_spread(recent_ticks, last_price)
        tick_velocity = len(recent_ticks) / 5.0 if len(recent_ticks) > 0 else 0.0

        current_volume = sum(b['v'] for b in bars[-60:])
        avg_volume = np.mean([b['v'] for b in bars[-1440:]]) * 60 if len(bars) >= 1440 else current_volume
        volume_surge = current_volume / avg_volume if avg_volume > 0 else 1.0

        tail_risk = self._tail_risk_score(closes)

        regime, confidence = self._classify_regime_with_hysteresis(
            symbol=symbol,
            rv_daily=rv_daily,
            vov=vov,
            tail_risk=tail_risk,
        )

        liquidity_stress = np.clip(bid_ask_bps / 10.0, 0.0, 1.0)

        regime_age = time.time() - self.regime_entry_time[symbol]

        requires_attention = (
            regime in [RegimeState.CRISIS, RegimeState.TRANSITION] or
            tail_risk > 7.0 or
            liquidity_stress > 0.7 or
            volume_surge > 3.0
        )

        return RealtimePulse(
            symbol=symbol,
            timestamp=time.time(),
            last_price=float(last_price),
            regime=regime,
            regime_confidence=confidence,
            realized_vol_instant=rv_instant,
            realized_vol_hourly=rv_hourly,
            realized_vol_daily=rv_daily,
            vol_of_vol=vov,
            bid_ask_spread_bps=bid_ask_bps,
            tick_velocity=tick_velocity,
            volume_surge_ratio=volume_surge,
            regime_changed=False,
            regime_age_seconds=regime_age,
            tail_risk_score=tail_risk,
            liquidity_stress=liquidity_stress,
            requires_attention=requires_attention,
        )

    def _realized_vol(self, prices: np.ndarray) -> float:
        """Realized volatility from price series (annualized)."""
        if len(prices) < 2:
            return 0.16
        log_returns = np.diff(np.log(prices))
        return float(np.std(log_returns) * np.sqrt(252 * 1440))

    def _vol_of_vol(self, prices: np.ndarray) -> float:
        """Volatility of volatility — second derivative."""
        if len(prices) < 60:
            return 0.0
        log_returns = np.diff(np.log(prices))
        rolling_vols = []
        window = 10
        for i in range(window, len(log_returns)):
            chunk = log_returns[i - window:i]
            rolling_vols.append(np.std(chunk))
        return float(np.std(rolling_vols)) if len(rolling_vols) > 0 else 0.0

    def _avg_bid_ask_spread(self, ticks: list, price: float) -> float:
        """Average bid-ask spread in basis points."""
        if not ticks or price == 0:
            return 0.0
        spreads = [(t['a'] - t['b']) / price * 10000 for t in ticks if t['a'] > t['b']]
        return float(np.mean(spreads)) if spreads else 0.0

    def _tail_risk_score(self, prices: np.ndarray) -> float:
        """
        Tail risk composite: skew + kurtosis → single 0-10 score.
        > 7 = fat left tail, pay for protection.
        """
        if len(prices) < 30:
            return 5.0
        log_returns = np.diff(np.log(prices))
        mean = np.mean(log_returns)
        std = np.std(log_returns)
        if std == 0:
            return 5.0
        standardized = (log_returns - mean) / std
        skew = float(np.mean(standardized ** 3))
        kurt = float(np.mean(standardized ** 4))

        tail_score = 5.0
        tail_score += max(0, -skew * 2)
        tail_score += max(0, (kurt - 3) * 0.5)
        return float(np.clip(tail_score, 0, 10))

    def _classify_regime_with_hysteresis(
        self,
        symbol: str,
        rv_daily: float,
        vov: float,
        tail_risk: float,
    ) -> tuple:
        """
        Regime classifier with hysteresis to prevent whipsaw.
        A regime must be confirmed 3 times before transition.
        """
        LONG_TERM_VOL = 0.16
        vol_ratio = rv_daily / LONG_TERM_VOL

        if tail_risk > 8.0 or vol_ratio > 2.5:
            raw_regime = RegimeState.CRISIS
        elif vol_ratio > 1.5 and vov > 0.08:
            raw_regime = RegimeState.STRESSED
        elif vol_ratio < 0.7 and vov < 0.03:
            raw_regime = RegimeState.COMPRESSED
        elif 0.8 <= vol_ratio <= 1.3:
            raw_regime = RegimeState.NORMAL
        else:
            raw_regime = RegimeState.TRANSITION

        self.regime_buffer[symbol].append(raw_regime)

        if len(self.regime_buffer[symbol]) < 3:
            return self.current_regime[symbol], 0.5

        recent = list(self.regime_buffer[symbol])
        if recent[0] == recent[1] == recent[2]:
            confirmed_regime = recent[0]
            confidence = 0.9
        else:
            confirmed_regime = self.current_regime[symbol]
            confidence = 0.3

        return confirmed_regime, confidence

    def _unknown_pulse(self, symbol: str) -> RealtimePulse:
        """Fallback when insufficient data."""
        return RealtimePulse(
            symbol=symbol,
            timestamp=time.time(),
            last_price=0.0,
            regime=RegimeState.UNKNOWN,
            regime_confidence=0.0,
            realized_vol_instant=0.0,
            realized_vol_hourly=0.0,
            realized_vol_daily=0.0,
            vol_of_vol=0.0,
            bid_ask_spread_bps=0.0,
            tick_velocity=0.0,
            volume_surge_ratio=1.0,
            regime_changed=False,
            regime_age_seconds=0.0,
            tail_risk_score=5.0,
            liquidity_stress=0.0,
            requires_attention=False,
        )

    async def _broadcast_pulse(self, symbol: str, pulse: RealtimePulse, force: bool = False):
        """Broadcast to frontend via WebSocket. Throttled unless force=True."""
        now = time.time()

        if not force:
            if now - self.last_broadcast[symbol] < self.broadcast_interval:
                return

        self.last_broadcast[symbol] = now

        payload = {
            "type": "market_pulse",
            "data": asdict(pulse),
        }

        await self.broadcast(payload)

        if pulse.regime_changed:
            print(f"[PULSE] {symbol} regime transition: {self.last_regime_broadcast[symbol]} → {pulse.regime}")
            self.last_regime_broadcast[symbol] = pulse.regime

    async def heartbeat_loop(self):
        """
        Background task. Ensures frontend gets updates even if no new ticks.
        """
        while True:
            await asyncio.sleep(5.0)
            for symbol in self.symbols:
                if len(self.minute_bars[symbol]) > 20:
                    pulse = await self._calculate_pulse(symbol)
                    await self._broadcast_pulse(symbol, pulse, force=False)


async def create_pulse_engine(broadcast_fn: Callable, symbols: list) -> MarketPulseEngine:
    """Factory function. Call this from your FastAPI startup."""
    engine = MarketPulseEngine(broadcast_fn, symbols)
    asyncio.create_task(engine.heartbeat_loop())
    return engine
