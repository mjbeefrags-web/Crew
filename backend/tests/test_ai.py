import pytest

from app.ai.advisor import advise, retrieve, tool_manifest
from app.core.config import Settings
from tests.test_api import create_user


def test_local_rag_advisor_needs_no_credentials():
    settings = Settings(_env_file=None, ai_provider="local")
    result = advise(
        settings,
        {
            "question": "what should we restock",
            "signals": {
                "kpis": {
                    "lowStockSkus": 4,
                    "outOfStockSkus": 2,
                    "conversionProxy": 0.21,
                    "customers": 50,
                    "repeatCustomers": 4,
                }
            },
        },
    )
    assert result["provider"] == "local-rag"
    assert result["recommendations"]
    assert result["sources"]
    titles = {item["title"] for item in result["recommendations"]}
    assert any("Replenish" in title for title in titles)
    assert any("product page" in title for title in titles)


def test_retrieval_and_mcp_manifest():
    sources = retrieve("inventory stock reorder", limit=2)
    assert sources and sources[0]["title"]
    manifest = {tool["name"] for tool in tool_manifest()}
    assert {"crewww_advise", "crewww_rag_search"} <= manifest


@pytest.mark.asyncio
async def test_ai_endpoints_are_admin_only(client):
    assert (await client.get("/api/v1/admin/ai/tools")).status_code == 401
    _, token = await create_user(client, role="admin", email="ai-admin@example.test")
    headers = {"Authorization": f"Bearer {token}"}
    tools = await client.get("/api/v1/admin/ai/tools", headers=headers)
    assert tools.status_code == 200
    assert "crewww_advise" in {tool["name"] for tool in tools.json()["tools"]}
    advice = await client.post(
        "/api/v1/admin/ai/advise",
        json={"question": "next move", "signals": {"kpis": {"lowStockSkus": 3}}},
        headers=headers,
    )
    assert advice.status_code == 200
    assert advice.json()["recommendations"][0]["priority"] in {"high", "medium", "low"}
