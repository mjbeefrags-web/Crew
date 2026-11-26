"""Retrieval-augmented, provider-agnostic advisor for the owner dashboard.

The local provider is deterministic and needs no credentials. An
OpenAI-compatible provider can be enabled with AI_PROVIDER=openai,
AI_API_URL and AI_API_KEY; retrieval and recommendations still degrade to the
local provider if the remote call fails.
"""

from __future__ import annotations

import json
import re
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import Settings

_CORPUS = Path(__file__).with_name("corpus.md")
_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is",
    "it", "of", "on", "or", "that", "the", "to", "with", "we", "you", "your",
}


def _tokens(text: str) -> list[str]:
    return [
        word
        for word in re.findall(r"[a-z0-9]+", text.lower())
        if len(word) > 2 and word not in _STOPWORDS
    ]


@lru_cache(maxsize=1)
def _chunks() -> list[dict[str, str]]:
    text = _CORPUS.read_text(encoding="utf-8")
    sections = re.split(r"^##\s+", text, flags=re.MULTILINE)[1:]
    return [
        {
            "title": section.splitlines()[0].strip(),
            "body": "\n".join(section.splitlines()[1:]).strip(),
        }
        for section in sections
    ]


@lru_cache(maxsize=128)
def retrieve(query: str, limit: int = 3) -> list[dict[str, str]]:
    """BM25-like retrieval over the bundled operating playbook."""
    query_tokens = set(_tokens(query))
    if not query_tokens:
        query_tokens = {"stock", "conversion", "drops"}
    chunks = _chunks()
    chunk_tokens = {chunk["title"]: set(_tokens(chunk["body"])) for chunk in chunks}
    document_frequency = {
        token: sum(1 for tokens in chunk_tokens.values() if token in tokens)
        for token in query_tokens
    }
    scored = []
    for chunk in chunks:
        body_tokens = _tokens(chunk["body"])
        body_set = chunk_tokens[chunk["title"]]
        score = sum(
            body_tokens.count(token) * (1 + 4 / (1 + document_frequency[token]))
            for token in query_tokens
            if token in body_set
        )
        if score:
            scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "title": chunk["title"],
            "excerpt": chunk["body"][:420],
        }
        for _, chunk in scored[:limit]
    ]


def _num(signals: dict[str, Any], *path: str, default: float = 0) -> float:
    node: Any = signals
    for key in path:
        if not isinstance(node, dict):
            return default
        node = node.get(key)
    return float(node) if isinstance(node, (int, float)) else default


