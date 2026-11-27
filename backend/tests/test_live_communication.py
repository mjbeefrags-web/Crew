"""Live smoke tests for the deployed service boundaries.

These tests only run when ``LIVE_API_URL`` is set. They verify the real
Cloudflare -> Railway -> Neon/Upstash path, plus the CORS allowlist that makes
the browser call legal.
"""

import os
import re

import httpx
import pytest

LIVE_API_URL = os.getenv("LIVE_API_URL", "").rstrip("/")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "").rstrip("/")
FRONTEND_URL = os.getenv("LIVE_FRONTEND_URL", FRONTEND_ORIGIN).rstrip("/")
ADMIN_EMAIL = os.getenv("LIVE_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("LIVE_ADMIN_PASSWORD", "")

pytestmark = pytest.mark.skipif(
    not LIVE_API_URL, reason="LIVE_API_URL is not set; skipping live tests"
)


async def test_live_api_health_and_catalog() -> None:
    """Railway API responds and can read the Neon-backed catalog."""
    async with httpx.AsyncClient(base_url=LIVE_API_URL, timeout=20) as client:
        ready = await client.get("/api/ready")
        assert ready.status_code == 200
        assert ready.json() == {"status": "ready"}

        products = await client.get("/api/v1/products", params={"pageSize": 1})
        assert products.status_code == 200
        page = products.json()
        assert {"items", "total", "page", "pageSize"} <= set(page)
        assert isinstance(page["items"], list)
        assert page["total"] >= 0


async def test_live_psychedelic_add_to_bag_accepts_slug() -> None:
    """The exact drop-page product can be added using its canonical slug."""
    payload = {
        "product_id": "mind-02-psychedelic-hoodie",
        "size": "M",
        "color": "Deep Red",
        "quantity": 1,
    }
    async with httpx.AsyncClient(base_url=LIVE_API_URL, timeout=20) as client:
        response = await client.post("/api/v1/cart/items", json=payload)

    assert response.status_code == 200, response.text
    cart = response.json()
    assert any(item["sku"] == "CREW-PM02-DEEPRED-M" for item in cart["items"])


async def test_live_cors_allows_cloudflare_origin() -> None:
    """The browser origin is explicitly allowed to call the API."""
    if not FRONTEND_ORIGIN:
        pytest.skip("FRONTEND_ORIGIN is not set")

    async with httpx.AsyncClient(base_url=LIVE_API_URL, timeout=20) as client:
        response = await client.options(
            "/api/v1/products",
            headers={
                "Origin": FRONTEND_ORIGIN,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code in {200, 204}
    assert response.headers.get("access-control-allow-origin") == FRONTEND_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"


async def test_live_admin_login_when_credentials_provided() -> None:
    """Optional check that auth reaches Neon through the deployed API."""
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        pytest.skip("LIVE_ADMIN_EMAIL/LIVE_ADMIN_PASSWORD are not set")

    async with httpx.AsyncClient(base_url=LIVE_API_URL, timeout=20) as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


async def test_live_frontend_bundle_points_at_api() -> None:
    """Cloudflare serves the SPA and its baked API URL matches the live API."""
    if not FRONTEND_URL:
        pytest.skip("FRONTEND_URL is not set")

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        html_response = await client.get(FRONTEND_URL)
        assert html_response.status_code == 200
        html = html_response.text
        assert '<div id="root"></div>' in html

        assets = list(dict.fromkeys(re.findall(r"/assets/[A-Za-z0-9_.-]+\.js", html)))
        assert assets, "could not find Vite bundles in the SPA HTML"

        found_api_url = False
        for asset in assets:
            bundle_response = await client.get(f"{FRONTEND_URL}{asset}")
            assert bundle_response.status_code == 200
            if LIVE_API_URL in bundle_response.text:
                found_api_url = True
                break

        assert found_api_url, f"no served bundle points at {LIVE_API_URL}"
