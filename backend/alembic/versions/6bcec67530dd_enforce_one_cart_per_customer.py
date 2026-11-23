"""enforce one cart per customer

Revision ID: 6bcec67530dd
Revises: 2b7622cd7bb8
Create Date: 2026-11-22 16:04:46.415587
"""

from collections.abc import Sequence

from alembic import op

revision: str = "6bcec67530dd"
down_revision: str | None = "2b7622cd7bb8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("carts") as batch_op:
        batch_op.create_unique_constraint("uq_cart_user", ["user_id"])


def downgrade() -> None:
    with op.batch_alter_table("carts") as batch_op:
        batch_op.drop_constraint("uq_cart_user", type_="unique")
