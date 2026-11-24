import pytest
from pydantic import ValidationError
from sqlalchemy import select

from app.core.config import Settings
from app.core.security import create_access_token, hash_password
from app.models import (
    Cart,
    Category,
    Collection,
    InventoryAdjustment,
    Product,
    ProductVariant,
    User,
)


async def create_product(client, stock: int = 3):
    sessions = client._transport.app.state.test_sessions
    async with sessions() as session:
        category = Category(name="Hoodies", slug="hoodies")
        collection = Collection(name="CREWWW / TEST", slug="crewww-test", description="")
        session.add_all([category, collection])
        await session.flush()
        product = Product(
            slug="test-hoodie",
            name="Test Hoodie",
            category_id=category.id,
            audience="unisex",
            description="A test hoodie",
            collection_id=collection.id,
            currency="USD",
            image_url="/images/test.jpg",
            colors=[{"name": "Black", "value": "#000"}],
            specifications={},
            featured=True,
            is_new=True,
            best_seller=False,
            status="sample",
        )
        variant = ProductVariant(
            sku="test-hoodie-black-m",
            size="M",
            color="Black",
            color_value="#000",
            price_minor=7999,
            stock_quantity=stock,
        )
        product.variants.append(variant)
        session.add(product)
        await session.commit()
        return product.id, variant.id


async def create_user(
    client, *, role: str = "customer", email: str = "user@example.test"
) -> tuple[User, str]:
    sessions = client._transport.app.state.test_sessions
    async with sessions() as session:
        user = User(
            email=email,
            password_hash=hash_password("test-password-safe-123"),
            first_name="Test",
            last_name="User",
            role=role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        access = create_access_token(
            user.id,
            user.role,
            Settings(_env_file=None, jwt_secret="test-secret-never-return-this-1234567890"),
        )
        return user, access


@pytest.mark.asyncio
async def test_health_ready_and_admin_diagnostics_are_authorized_and_redacted(client):
    assert (await client.get("/api/health")).json()["status"] == "healthy"
    assert (await client.get("/api/ready")).status_code == 200
    assert (await client.get("/api/admin/system/status")).status_code == 401
    _, customer_token = await create_user(client)
    denied = await client.get(
        "/api/admin/system/status", headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert denied.status_code == 403
    _, admin_token = await create_user(client, role="admin", email="admin@example.test")
    response = await client.get(
        "/api/admin/system/status", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["services"]["database"]["status"] == "healthy"
    assert body["services"]["payment"]["mode"] == "mock"
    serialized = response.text
    assert "test-secret-never-return-this" not in serialized
    assert "password_hash" not in serialized
    assert "database_url" not in serialized


@pytest.mark.asyncio
async def test_registration_login_refresh_rotation_and_password_redaction(client):
    registered = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "buyer@example.com",
            "password": "secure-test-password-123",
            "first_name": "Buyer",
            "last_name": "One",
        },
    )
    assert registered.status_code == 201
    body = registered.json()
    assert body["user"]["role"] == "customer"
    assert "password" not in registered.text
    assert client.cookies.get("crewww_refresh")
    assert "httponly" in registered.headers["set-cookie"].lower()
    inspected = await client.post("/api/v1/auth/session")
    assert inspected.status_code == 200
    assert inspected.json()["authenticated"] is True
    access = body["access_token"]
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    ).status_code == 200
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@example.com", "password": "secure-test-password-123"},
    )
    assert login.status_code == 200
    stale_refresh = client.cookies.get("crewww_refresh")
    refresh = await client.post("/api/v1/auth/refresh", headers={"Origin": "http://test"})
    assert refresh.status_code == 200
    assert refresh.json()["access_token"] != login.json()["access_token"]
    client.cookies.set("crewww_refresh", stale_refresh, path="/api/v1/auth")
    reused = await client.post("/api/v1/auth/refresh", headers={"Origin": "http://test"})
    assert reused.status_code == 401
    bad_origin = await client.post(
        "/api/v1/auth/refresh", headers={"Origin": "https://attacker.invalid"}
    )
    assert bad_origin.status_code == 403


