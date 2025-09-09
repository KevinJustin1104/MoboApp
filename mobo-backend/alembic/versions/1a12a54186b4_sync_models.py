"""sync models

Revision ID: 1a12a54186b4
Revises:
Create Date: 2025-09-08 22:47:24.408667
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "1a12a54186b4"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # incidents: drop old text column, ensure FK is named
    with op.batch_alter_table("incidents", schema=None) as batch_op:
        batch_op.create_foreign_key(
            "fk_incidents_barangay_id_barangays",  # name
            "barangays",                            # referred table
            ["barangay_id"],                        # local columns
            ["id"],                                 # remote columns
        )
        batch_op.drop_column("barangay")

    # notifications: named FK to announcements
    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.create_foreign_key(
            "fk_notifications_announcements_id_announcements",
            "announcements",
            ["announcements_id"],
            ["id"],
        )

    # users: named FK to barangays
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.create_foreign_key(
            "fk_users_barangay_id_barangays",
            "barangays",
            ["barangay_id"],
            ["id"],
        )


def downgrade() -> None:
    """Downgrade schema."""
    # users
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_users_barangay_id_barangays", type_="foreignkey")

    # notifications
    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.drop_constraint(
            "fk_notifications_announcements_id_announcements", type_="foreignkey"
        )

    # incidents
    with op.batch_alter_table("incidents", schema=None) as batch_op:
        batch_op.drop_constraint("fk_incidents_barangay_id_barangays", type_="foreignkey")
        batch_op.add_column(sa.Column("barangay", sa.String(), nullable=True))
