from dataclasses import dataclass
from uuid import uuid4


@dataclass(frozen=True)
class PaymentResult:
    reference: str
    status: str


class MockPaymentProvider:
    """Local-only deterministic payment simulation. Never contacts a payment network."""

    async def authorize(
        self, amount_minor: int, currency: str, idempotency_key: str
    ) -> PaymentResult:
        del amount_minor, currency, idempotency_key
        return PaymentResult(reference=f"mock_{uuid4().hex}", status="succeeded")
