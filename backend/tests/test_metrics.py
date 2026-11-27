import pytest

from tests.test_api import create_product, create_user


@pytest.mark.asyncio
async def test_admin_metrics_exposes_formulas_and_server_computed_kpis(client):
    assert (await client.get("/api/v1/admin/metrics")).status_code == 401
    _, token = await create_user(client, role="admin", email="metrics-admin@example.test")
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/admin/metrics?days=7", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "server"
    assert body["days"] == 7
    assert "aov_minor" in body["kpis"]
    assert "sell_through" in body["kpis"]
    assert "gross_margin_proxy" in body["kpis"]
    assert "AOV = net_revenue_minor / paid_orders" not in body["formulas"].values()
    assert "net_revenue_minor / paid_orders" in body["formulas"]["aov_minor"]
    assert len(body["trend"]) == 7
    assert "moving_average_7d" in body["trend"][0]


@pytest.mark.asyncio
async def test_archive_product_removes_it_from_active_sale(client):
    product_id, _ = await create_product(client)
    _, token = await create_user(client, role="admin", email="archive-admin@example.test")
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.delete(f"/api/v1/admin/products/{product_id}", headers=headers)
    assert response.status_code == 204
    listed = await client.get("/api/v1/products")
    assert all(item["id"] != str(product_id) for item in listed.json()["items"])
