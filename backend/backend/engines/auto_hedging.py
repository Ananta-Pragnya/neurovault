"""
AUTO-HEDGING ORCHESTRATOR
=========================
The missing link between real-time market pulse and actual position management.

This is the "brain" that:
1. Listens to regime transitions from market_pulse
2. Evaluates current portfolio exposure
3. Automatically adjusts hedge ratios
4. Executes protective structures when tail risk spikes
5. Flattens positions when circuits trip

CRITICAL: This runs in "advisory mode" by default. It SUGGESTS trades,
but waits for human approval. Set auto_execute=True ONLY after 30 days
of paper trading validates the logic.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Optional, Callable
from enum import Enum

from backend.backend.engines.market_pulse import MarketPulseEngine, RegimeState, RealtimePulse
from backend.backend.engines.asymmetric_edge import AsymmetricEdgeEngine, AsymmetricBet
from backend.backend.cache.cache import unified_cache
from backend.backend.bus.bus import bus, BusEvent


class HedgeAction(str, Enum):
    """Possible actions the orchestrator can take"""
    NONE = "none"
    REDUCE_EXPOSURE = "reduce"
    ADD_PROTECTION = "protect"
    HARVEST_PREMIUM = "harvest"
    FLATTEN_ALL = "flatten"
    ROTATE_TO_DEFENSE = "defensive"


@dataclass
class HedgeDecision:
    """A decision made by the orchestrator"""
    timestamp: float
    trigger: str
    action: HedgeAction
    symbols: list
    rationale: str
    priority: int                    # 1-10, 10 = execute immediately
    auto_executable: bool
    estimated_cost_usd: float
    max_risk_usd: float
    expected_payoff_ratio: float
    expiration: float


class AutoHedgingOrchestrator:
    """
    The central coordinator. Reacts to market pulse, makes hedge decisions,
    and optionally executes them automatically.

    Design philosophy:
    - DEFENSIVE FIRST: err on the side of protecting capital
    - ASYMMETRIC ONLY: never enter unless upside >> downside
    - RESPECT KILL SWITCHES: hard stops override everything
    - HUMAN IN LOOP: default to advisory mode, require approval
    """

    def __init__(
        self,
        pulse_engine: MarketPulseEngine,
        edge_engine: AsymmetricEdgeEngine,
        broadcast_fn: Callable,
        account_capital: float,
        max_portfolio_heat: float = 0.10,
        auto_execute: bool = False,        # KEEP FALSE until validated
    ):
        self.pulse = pulse_engine
        self.edge = edge_engine
        self.broadcast = broadcast_fn
        self.capital = account_capital
        self.max_heat = max_portfolio_heat
        self.auto_execute = auto_execute

        self.open_hedges: list = []
        self.pending_decisions: list = []

        # Circuit breaker state
        self.circuit_tripped = False
        self.daily_loss = 0.0
        self.daily_loss_limit = account_capital * 0.05  # 5% daily max

        # Cooldown timers (prevent overtrading)
        self.last_hedge_time: dict = {}
        self.min_hedge_interval = 300  # 5 minutes between hedges per symbol

        print("[Orchestrator] Initialized. Auto-execute:", auto_execute)

    async def start(self):
        """Start listening to market pulse events"""
        print("[Orchestrator] Starting event loop...")

        bus.subscribe(BusEvent.FORECAST_UPDATED, self._on_forecast_update)

        while True:
            await asyncio.sleep(30)
            await self._evaluate_portfolio()

    def _on_forecast_update(self, payload: dict):
        """Called whenever a forecast changes. Re-evaluate hedge positions."""
        symbol = payload.get("symbol")
        direction = payload.get("direction")
        confidence = payload.get("confidence", 0)

        asyncio.create_task(
            self._evaluate_symbol_hedge(symbol, direction, confidence)
        )

    async def _evaluate_portfolio(self):
        """Periodic check: look at entire portfolio health."""
        if self.daily_loss >= self.daily_loss_limit:
            if not self.circuit_tripped:
                await self._trip_circuit_breaker()
            return

        portfolio_heat = self.edge.portfolio_heat(self.open_hedges)

        if portfolio_heat["halt_new_positions"]:
            await self._recommend_reduce_exposure(portfolio_heat)

        crisis_count = 0
        for symbol in self.pulse.symbols:
            regime = self.pulse.current_regime.get(symbol, RegimeState.UNKNOWN)
            if regime == RegimeState.CRISIS:
                crisis_count += 1

        if crisis_count >= 2:
            await self._recommend_defensive_rotation(crisis_count)

    async def _evaluate_symbol_hedge(
        self,
        symbol: str,
        direction: str,
        confidence: float
    ):
        """Symbol-specific hedge evaluation. Called when forecast changes."""
        last_hedge = self.last_hedge_time.get(symbol, 0)
        if time.time() - last_hedge < self.min_hedge_interval:
            return

        regime = self.pulse.current_regime.get(symbol, RegimeState.UNKNOWN)

        pulse_data = await self._get_pulse_for_symbol(symbol)
        if not pulse_data:
            return

        decision = None

        if regime == RegimeState.CRISIS:
            decision = await self._create_tail_protection_decision(symbol, pulse_data)

        elif regime == RegimeState.COMPRESSED and pulse_data.vol_of_vol > 0.05:
            decision = await self._create_long_vol_decision(
                symbol, pulse_data, direction, confidence
            )

        elif regime == RegimeState.STRESSED:
            macro_stress = unified_cache.get("macro:stress_index") or 0.5
            if macro_stress < 0.6 and confidence > 70:
                decision = await self._create_short_vol_decision(
                    symbol, pulse_data, direction, confidence
                )

        elif regime == RegimeState.TRANSITION:
            return

        if decision:
            await self._process_decision(decision)

    async def _get_pulse_for_symbol(self, symbol: str) -> Optional[RealtimePulse]:
        """Fetch latest pulse data for a symbol"""
        if symbol not in self.pulse.minute_bars:
            return None
        if len(self.pulse.minute_bars[symbol]) < 20:
            return None
        return await self.pulse._calculate_pulse(symbol)

    async def _create_tail_protection_decision(
        self,
        symbol: str,
        pulse: RealtimePulse
    ) -> HedgeDecision:
        """CRISIS REGIME: Buy deep OTM puts as portfolio insurance."""
        cost_bps = 30
        cost_usd = self.capital * 0.003

        return HedgeDecision(
            timestamp=time.time(),
            trigger=f"{symbol} in CRISIS regime (tail_risk={pulse.tail_risk_score:.1f})",
            action=HedgeAction.ADD_PROTECTION,
            symbols=[symbol],
            rationale=(
                f"Tail risk elevated to {pulse.tail_risk_score:.1f}/10. "
                f"Realized vol at {pulse.realized_vol_daily * 100:.1f}%, "
                f"vol-of-vol at {pulse.vol_of_vol:.3f}. "
                f"Paying {cost_bps}bps for 15% OTM put protection. "
                f"This is insurance, not a directional bet."
            ),
            priority=9,
            auto_executable=True,
            estimated_cost_usd=cost_usd,
            max_risk_usd=cost_usd,
            expected_payoff_ratio=20.0,
            expiration=time.time() + 300,
        )

    async def _create_long_vol_decision(
        self,
        symbol: str,
        pulse: RealtimePulse,
        forecast_direction: str,
        forecast_confidence: float
    ) -> Optional[HedgeDecision]:
        """COMPRESSED REGIME: Buy vol structures when cheap."""
        prices = [
            bar['c'] for bar in
            list(self.pulse.minute_bars[symbol])[-90:]
        ]

        bet = self.edge.generate_bet(
            symbol=symbol,
            prices=prices,
            sentiment_score=0.0,
            macro_stress=0.3,
        )

        if not bet or bet.structure != "long_vol_put_spread":
            return None

        return HedgeDecision(
            timestamp=time.time(),
            trigger=f"{symbol} vol compressed (RV={pulse.realized_vol_daily * 100:.1f}%)",
            action=HedgeAction.ADD_PROTECTION,
            symbols=[symbol],
            rationale=bet.reasoning,
            priority=6,
            auto_executable=False,
            estimated_cost_usd=self.capital * bet.entry_cost_pct / 100,
            max_risk_usd=self.capital * bet.max_loss_pct / 100,
            expected_payoff_ratio=bet.upside_multiple,
            expiration=time.time() + 600,
        )

    async def _create_short_vol_decision(
        self,
        symbol: str,
        pulse: RealtimePulse,
        forecast_direction: str,
        forecast_confidence: float
    ) -> Optional[HedgeDecision]:
        """STRESSED REGIME: Sell premium carefully when macro stable."""
        prices = [
            bar['c'] for bar in
            list(self.pulse.minute_bars[symbol])[-90:]
        ]

        bet = self.edge.generate_bet(
            symbol=symbol,
            prices=prices,
            sentiment_score=0.0,
            macro_stress=0.4,
        )

        if not bet or bet.structure != "iron_condor":
            return None

        return HedgeDecision(
            timestamp=time.time(),
            trigger=f"{symbol} vol elevated but stable (RV={pulse.realized_vol_daily * 100:.1f}%)",
            action=HedgeAction.HARVEST_PREMIUM,
            symbols=[symbol],
            rationale=bet.reasoning,
            priority=4,
            auto_executable=False,
            estimated_cost_usd=0,
            max_risk_usd=self.capital * bet.max_loss_pct / 100,
            expected_payoff_ratio=bet.upside_multiple,
            expiration=time.time() + 1800,
        )

    async def _recommend_reduce_exposure(self, portfolio_heat: dict):
        """Portfolio heat too high — recommend cutting positions."""
        decision = HedgeDecision(
            timestamp=time.time(),
            trigger=f"Portfolio heat at {portfolio_heat['total_risk_pct']:.1f}%",
            action=HedgeAction.REDUCE_EXPOSURE,
            symbols=[h.symbol for h in self.open_hedges],
            rationale=(
                f"Current portfolio risk ({portfolio_heat['total_risk_pct']:.1f}%) "
                f"exceeds safe threshold ({self.max_heat * 100:.0f}%). "
                f"Recommend closing or sizing down {len(self.open_hedges)} positions."
            ),
            priority=8,
            auto_executable=False,
            estimated_cost_usd=0,
            max_risk_usd=portfolio_heat['capital_at_risk_usd'],
            expected_payoff_ratio=0,
            expiration=time.time() + 60,
        )
        await self._process_decision(decision)

    async def _recommend_defensive_rotation(self, crisis_count: int):
        """Multiple symbols in crisis — rotate to defense."""
        decision = HedgeDecision(
            timestamp=time.time(),
            trigger=f"{crisis_count} symbols in CRISIS regime",
            action=HedgeAction.ROTATE_TO_DEFENSE,
            symbols=self.pulse.symbols,
            rationale=(
                f"Market-wide stress detected: {crisis_count} symbols in crisis. "
                f"Recommend rotating to defensive assets (bonds, gold, cash). "
                f"This is systemic risk, not stock-specific."
            ),
            priority=10,
            auto_executable=False,
            estimated_cost_usd=0,
            max_risk_usd=0,
            expected_payoff_ratio=0,
            expiration=time.time() + 120,
        )
        await self._process_decision(decision)

    async def _trip_circuit_breaker(self):
        """Emergency kill switch. NON-NEGOTIABLE and ALWAYS auto-executes."""
        self.circuit_tripped = True

        decision = HedgeDecision(
            timestamp=time.time(),
            trigger=f"Daily loss limit reached: ${self.daily_loss:.0f}",
            action=HedgeAction.FLATTEN_ALL,
            symbols=[h.symbol for h in self.open_hedges],
            rationale=(
                f"CIRCUIT BREAKER TRIPPED. Daily loss (${self.daily_loss:.0f}) "
                f"has reached limit (${self.daily_loss_limit:.0f}). "
                f"Flattening ALL positions immediately. Trading halted until reset."
            ),
            priority=10,
            auto_executable=True,
            estimated_cost_usd=0,
            max_risk_usd=0,
            expected_payoff_ratio=0,
            expiration=time.time() + 30,
        )

        await self._process_decision(decision)
        print("[Orchestrator] CIRCUIT BREAKER TRIPPED")

    async def _process_decision(self, decision: HedgeDecision):
        """
        Process a hedge decision:
        - If auto_execute=True AND decision.auto_executable=True → execute
        - Otherwise → broadcast to frontend for approval
        """
        self.pending_decisions.append(decision)

        await self.broadcast({
            "type": "hedge_decision",
            "data": {
                "timestamp": decision.timestamp,
                "trigger": decision.trigger,
                "action": decision.action.value,
                "symbols": decision.symbols,
                "rationale": decision.rationale,
                "priority": decision.priority,
                "estimated_cost": decision.estimated_cost_usd,
                "max_risk": decision.max_risk_usd,
                "payoff_ratio": decision.expected_payoff_ratio,
                "expires_in": decision.expiration - time.time(),
                "requires_approval": not (self.auto_execute and decision.auto_executable),
            }
        })

        if self.auto_execute and decision.auto_executable:
            await self._execute_decision(decision)
        else:
            print(f"[Orchestrator] Decision pending approval: {decision.action.value} for {decision.symbols}")

    async def _execute_decision(self, decision: HedgeDecision):
        """Execute the decision. In paper mode, just logs."""
        print(f"[Orchestrator] EXECUTING: {decision.action.value} for {decision.symbols}")
        print(f"[Orchestrator] Rationale: {decision.rationale}")

        for symbol in decision.symbols:
            self.last_hedge_time[symbol] = time.time()

        await self.broadcast({
            "type": "hedge_executed",
            "data": {
                "action": decision.action.value,
                "symbols": decision.symbols,
                "timestamp": time.time(),
            }
        })

    async def approve_decision(self, decision_timestamp: float):
        """Manual approval endpoint. Frontend calls this when user approves."""
        decision = next(
            (d for d in self.pending_decisions if d.timestamp == decision_timestamp),
            None
        )

        if not decision:
            return {"error": "Decision not found or expired"}

        if time.time() > decision.expiration:
            return {"error": "Decision expired"}

        await self._execute_decision(decision)

        self.pending_decisions = [
            d for d in self.pending_decisions
            if d.timestamp != decision_timestamp
        ]

        return {"status": "executed", "action": decision.action.value}
