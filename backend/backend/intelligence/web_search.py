"""
Web search pipeline: plan → search → scrape → fuse → stream.
Primary: Serper ($1/1000 queries, Google results — cheapest)
Fallback: Brave ($3/1000 queries, no Google dependency)
Set SEARCH_PROVIDER=serper or brave in .env
"""

import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import AsyncGenerator
from urllib.parse import urlparse

import httpx
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

_anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

SERPER_KEY      = os.getenv("SERPER_API_KEY", "")
BRAVE_KEY       = os.getenv("BRAVE_SEARCH_API_KEY", "")
PROVIDER        = os.getenv("SEARCH_PROVIDER", "serper").lower()
MAX_RESULTS     = int(os.getenv("SEARCH_MAX_RESULTS", "6"))
MAX_TOKENS      = int(os.getenv("SEARCH_MAX_TOKENS", "5000"))


@dataclass
class SearchResult:
    title:   str
    url:     str
    snippet: str
    body:    str = ""
    num:     int = 0


@dataclass
class SearchContext:
    query:        str
    sub_queries:  list
    results:      list
    local_context: str = ""
    rag_context:   str = ""


# ── 1. Query planner ──────────────────────────────────────────────────────────

async def plan_query(
    user_message: str,
    ticker: str | None,
    chat_history: list,
) -> tuple:
    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}"
        for m in chat_history[-4:]
    )
    try:
        resp = await _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=250,
            system="""Query planner for a financial intelligence assistant.
Decide: does this need live web search?
(news/prices/events this week = YES; concepts/history/already-provided data = NO)

Reply ONLY with JSON:
{"needs_search": true/false, "queries": ["q1", "q2"]}
2 queries max. No other text.""",
            messages=[{
                "role": "user",
                "content": (
                    f"History:\n{history_text}\n\n"
                    f"Question: {user_message}"
                    + (f"\nTicker: {ticker}" if ticker else "")
                ),
            }],
        )
        data = json.loads(resp.content[0].text.strip())
        return data.get("queries", [user_message])[:2], data.get("needs_search", True)
    except Exception:
        return [user_message], True


# ── 2. Search providers ───────────────────────────────────────────────────────

async def _serper(query: str, n: int) -> list:
    if not SERPER_KEY:
        return []
    async with httpx.AsyncClient(timeout=8) as http:
        r = await http.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": n, "tbs": "qdr:d"},
        )
        r.raise_for_status()
        data = r.json()
    return [
        SearchResult(title=x.get("title",""), url=x.get("link",""), snippet=x.get("snippet",""))
        for x in data.get("organic", [])[:n]
    ]


async def _brave(query: str, n: int) -> list:
    if not BRAVE_KEY:
        return []
    async with httpx.AsyncClient(timeout=8) as http:
        r = await http.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"Accept": "application/json", "X-Subscription-Token": BRAVE_KEY},
            params={"q": query, "count": n, "freshness": "pd"},
        )
        r.raise_for_status()
        data = r.json()
    return [
        SearchResult(title=x.get("title",""), url=x.get("url",""), snippet=x.get("description",""))
        for x in data.get("web", {}).get("results", [])[:n]
    ]


async def search_web(query: str) -> list:
    try:
        if PROVIDER == "brave":
            results = await _brave(query, MAX_RESULTS)
            if not results and SERPER_KEY:
                results = await _serper(query, MAX_RESULTS)
        else:
            results = await _serper(query, MAX_RESULTS)
            if not results and BRAVE_KEY:
                results = await _brave(query, MAX_RESULTS)
        return results
    except Exception as e:
        logger.warning(f"[Search] {PROVIDER} failed: {e}")
        return []


# ── 3. Page scraper ───────────────────────────────────────────────────────────

async def _scrape(url: str) -> str:
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"},
            timeout=5,
        ) as http:
            r = await http.get(url)
            r.raise_for_status()
            html = r.text
        text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>",  "", text,  flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        return re.sub(r"\s+", " ", text).strip()[:3000]
    except Exception:
        return ""


async def enrich_results(results: list) -> list:
    if not results:
        return results
    bodies = await asyncio.gather(*[_scrape(r.url) for r in results[:4]])
    for r, body in zip(results[:4], bodies):
        r.body = body
    return results


# ── 4. Context fusion ─────────────────────────────────────────────────────────

def fuse_context(results: list, local_context: str, rag_context: str) -> tuple:
    seen: set = set()
    deduped = []
    for r in results:
        domain = urlparse(r.url).netloc
        if domain and domain not in seen:
            seen.add(domain)
            deduped.append(r)

    for i, r in enumerate(deduped):
        r.num = i + 1

    budget = MAX_TOKENS * 4
    blocks = []

    if rag_context:
        blocks.append(rag_context + "\n")
        budget -= len(blocks[-1])

    if local_context:
        blk = f"=== YOUR PLATFORM DATA ===\n{local_context}\n"
        blocks.append(blk)
        budget -= len(blk)

    for r in deduped:
        body = r.body or r.snippet
        blk = f"[{r.num}] {r.title}\nURL: {r.url}\n{body[:1500]}\n"
        if len(blk) > budget:
            break
        blocks.append(blk)
        budget -= len(blk)

    return "\n".join(blocks), deduped


# ── 5. Streaming synthesis ────────────────────────────────────────────────────

async def stream_answer(
    user_message: str,
    context: SearchContext,
    chat_history: list,
) -> AsyncGenerator[str, None]:
    context_block, sources = fuse_context(
        context.results, context.local_context, context.rag_context
    )
    source_list = "\n".join(f"[{s.num}] {s.title} — {s.url}" for s in sources)

    has_web = bool(sources)
    search_note = (
        "You have access to live web search results." if has_web
        else "No live web results available — answer from platform data and knowledge only."
    )

    system = f"""You are a financial and market intelligence assistant. {search_note}

Rules:
1. Answer in clear, direct prose. No bullet-point dumps.
2. Cite web sources inline as [N] matching the source list below.
3. Distinguish platform signals (your own data) from web sources explicitly.
4. If web results are stale or missing, say so.
5. Never fabricate prices or events not in the context.
6. End with a SOURCES section listing only sources you cited.

Context:
{context_block}

Available sources:
{source_list if source_list else "(none)"}"""

    messages = [*chat_history[-6:], {"role": "user", "content": user_message}]

    async with _anthropic.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


# ── 6. Main entry point ───────────────────────────────────────────────────────

async def web_search_pipeline(
    user_message: str,
    chat_history: list,
    local_context: str = "",
    rag_context: str = "",
    ticker: str | None = None,
) -> AsyncGenerator[str, None]:
    sub_queries, needs_search = await plan_query(user_message, ticker, chat_history)

    results = []
    if needs_search:
        all_batches = await asyncio.gather(*[search_web(q) for q in sub_queries])
        seen_urls: set = set()
        for batch in all_batches:
            for r in batch:
                if r.url not in seen_urls:
                    seen_urls.add(r.url)
                    results.append(r)
        results = await enrich_results(results)

    context = SearchContext(
        query=user_message,
        sub_queries=sub_queries,
        results=results,
        local_context=local_context,
        rag_context=rag_context,
    )

    async for chunk in stream_answer(user_message, context, chat_history):
        yield chunk
