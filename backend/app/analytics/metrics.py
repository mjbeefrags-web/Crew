"""Server-side commercial metrics for the owner dashboard.

The frontend receives computed numbers and the formulas used, rather than
deriving business logic in the browser. Definitions follow standard ecommerce
practice (AOV, CLV, repeat rate, sell-through, turnover, gross margin).

COGS is not recorded in the schema yet, so gross margin and inventory turnover
use an explicit, configurable `cogs_ratio` assumption and are labelled as
proxies in the response. Replace it with real landed cost per variant when
stock arrives.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from statistics import median
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Cart, ContactMessage, NewsletterSubscription, Order, ProductVariant, Wishlist

FORMULAS = {
    "net_revenue_minor": "Sum of total_minor for paid, non-cancelled orders in the window.",
    "aov_minor": "net_revenue_minor / paid_orders",
    "units_per_order": "units_sold / paid_orders",
    "conversion_proxy": "paid_orders / (active_carts + paid_orders)",
    "repeat_rate": "customers with 2+ paid orders / customers with 1+ paid order",
    "purchase_frequency": "paid_orders / unique_customers",
    "clv_minor": "aov_minor x purchase_frequency x estimated_lifespan_periods",
    "sell_through": "units_sold / (units_sold + ending_stock_units)",
    "inventory_turnover": "(net_revenue_minor x cogs_ratio) / inventory_value_minor",
    "gross_margin_proxy": "(net_revenue_minor - cogs) / net_revenue_minor",
    "days_of_cover": "ending_stock_units / (units_sold / days)",
    "revenue_growth": "(current_net_revenue - previous_net_revenue) / previous_net_revenue",
    "moving_average_7d": "Trailing 7-day arithmetic mean of daily revenue.",
}


def _naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=None) if value.tzinfo else value


def _safe_div(numerator: float, denominator: float) -> float:
    return round(numerator / denominator, 6) if denominator else 0.0


def _rows(orders: list[Order]) -> list[dict[str, Any]]:
    return [
        {
            "id": str(order.id),
            "created_at": (_naive(order.created_at) or datetime.min).isoformat(),
            "email": order.email,
            "total_minor": order.total_minor,
            "items": [
                {
                    "sku": item.sku,
                    "name": item.product_name,
                    "size": item.size,
                    "color": item.color,
                    "quantity": item.quantity,
                    "revenue_minor": item.unit_price_minor * item.quantity,
                }
                for item in order.items
            ],
        }
        for order in orders
    ]


def _is_paid(order: Order) -> bool:
    return order.status != "cancelled" and any(
        payment.status == "succeeded" for payment in order.payments
    )


def _breakdown(
    orders: list[dict[str, Any]], key: str, label_key: str | None = None
) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, Any]] = {}
    for order in orders:
        for item in order["items"]:
            field = item.get(key) or "UNMAPPED"
            row = totals.setdefault(
                field,
                {
                    "key": field,
                    "label": item.get(label_key or key, field),
                    "revenue_minor": 0,
                    "units": 0,
                    "count": 0,
                },
            )
            row["revenue_minor"] += item["revenue_minor"]
            row["units"] += item["quantity"]
            row["count"] += 1
    return sorted(
        totals.values(), key=lambda row: (-row["revenue_minor"], row["label"])
    )


async def compute_metrics(
    session: AsyncSession, *, days: int, cogs_ratio: float = 0.45
) -> dict[str, Any]:
    now = _naive(datetime.now(UTC)) or datetime.min
    start = now - timedelta(days=days)
    previous_start = start - timedelta(days=days)

    orders = (
        await session.scalars(
            select(Order)
            .where(Order.created_at >= previous_start)
            .options(selectinload(Order.items), selectinload(Order.payments))
            .order_by(Order.created_at)
        )
    ).all()
    paid = [order for order in orders if _is_paid(order)]
    current_orders = [
        order
        for order in paid
        if (created := _naive(order.created_at)) and created >= start
    ]
    previous_orders = [
        order
        for order in paid
        if _naive(order.created_at) and previous_start <= _naive(order.created_at) < start
    ]

    revenue = sum(order.total_minor for order in current_orders)
    previous_revenue = sum(order.total_minor for order in previous_orders)
    units = sum(
        item.quantity for order in current_orders for item in order.items
    )
    paid_orders = len(current_orders)
    customers: dict[str, list[datetime]] = {}
    for order in current_orders:
        customer = str(order.user_id or order.email).lower()
        customers.setdefault(customer, []).append(order.created_at)

    repeat_customers = sum(1 for dates in customers.values() if len(dates) > 1)
    unique_customers = len(customers)
    lifespan_days = days
    if repeat_customers:
        gaps = [
            (max(dates) - min(dates)).days
            for dates in customers.values()
            if len(dates) > 1
        ]
        positive = [gap for gap in gaps if gap > 0]
        if positive:
            lifespan_days = max(1, int(median(positive)))

    aov = _safe_div(revenue, paid_orders)
    purchase_frequency = _safe_div(paid_orders, unique_customers)
    lifespan_periods = max(1, round(lifespan_days / days))
    clv = round(aov * purchase_frequency * lifespan_periods)

    cart_count = int(
        await session.scalar(
            select(func.count(Cart.id)).where(Cart.created_at >= start)
        )
        or 0
    )
    wishlist_count = int(
        await session.scalar(
            select(func.count(Wishlist.id))
        )
        or 0
    )
    newsletter_count = int(
        await session.scalar(
            select(func.count(NewsletterSubscription.id)).where(
                NewsletterSubscription.created_at >= start
            )
        )
        or 0
    )
    contact_count = int(
        await session.scalar(
            select(func.count(ContactMessage.id)).where(
                ContactMessage.created_at >= start
            )
        )
        or 0
    )

    variants = (await session.scalars(select(ProductVariant))).all()
    stock_units = sum(variant.stock_quantity for variant in variants)
    inventory_value = sum(
        variant.stock_quantity
        * (variant.sale_price_minor or variant.price_minor)
        for variant in variants
    )
    cogs = round(revenue * cogs_ratio)
    gross_margin = _safe_div(revenue - cogs, revenue)
    turnover = _safe_div(cogs, inventory_value)
    daily_units = _safe_div(units, days)

    # Daily series with a trailing 7-day moving average.
    series: dict[str, dict[str, Any]] = {}
    for offset in range(days):
        key = (start + timedelta(days=offset)).date().isoformat()
        series[key] = {
            "date": key,
            "revenue_minor": 0,
            "orders": 0,
            "units": 0,
        }
    for order in current_orders:
        key = (_naive(order.created_at) or datetime.min).date().isoformat()
        if key not in series:
            continue
        point = series[key]
        point["revenue_minor"] += order.total_minor
        point["orders"] += 1
        point["units"] += sum(item.quantity for item in order.items)
    trend = list(series.values())
    for index, point in enumerate(trend):
        window = trend[max(0, index - 6) : index + 1]
        point["moving_average_7d"] = round(
            sum(item["revenue_minor"] for item in window) / len(window)
        )

    rows = _rows(current_orders)
    low_stock = [
        {
            "sku": variant.sku,
            "size": variant.size,
            "color": variant.color,
            "stock": variant.stock_quantity,
        }
        for variant in variants
        if variant.stock_quantity <= 5
    ]

    return {
        "days": days,
        "generated_at": datetime.now(UTC).isoformat(),
        "source": "server",
        "assumptions": {
            "cogs_ratio": cogs_ratio,
            "cogs_is_proxy": True,
            "conversion_denominator": "active_carts + paid_orders (sessions not instrumented)",
            "lifespan_basis": "observed median gap between first and last repeat order",
        },
        "formulas": FORMULAS,
        "kpis": {
            "net_revenue_minor": revenue,
            "paid_orders": paid_orders,
            "units_sold": units,
            "aov_minor": aov,
            "units_per_order": _safe_div(units, paid_orders),
            "unique_customers": unique_customers,
            "repeat_customers": repeat_customers,
            "repeat_rate": _safe_div(repeat_customers, unique_customers),
            "purchase_frequency": purchase_frequency,
            "clv_minor": clv,
            "estimated_lifespan_days": lifespan_days,
            "conversion_proxy": _safe_div(paid_orders, cart_count + paid_orders),
            "active_carts": cart_count,
            "wishlist_count": wishlist_count,
            "newsletter_count": newsletter_count,
            "contact_count": contact_count,
            "ending_stock_units": stock_units,
            "inventory_value_minor": inventory_value,
            "cogs_minor_proxy": cogs,
            "gross_margin_proxy": gross_margin,
            "inventory_turnover_proxy": turnover,
            "sell_through": _safe_div(units, units + stock_units),
            "days_of_cover": _safe_div(stock_units, daily_units),
            "revenue_growth": _safe_div(
                revenue - previous_revenue, previous_revenue
            ),
            "previous_revenue_minor": previous_revenue,
        },
        "trend": trend,
        "breakdowns": {
            "products": _breakdown(rows, "sku", "name"),
            "sizes": _breakdown(rows, "size"),
            "colors": _breakdown(rows, "color"),
        },
        "low_stock": low_stock,
        "orders": rows,
    }
