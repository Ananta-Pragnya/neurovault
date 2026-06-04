"""
RAG retriever — embed query → similarity search → formatted context block.
Called by the search endpoint before Claude synthesis.
"""

from backend.backend.nlp.pipeline import embed
from backend.backend.rag.store import similarity_search


async def retrieve(
    query: str,
    cache=None,
    source_types: list | None = None,
    ticker: str | None = None,
    limit: int = 8,
) -> list:
    query_embedding = await embed(query, cache)
    if not query_embedding:
        return []
    return similarity_search(
        query_embedding=query_embedding,
        source_types=source_types,
        ticker=ticker,
        limit=limit,
    )


def format_rag_context(chunks: list, max_chars: int = 3000) -> str:
    if not chunks:
        return ""
    lines = ["=== PLATFORM KNOWLEDGE (ranked by relevance) ==="]
    budget = max_chars
    for i, chunk in enumerate(chunks, 1):
        block = (
            f"[{i}] source={chunk['source_type']} "
            f"relevance={chunk['score']:.2f}\n"
            f"{chunk['content']}\n"
        )
        if len(block) > budget:
            break
        lines.append(block)
        budget -= len(block)
    return "\n".join(lines)