def test_production_settings_reject_unsafe_defaults():
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None, app_env="production")


@pytest.mark.asyncio
async def test_anonymous_session_check_is_a_clean_false_result(client):
    result = await client.post("/api/v1/auth/session")
    assert result.status_code == 200
    assert result.json() == {"authenticated": False, "access_token": None, "user": None}


@pytest.mark.asyncio
async def test_catalog_search_filter_sort_and_product_detail(client):
    product_id, _ = await create_product(client)
    listed = await client.get(
        "/api/v1/products",
        params={
            "category": "hoodies",
            "size": "M",
            "color": "Black",
            "term": "Test",
            "sort": "price-asc",
        },
    )
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    product = listed.json()["items"][0]
    assert product["id"] == str(product_id)
    assert product["price"] == 79.99
    assert product["available"] is True
    variant = product["variants"][0]
    assert variant["sku"] == "test-hoodie-black-m"
    assert variant["price"] == 79.99
    assert variant["stockQuantity"] == 3
    detail = await client.get("/api/v1/products/test-hoodie")
    assert detail.status_code == 200
    assert detail.json()["variants"][0]["sku"] == "test-hoodie-black-m"
    assert (await client.get("/api/v1/products/missing")).status_code == 404


@pytest.mark.asyncio
async def test_fit_and_wash_filters_match_product_attributes(client):
    await create_product(client)
    sessions = client._transport.app.state.test_sessions
    async with sessions() as session:
        record = (await session.scalars(select(Product).where(Product.slug == "test-hoodie"))).one()
        record.fit = "Relaxed"
        record.wash = "Dark wash"
        await session.commit()

    assert (await client.get("/api/v1/products", params={"fit": "relaxed"})).json()["total"] == 1
    assert (await client.get("/api/v1/products", params={"fit": "Slim"})).json()["total"] == 0
    assert (await client.get("/api/v1/products", params={"wash": "dark wash"})).json()["total"] == 1


@pytest.mark.asyncio
async def test_guest_cart_and_server_priced_transactional_checkout(client):
    product_id, variant_id = await create_product(client, stock=2)
    added = await client.post(
        "/api/v1/cart/items",
        json={"product_id": str(product_id), "size": "M", "color": "Black", "quantity": 1},
    )
    assert added.status_code == 200
    assert added.json()["subtotal_minor"] == 7999
    assert added.json()["items"][0]["sku"] == "test-hoodie-black-m"
    assert client.cookies.get("crewww_cart")
    # Client input has no price field; price and totals are loaded from the database variant.
    checkout = await client.post(
        "/api/v1/checkout",
        headers={"Idempotency-Key": "checkout-test-0001"},
        json={
            "lines": [
                {"product_id": str(product_id), "size": "M", "color": "Black", "quantity": 2}
            ],
            "shipping": {
                "first_name": "Buyer",
                "last_name": "One",
                "email": "buyer@example.com",
                "address_line1": "12 Test Road",
                "city": "Cairo",
                "country_code": "EG",
            },
        },
    )
    assert checkout.status_code == 201
    order = checkout.json()
    assert order["subtotal_minor"] == 15998
    assert order["total_minor"] == 15998  # sample free delivery threshold
    assert order["status"] == "processing"
    assert order["payment_status"] == "succeeded"
    assert (await client.get(f"/api/v1/orders/{order['id']}")).status_code == 200
    replay = await client.post(
        "/api/v1/checkout",
        headers={"Idempotency-Key": "checkout-test-0001"},
        json={
            "lines": [
                {"product_id": str(product_id), "size": "M", "color": "Black", "quantity": 2}
            ],
            "shipping": {
                "first_name": "Buyer",
                "last_name": "One",
                "email": "buyer@example.com",
                "address_line1": "12 Test Road",
                "city": "Cairo",
                "country_code": "EG",
            },
        },
    )
    assert replay.status_code == 201
    assert replay.json()["id"] == order["id"]
    overdraw = await client.post(
        "/api/v1/checkout",
        headers={"Idempotency-Key": "checkout-test-0002"},
        json={
            "lines": [
                {"product_id": str(product_id), "size": "M", "color": "Black", "quantity": 1}
            ],
            "shipping": {
                "first_name": "Buyer",
                "last_name": "One",
                "email": "buyer@example.com",
                "address_line1": "12 Test Road",
                "city": "Cairo",
                "country_code": "EG",
            },
        },
    )
    assert overdraw.status_code == 409
    sessions = client._transport.app.state.test_sessions
    async with sessions() as session:
        remaining = await session.get(ProductVariant, variant_id)
        assert remaining.stock_quantity == 0