def _rows(signals: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = signals.get(key)
    return [row for row in value if isinstance(row, dict)] if isinstance(value, list) else []


def _recommend(signals: dict[str, Any], sources: list[dict[str, str]]) -> list[dict[str, str]]:
    kpis = signals.get("kpis") if isinstance(signals.get("kpis"), dict) else {}
    combined = {**signals, **kpis}
    low = _num(combined, "lowStockSkus")
    out = _num(combined, "outOfStockSkus")
    conversion = _num(combined, "conversionProxy")
    repeats = _num(combined, "repeatCustomers")
    customers = _num(combined, "customers")
    inventory_value = _num(combined, "inventoryValueMinor")
    items = _rows(signals, "products")
    drops = _rows(signals, "drops")
    searches = _rows(signals, "searches")

    recommendations: list[dict[str, str]] = []
    if low or out:
        recommendations.append(
            {
                "title": "Replenish before the next drop lands",
                "detail": (
                    f"{int(low)} low-stock and {int(out)} sold-out SKUs. Reorder the "
                    "best-selling size/colour pairs first and keep one shared size curve "
                    "per collection so real stock can be allocated cleanly."
                ),
                "priority": "high",
                "horizon": "This week",
                "evidence": "Stock levels from the current admin snapshot",
            }
        )
    if conversion and conversion < 0.35:
        recommendations.append(
            {
                "title": "Tighten the product page before buying traffic",
                "detail": (
                    "The conversion proxy is below 35%. Lead with approved product photos, "
                    "make size selection explicit, and surface delivery/returns terms near "
                    "the add-to-bag button rather than higher up the page."
                ),
                "priority": "high",
                "horizon": "Next sprint",
                "evidence": f"conversionProxy={conversion:.2f}",
            }
        )
    if customers and repeats / max(customers, 1) < 0.2:
        recommendations.append(
            {
                "title": "Turn first buyers into a crew",
                "detail": (
                    "Repeat customers are under 20% of the base. Schedule a post-purchase "
                    "lookbook follow-up and a restock alert for the strongest collection "
                    "before spending on new acquisition."
                ),
                "priority": "medium",
                "horizon": "2–4 weeks",
                "evidence": f"{int(repeats)} repeat / {int(customers)} customers",
            }
        )
    if items:
        leader = items[0]
        recommendations.append(
            {
                "title": f"Double down on {leader.get('label', 'the leading product')}",
                "detail": (
                    "This piece leads revenue. Give it the next campaign slot, keep its "
                    "core sizes in stock, and use its colour/size mix as the template for "
                    "the next drop rather than guessing a new curve."
                ),
                "priority": "medium",
                "horizon": "Next drop",
                "evidence": f"top product revenue={leader.get('revenueMinor', 0)} minor units",
            }
        )
    if drops:
        weakest = min(drops, key=lambda row: _num(row, "units", default=0))
        if _num(weakest, "units") == 0:
            recommendations.append(
                {
                    "title": f"Diagnose {weakest.get('label', 'the quiet drop')}",
                    "detail": (
                        "The drop has no attributed units. Check whether its products are "
                        "active, photography is approved, and the world destination links "
                        "to purchasable SKUs before writing it off creatively."
                    ),
                    "priority": "medium",
                    "horizon": "Next review",
                    "evidence": "drop units=0 in the current range",
                }
            )
    if searches:
        query = str(searches[0].get("label", ""))
        recommendations.append(
            {
                "title": f"Merchandise for “{query}”",
                "detail": (
                    "This is the most-searched term. Add it as a collection alias or "
                    "promote the closest product family; unmatched searches are demand "
                    "signals, not failed users."
                ),
                "priority": "low",
                "horizon": "Next content pass",
                "evidence": f"top search={query}",
            }
        )
    if inventory_value > 0 and not recommendations:
        recommendations.append(
            {
                "title": "Watch inventory cash",
                "detail": (
                    "Inventory value is meaningful while sell-through is still being "
                    "established. Review slow movers before committing to the next buy."
                ),
                "priority": "low",
                "horizon": "Monthly",
                "evidence": f"inventoryValueMinor={int(inventory_value)}",
            }
        )
    if not recommendations:
        recommendations.append(
            {
                "title": "Instrument the next drop",
                "detail": (
                    "There is not enough signal yet. Enable drop and product events so the "
                    "advisor can separate views, add-to-bag and purchases for each drop."
                ),
                "priority": "low",
                "horizon": "Before launch",
                "evidence": "limited analytics in current range",
            }
        )
    if sources:
        recommendations[-1]["evidence"] += (
            f" · RAG: {sources[0]['title']}"
        )
    return recommendations


def _remote_recommendations(
    settings: Settings, signals: dict[str, Any], sources: list[dict[str, str]]
) -> list[dict[str, str]] | None:
    api_key = settings.ai_api_key.get_secret_value() if settings.ai_api_key else ""
    if settings.ai_provider != "openai" or not settings.ai_api_url or not api_key:
        return None
    prompt = json.dumps(
        {
            "instruction": (
                "Return a JSON array of 3-5 recommendations with keys title, detail, "
                "priority (high|medium|low), horizon and evidence. Use only the supplied "
                "signals and retrieved playbook excerpts. Be specific and operational."
            ),
            "signals": signals,
            "retrieved_context": sources,
        }
    )
    request = urllib.request.Request(
        settings.ai_api_url,
        data=json.dumps(
            {
                "model": settings.ai_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            }
        ).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
        content = payload["choices"][0]["message"]["content"]
        items = json.loads(content)
        if not isinstance(items, list):
            return None
        return [
            item
            for item in items
            if isinstance(item, dict) and {"title", "detail", "priority"} <= item.keys()
        ][:5] or None
    except Exception:
        return None


def advise(settings: Settings, payload: dict[str, Any]) -> dict[str, Any]:
    signals = payload.get("signals") if isinstance(payload.get("signals"), dict) else {}
    question = str(payload.get("question") or "")
    query = " ".join(
        [question, str(signals.get("rangeDays", "")), "stock conversion drops retention"]
    )
    sources = retrieve(query)
    recommendations = _remote_recommendations(settings, signals, sources)
    provider = "local-rag"
    if recommendations is None:
        recommendations = _recommend(signals, sources)
    else:
        provider = settings.ai_model
    top = recommendations[0]["title"]
    return {
        "provider": provider,
        "summary": f"Next best move: {top}.",
        "recommendations": recommendations,
        "sources": sources,
    }


def tool_manifest() -> list[dict[str, Any]]:
    """MCP-compatible tool definitions exposed over HTTP for an MCP bridge."""
    return [
        {
            "name": "crewww_advise",
            "description": (
                "Return prioritized next moves from dashboard signals and the RAG playbook."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "Optional owner question."},
                    "signals": {
                        "type": "object",
                        "description": "Admin KPI and breakdown snapshot.",
                    },
                },
                "required": ["signals"],
            },
        },
        {
            "name": "crewww_rag_search",
            "description": "Search the bundled CREWWW operating playbook.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 8},
                },
                "required": ["query"],
            },
        },
    ]
