"""
Unified Signal Bus — environment-switching.
  • Dev / paper trade: InMemoryBus (zero dependencies, ring buffer)
  • Production:        RedisBus  (Redis pub/sub with in-memory fallback)

Import pattern everywhere:
    from backend.backend.bus.bus import bus, BusEvent
"""

import os
import time
from collections import deque
from enum import Enum
from typing import Callable, Dict, List, Any


# ── Typed Events ──────────────────────────────────────────────────
class BusEvent(str, Enum):
    SENTIMENT_BEARISH = "sentiment.bearish"
    SENTIMENT_BULLISH = "sentiment.bullish"
    FORECAST_UPDATED  = "forecast.updated"
    ANOMALY_DETECTED  = "anomaly.detected"
    PORTFOLIO_CHANGED = "portfolio.changed"
    SIMULATION_READY  = "simulation.ready"
    SIMULATION_FAILED = "simulation.failed"
    MARKET_PRICE      = "market.price"


# ── In-Memory Bus (dev / paper) ───────────────────────────────────
class InMemoryBus:
    """Zero-dependency ring-buffer bus for dev and paper-trading mode."""

    def __init__(self, maxlen: int = 500):
        self._signals: deque = deque(maxlen=maxlen)
        self._subscribers: Dict[str, List[Callable]] = {}

    def publish(self, event: BusEvent, payload: dict):
        entry = {"event": event.value, "payload": payload, "ts": time.time()}
        self._signals.append(entry)
        for fn in self._subscribers.get(event.value, []):
            try:
                fn(payload)
            except Exception as e:
                print(f"[Bus] Subscriber error on {event}: {e}")

    def subscribe(self, event: BusEvent, fn: Callable):
        """Register a subscriber. Synchronous — also awaitable (returns None coroutine)."""
        self._subscribers.setdefault(event.value, []).append(fn)

    # Async alias so callers can do: await bus.subscribe(...)
    async def asubscribe(self, event: BusEvent, fn: Callable):
        self.subscribe(event, fn)

    def replay(self, event: BusEvent, since: float) -> List[dict]:
        return [
            s for s in self._signals
            if s["event"] == event.value and s["ts"] > since
        ]

    def latest(self, event: BusEvent) -> dict | None:
        matches = [s for s in self._signals if s["event"] == event.value]
        return matches[-1] if matches else None


# ── Redis Bus (production) ────────────────────────────────────────
class RedisBus:
    """
    Redis pub/sub for multi-process production deployments.
    Falls back to InMemoryBus transparently on connection loss.
    """

    def __init__(self):
        import redis as _redis  # lazy import — not needed in dev
        self._r = _redis.Redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            decode_responses=True,
            socket_connect_timeout=2,
        )
        self._fallback = InMemoryBus()

    def publish(self, event: BusEvent, payload: dict):
        import json
        try:
            self._r.publish(event.value, json.dumps(payload))
        except Exception:
            # Seamlessly degrade to in-memory on Redis outage
            self._fallback.publish(event, payload)

    def subscribe(self, event: BusEvent, fn: Callable):
        # Local subscribers always registered on fallback so they
        # survive Redis reconnects without re-subscribing.
        self._fallback.subscribe(event, fn)

    async def asubscribe(self, event: BusEvent, fn: Callable):
        self.subscribe(event, fn)

    def replay(self, event: BusEvent, since: float) -> List[dict]:
        return self._fallback.replay(event, since)

    def latest(self, event: BusEvent) -> dict | None:
        return self._fallback.latest(event)


# ── Factory ───────────────────────────────────────────────────────
def _create_bus() -> InMemoryBus | RedisBus:
    if os.getenv("REDIS_URL"):
        try:
            b = RedisBus()
            # Quick ping to validate the connection before committing
            b._r.ping()
            print("[Bus] Connected to Redis at", os.getenv("REDIS_URL"))
            return b
        except Exception as e:
            print(f"[Bus] Redis unavailable ({e}) — falling back to in-memory bus")
    return InMemoryBus()


# ── Singleton ─────────────────────────────────────────────────────
# This is the ONLY instance of the bus across the entire backend.
# Import it everywhere with:  from backend.backend.bus.bus import bus, BusEvent
bus: InMemoryBus | RedisBus = _create_bus()