@pytest.mark.asyncio
async def test_customer_order_ownership_wishlist_and_admin_stock_adjustment(client):
    product_id, variant_id = await create_product(client, stock=3)
    user, token = await create_user(client)
    headers = {"Authorization": f"Bearer {token}"}
    assert (await client.put(f"/api/v1/wishlist/{product_id}", headers=headers)).status_code == 204
    assert (await client.get("/api/v1/wishlist", headers=headers)).json() == [str(product_id)]
    guest = await client.get("/api/v1/orders")
    assert guest.status_code == 401
    _, admin_token = await create_user(client, role="admin", email="stock-admin@example.test")
    adjust = await client.post(
        f"/api/v1/admin/inventory/{variant_id}/adjust",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"delta": 2, "reason": "QA stock receipt"},
    )
    assert adjust.status_code == 204
    sessions = client._transport.app.state.test_sessions
    async with sessions() as session:
        variant = await session.get(ProductVariant, variant_id)
        audit = await session.scalar(
            select(InventoryAdjustment).where(InventoryAdjustment.variant_id == variant_id)
        )
        assert variant.stock_quantity == 5
        assert audit is not None and audit.reason == "QA stock receipt"


@pytest.mark.asyncio
async def test_guest_cart_moves_to_new_customer_account(client):
    product_id, _ = await create_product(client)
    added = await client.post(
        "/api/v1/cart/items",
        json={"product_id": str(product_id), "size": "M", "color": "Black", "quantity": 1},
    )
    assert added.status_code == 200
    registered = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "cart-owner@example.com",
            "password": "secure-test-password-123",
            "first_name": "Cart",
            "last_name": "Owner",
        },
    )
    assert registered.status_code == 201
    cart = await client.get(
        "/api/v1/cart",
        headers={"Authorization": f"Bearer {registered.json()['access_token']}"},
    )
    assert cart.status_code == 200
    assert len(cart.json()["items"]) == 1
    sessions = client._transport.app.state.test_sessions
    async with sessions() as session:
        customer = await session.scalar(select(User).where(User.email == "cart-owner@example.com"))
        owned_cart = await session.scalar(select(Cart).where(Cart.user_id == customer.id))
        assert owned_cart is not None and owned_cart.guest_token_hash is None


@pytest.mark.asyncio
async def test_authenticated_checkout_uses_owner_scoped_session_transaction(client):
    product_id, _ = await create_product(client)
    _, token = await create_user(client, email="checkout-owner@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    added = await client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"product_id": str(product_id), "size": "M", "color": "Black", "quantity": 1},
    )
    assert added.status_code == 200
    result = await client.post(
        "/api/v1/checkout",
        headers={**headers, "Idempotency-Key": "authenticated-checkout-1"},
        json={
            "lines": [
                {"product_id": str(product_id), "size": "M", "color": "Black", "quantity": 1}
            ],
            "shipping": {
                "first_name": "Test",
                "last_name": "User",
                "email": "checkout-owner@example.com",
                "address_line1": "12 Test Road",
                "city": "Cairo",
                "country_code": "EG",
            },
        },
    )
    assert result.status_code == 201
    assert result.json()["status"] == "processing"
    assert (await client.get("/api/v1/orders", headers=headers)).json()[0]["id"] == result.json()["id"]
