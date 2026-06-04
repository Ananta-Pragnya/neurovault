"""
SQLite vector store — embeddings as JSON text, cosine similarity via numpy.
No Postgres/pgvector required. Fast enough for < 100k vectors.
"""

import json
import logging
from datetime import datetime

import numpy as np

from backend.backend.database.db import SessionLocal
from backend.backend.database.models import Embedding

logger = logging.getLogger(__name__)


def _cosine(a: list, b: list) -> float:
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom < 1e-9:
        return 0.0
    return float(np.dot(va, vb) / denom)


def upsert_embedding(
    source_type: str,
    source_id: str,
    content: str,
    embedding: list,
    ticker: str | None = None,
) -> None:
    if not embedding:
        return  # skip if no Voyage key configured
    with SessionLocal() as db:
        existing = (
            db.query(Embedding)
            .filter_by(source_type=source_type, source_id=str(source_id))
            .first()
        )
        if existing:
            existing.content = content[:2000]
            existing.embedding_json = json.dumps(embedding)
            existing.ticker = ticker
            existing.created_at = datetime.utcnow()
        else:
            db.add(Embedding(
                source_type=source_type,
                source_id=str(source_id),
                content=content[:2000],
                embedding_json=json.dumps(embedding),
                ticker=ticker,
            ))
        db.commit()


def similarity_search(
    query_embedding: list,
    source_types: list | None = None,
    ticker: str | None = None,
    limit: int = 8,
    min_score: float = 0.65,
    scan_limit: int = 500,
) -> list:
    """
    Load recent embeddings from SQLite, score each with cosine similarity,
    return top-N above min_score.
    """
    if not query_embedding:
        return []

    with SessionLocal() as db:
        q = db.query(Embedding).order_by(Embedding.created_at.desc())
        if source_types:
            q = q.filter(Embedding.source_type.in_(source_types))
        if ticker:
            q = q.filter(Embedding.ticker == ticker)
        rows = q.limit(scan_limit).all()

    scored = []
    for row in rows:
        try:
            vec = json.loads(row.embedding_json)
            score = _cosine(query_embedding, vec)
            if score >= min_score:
                scored.append((score, row))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "source_type": row.source_type,
            "source_id":   row.source_id,
            "content":     row.content,
            "score":       round(score, 3),
        }
        for score, row in scored[:limit]
    ]


def compute_novelty(
    embedding: list,
    source_type: str,
    ticker: str | None = None,
    window: int = 50,
) -> float:
    """1 - max_cosine_similarity against recent window. 1.0 = fully novel."""
    if not embedding:
        return 1.0

    with SessionLocal() as db:
        q = (
            db.query(Embedding)
            .filter_by(source_type=source_type)
            .order_by(Embedding.created_at.desc())
        )
        if ticker:
            q = q.filter(Embedding.ticker == ticker)
        rows = q.limit(window).all()

    if not rows:
        return 1.0

    sims = []
    for row in rows:
        try:
            vec = json.loads(row.embedding_json)
            sims.append(_cosine(embedding, vec))
        except Exception:
            continue

    return round(1.0 - max(sims), 3) if sims else 1.0
