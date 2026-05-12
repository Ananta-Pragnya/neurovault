"""
shared_state.py — SimulationStore only.

The SignalBus has been moved entirely to backend.backend.bus.bus.
This file now only manages the Monte Carlo simulation result store.

Import pattern:
    from backend.backend.shared_state import sim_store
    from backend.backend.bus.bus import bus, BusEvent  ← for the bus
"""

import time
from typing import Dict, Any


class SimulationStore:
    """Thread-safe store for async Monte Carlo simulation results."""

    def __init__(self):
        self._results: Dict[str, dict] = {}

    def set(self, symbol: str, result: dict):
        """Alias for set_ready — kept for backward compatibility."""
        self.set_ready(symbol, result)

    def set_ready(self, symbol: str, result: dict):
        self._results[symbol] = {
            "status": "ready",
            "data":   result,
            "ts":     time.time(),
        }

    def set_failed(self, symbol: str, reason: str):
        self._results[symbol] = {
            "status": "failed",
            "reason": reason,
            "ts":     time.time(),
        }

    def get(self, symbol: str) -> Any:
        entry = self._results.get(symbol)
        if not entry:
            return None
        # Expire result after 10 minutes
        if time.time() - entry["ts"] > 600:
            del self._results[symbol]
            return None
        return entry

    def is_pending(self, symbol: str) -> bool:
        return symbol not in self._results


# ── Singleton ─────────────────────────────────────────────────────
sim_store = SimulationStore()

# ── Shared engine references (set by main.py at startup) ──────────
pulse_engine = None
orchestrator = None
