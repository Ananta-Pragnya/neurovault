"""
WebSocket Hub — Layer 1 shared data firehose.

FIX 4: Live prices from Alpaca stream now write to unified_cache so that
REST endpoints (/api/portfolio/analyze, /api/simulate, etc.) read live
prices rather than stale snapshots from the 30-second batch daemon.
"""

import asyncio
import json
import logging
import time
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Connection Manager ────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WS client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WS client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        if not self.active_connections:
            return
        dead = set()
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                dead.add(conn)
        for conn in dead:
            self.disconnect(conn)


manager = ConnectionManager()


# ── Shared Data Streamer ──────────────────────────────────────────
async def shared_data_streamer():
    """
    Real-time Alpaca WebSocket firehose.

    FIX 4: Every incoming trade/quote message:
      1. Writes the live price into unified_cache (so REST endpoints see it)
      2. Updates the bus with a MARKET_PRICE signal
      3. Broadcasts the normalized payload to all connected frontend clients
    """
    import backend.backend.shared_state as _shared_state
    from backend.backend.services.alpaca import (
        STOCK_STREAM_URL, CRYPTO_STREAM_URL,
        ALPACA_KEY, ALPACA_SECRET, normalize_symbol,
        NAME_MAPPING,
    )
    from backend.backend.cache.cache import unified_cache
    from backend.backend.bus.bus import bus, BusEvent
    import websockets

    stock_symbols  = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN", "META", "SPY", "QQQ"]
    crypto_symbols = ["BTC/USD", "ETH/USD", "SOL/USD"]

    async def alpaca_listener(url: str, market: str, symbols: list):
        """Persistent listener with automatic reconnect on any error."""
        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    # 1. Authenticate
                    await ws.send(json.dumps({
                        "action": "auth",
                        "key":    ALPACA_KEY,
                        "secret": ALPACA_SECRET,
                    }))
                    auth_raw = await ws.recv()
                    logger.info(f"[WS/{market}] Auth: {auth_raw[:120]}")

                    # 2. Subscribe
                    clean = [normalize_symbol(s, market) for s in symbols]
                    await ws.send(json.dumps({
                        "action": "subscribe",
                        "trades": clean,
                        "quotes": clean,
                    }))

                    # 3. Listen
                    async for raw in ws:
                        messages = json.loads(raw)
                        if not isinstance(messages, list):
                            continue

                        for msg in messages:
                            msg_type = msg.get("T")
                            if msg_type not in ("t", "q"):
                                continue  # skip auth/subscription acks

                            symbol = msg.get("S", "")
                            # Trade → use 'p'; Quote → use ask price 'ap'
                            price  = msg.get("p") or msg.get("ap")

                            if not symbol or price is None:
                                continue

                            # ── FIX 4: Write to unified_cache ────────────────
                            # Merge with any existing snapshot so we don't lose
                            # fields written by the 30-second batch daemon.
                            existing = unified_cache.get(symbol) or {}
                            existing.update({
                                "ticker":      symbol,
                                "name":        NAME_MAPPING.get(symbol, symbol),
                                "price":       float(price),
                                "timestamp":   msg.get("t", ""),
                                "provider":    "alpaca_ws",
                            })
                            unified_cache.set(symbol, existing)

                            # ── Publish to Signal Bus ─────────────────────────
                            bus.publish(BusEvent.MARKET_PRICE, {
                                "symbol": symbol,
                                "price":  float(price),
                            })

                            # ── Feed to pulse engine (trade ticks only) ────────
                            if msg_type == "t" and market == "stock":
                                _pe = _shared_state.pulse_engine
                                if _pe and symbol in _pe.symbols:
                                    try:
                                        await _pe.ingest_tick(symbol, {
                                            'price':     float(price),
                                            'size':      msg.get('s', 0),
                                            'timestamp': msg.get('t', time.time()),
                                            'bid':       msg.get('bp', float(price)),
                                            'ask':       msg.get('ap', float(price)),
                                        })
                                    except Exception as _pe_err:
                                        logger.debug(f"[Pulse] ingest error: {_pe_err}")

                            # ── Broadcast normalized payload to frontend ───────
                            broadcast_payload = [{
                                "symbol":    symbol,
                                "price":     float(price),
                                "timestamp": msg.get("t"),
                                "type":      "trade" if msg_type == "t" else "quote",
                            }]
                            await manager.broadcast(json.dumps(broadcast_payload))

            except Exception as e:
                logger.error(f"[WS/{market}] Error: {e}. Reconnecting in 5s…")
                await asyncio.sleep(5)

    # Launch stock and crypto listeners concurrently
    await asyncio.gather(
        alpaca_listener(STOCK_STREAM_URL,  "stock",  stock_symbols),
        alpaca_listener(CRYPTO_STREAM_URL, "crypto", crypto_symbols),
    )


# ── WebSocket Endpoint ────────────────────────────────────────────
@router.websocket("/ws/data-hub")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; frontend doesn't need to send messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS endpoint error: {e}")
        manager.disconnect(websocket)
