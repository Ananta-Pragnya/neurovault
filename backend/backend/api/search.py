"""
POST /api/v1/search/ask  — SSE streaming answer with RAG + optional web search.
No auth required (uses default user_id=1 like the rest of the API).
"""

import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.backend.database.db import SessionLocal
from backend.backend.database import models as db_models
from backend.backend.intelligence.web_search import web_search_pipeline
from backend.backend.rag.retriever import retrieve, format_rag_context
from backend.backend.cache.cache import unified_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


def _build_local_context(ticker: str | None) -> str:
    lines = []
    try:
        with SessionLocal() as db:
            if ticker:
                signals = (
                    db.query(db_models.PriceAlert)
                    .filter_by(symbol=ticker, is_active=True)
                    .limit(3)
                    .all()
                )
                if signals:
                    lines.append(f"Active price alerts for {ticker}:")
                    for s in signals:
                        lines.append(
                            f"  {s.direction.upper()} ${s.trigger_price:.2f} "
                            f"(created {s.created_at.strftime('%Y-%m-%d') if s.created_at else 'N/A'})"
                        )

            # Pull cached forecast for context
            if ticker:
                forecast = unified_cache.get(f"forecast:{ticker}")
                if forecast and isinstance(forecast, dict):
                    lines.append(f"\nPlatform forecast for {ticker}:")
                    lines.append(f"  Direction: {forecast.get('direction', 'N/A').upper()}")
                    lines.append(f"  Confidence: {forecast.get('confidence', 0):.0f}%")
                    lines.append(f"  RSI: {forecast.get('rsi', 'N/A')}")
                    if forecast.get("reasoning"):
                        lines.append(f"  Analysis: {forecast['reasoning'][:200]}")

    except Exception as e:
        logger.warning(f"[Search] Local context build failed: {e}")

    return "\n".join(lines)


@router.post("/ask")
async def ask(body: dict):
    """
    Body: { "message": str, "history": [...], "ticker": str|null }
    Returns: text/event-stream
    """
    message = body.get("message", "").strip()
    history = body.get("history", [])[-6:]
    ticker  = (body.get("ticker") or "").upper() or None

    if not message:
        async def _empty():
            yield "data: [DONE]\n\n"
        return StreamingResponse(_empty(), media_type="text/event-stream")

    # Build local platform context
    local_ctx = _build_local_context(ticker)

    # RAG retrieval from vector store (async — uses asyncio.to_thread internally)
    rag_ctx = ""
    try:
        chunks = await retrieve(
            query=message,
            cache=unified_cache,
            source_types=["article", "bar_signal", "web_result"],
            ticker=ticker,
            limit=6,
        )
        rag_ctx = format_rag_context(chunks)
    except Exception as e:
        logger.debug(f"[Search] RAG retrieval skipped: {e}")

    async def event_stream():
        try:
            async for chunk in web_search_pipeline(
                user_message=message,
                chat_history=history,
                local_context=local_ctx,
                rag_context=rag_ctx,
                ticker=ticker,
            ):
                safe = chunk.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception as e:
            logger.error(f"[Search] Stream error: {e}")
            yield f"data: [Error: {e}]\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
