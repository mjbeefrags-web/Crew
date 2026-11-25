"""Contract tests: the HTTP payloads must keep matching the frontend types.

These assertions mirror `src/domain/product.ts`. If a field is renamed in the
API, this test fails before the storefront silently renders blanks.
"""

from tests.test_api import create_product

PRODUCT_KEYS = {
    "id",
    "slug",
    "name",
    "category",
    "price",
    "currency",
    "audience",
    "color",
    "sizes",
    "imageUrl",
    "isNew",
    "collection",
    "description",
    "available",
    "bestSeller",
    "colors",
    "specifications",
    "salePrice",
    "fit",
    "wash",
    "ageBand",
    "galleryUrls",
    "isPreviewData",
    "variants",
}

VARIANT_KEYS = {
    "id",
    "sku",
    "size",
    "color",
    "colorValue",
    "price",
    "salePrice",
    "stockQuantity",
}

PAGE_KEYS = {"items", "total", "page", "pageSize"}


async def test_product_list_payload_matches_frontend_contract(client):
    await create_product(client)

    response = await client.get("/api/v1/products")
    assert response.status_code == 200
    page = response.json()

    assert set(page) == PAGE_KEYS
    assert page["total"] == 1
    assert page["page"] == 1
    assert page["pageSize"] == 24

    item = page["items"][0]
    missing = PRODUCT_KEYS - set(item)
    assert not missing, f"product payload is missing frontend fields: {sorted(missing)}"
    assert set(item["specifications"]) <= {"material", "fit", "care", "details"}
    assert item["currency"] == "USD"
    assert isinstance(item["price"], (int, float))
    assert item["price"] >= 0

    variant = item["variants"][0]
    missing_variant = VARIANT_KEYS - set(variant)
    assert not missing_variant, f"variant payload is missing fields: {sorted(missing_variant)}"
    assert isinstance(variant["stockQuantity"], int)


async def test_product_detail_and_search_filters_keep_the_contract(client):
    await create_product(client)

    detail = await client.get("/api/v1/products/test-hoodie")
    assert detail.status_code == 200
    assert PRODUCT_KEYS <= set(detail.json())

    for query in ("term=hood", "category=hoodies", "color=black", "size=M"):
        response = await client.get(f"/api/v1/products?{query}")
        assert response.status_code == 200, query
        assert response.json()["total"] == 1, query


async def test_error_and_system_payloads_keep_their_contract(client):
    missing = await client.get("/api/v1/products/does-not-exist")
    assert missing.status_code == 404
    detail = missing.json()["detail"]
    assert detail["code"] == "product_not_found"
    assert detail["message"]

    health = await client.get("/api/health")
    assert health.status_code == 200
    assert health.json() == {"status": "healthy", "service": "crewww-api"}
    assert health.headers["X-Request-ID"]

    ready = await client.get("/api/ready")
    assert ready.status_code == 200
    assert ready.json() == {"status": "ready"}

    validation = await client.get("/api/v1/products?page=0")
    assert validation.status_code == 422
    assert isinstance(validation.json()["detail"], list)
    assert {"loc", "msg", "type"} <= set(validation.json()["detail"][0])
