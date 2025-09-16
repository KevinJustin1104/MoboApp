"""sync models

Revision ID: 7fca1beba3b7
Revises: 76384b29ae0d
Create Date: 2025-09-09 23:43:07.355347
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "7fca1beba3b7"
down_revision: Union[str, Sequence[str], None] = "76384b29ae0d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_stale_tmp_tables() -> None:
    """SQLite batch mode can leave _alembic_tmp_* tables on failure. Drop them defensively."""
    # Drop specific known names first…
    op.execute(sa.text("DROP TABLE IF EXISTS _alembic_tmp_announcement_comments"))
    op.execute(sa.text("DROP TABLE IF EXISTS _alembic_tmp_notifications"))
    # …and any others we may encounter
    bind = op.get_bind()
    insp = sa.inspect(bind)
    for t in insp.get_table_names():
        if t.startswith("_alembic_tmp_"):
            op.execute(sa.text(f'DROP TABLE IF EXISTS "{t}"'))


def upgrade() -> None:
    """Upgrade schema."""
    # Clean up any stale temp tables from prior failed runs
    _drop_stale_tmp_tables()

    # === announcement_comments ===
    with op.batch_alter_table("announcement_comments", schema=None) as batch_op:
        batch_op.alter_column(
            "announcement_id",
            existing_type=sa.VARCHAR(length=36),
            nullable=True,   # if you later want NOT NULL, do it in a follow-up after backfill
        )

    # === announcements ===
    with op.batch_alter_table("announcements", schema=None) as batch_op:
        batch_op.alter_column(
            "image_url",
            existing_type=sa.TEXT(),
            type_=sa.String(),
            existing_nullable=True,
        )

    # === barangays: unique(name) via index ===
    with op.batch_alter_table("barangays", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_barangays_name"))
        batch_op.create_index(
            batch_op.f("ix_barangays_barangays_name"),
            ["name"],
            unique=True,
        )

    # === departments unique(name) ===
    with op.batch_alter_table("departments", schema=None) as batch_op:
        batch_op.create_unique_constraint(batch_op.f("uq_departments_name"), ["name"])

    # === incident_categories unique(name) ===
    with op.batch_alter_table("incident_categories", schema=None) as batch_op:
        batch_op.create_unique_constraint(batch_op.f("uq_incident_categories_name"), ["name"])

    # === notifications ===
    with op.batch_alter_table("notifications", schema=None) as batch_op:
        # Add NOT NULL column with a temporary default so SQLite batch copy succeeds
        batch_op.add_column(sa.Column("type", sa.String(), nullable=False, server_default="system"))
        batch_op.add_column(sa.Column("title", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("announcement_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("alert_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("appointment_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("queue_ticket_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("read_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("delivered_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("scheduled_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("data", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("action", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("deeplink", sa.String(), nullable=True))

        batch_op.create_index(batch_op.f("ix_notifications_notifications_alert_id"), ["alert_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_notifications_announcement_id"), ["announcement_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_notifications_appointment_id"), ["appointment_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_notifications_created_at"), ["created_at"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_notifications_incident_id"), ["incident_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_notifications_queue_ticket_id"), ["queue_ticket_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_notifications_read"), ["read"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_notifications_user_id"), ["user_id"], unique=False)

        batch_op.drop_constraint(batch_op.f("fk_notifications_announcements_id_announcements"), type_="foreignkey")
        batch_op.create_foreign_key(
            batch_op.f("fk_notifications_announcement_id_announcements"),
            "announcements",
            ["announcement_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            batch_op.f("fk_notifications_queue_ticket_id_queue_tickets"),
            "queue_tickets",
            ["queue_ticket_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            batch_op.f("fk_notifications_appointment_id_appointments"),
            "appointments",
            ["appointment_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            batch_op.f("fk_notifications_alert_id_alerts"),
            "alerts",
            ["alert_id"],
            ["id"],
        )
        batch_op.drop_column("announcements_id")

    # Backfill and remove the temporary default for notifications.type
    op.execute(sa.text("UPDATE notifications SET type = 'system' WHERE type IS NULL"))
    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.alter_column("type", existing_type=sa.String(), nullable=False, server_default=None)

    # === roles unique(name) ===
    with op.batch_alter_table("roles", schema=None) as batch_op:
        batch_op.create_unique_constraint(batch_op.f("uq_roles_name"), ["name"])

    # === users: unique index on email ===
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_users_email"))
        batch_op.create_index(batch_op.f("ix_users_users_email"), ["email"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_users_users_email"))
        batch_op.create_index(batch_op.f("ix_users_email"), ["email"], unique=1)

    with op.batch_alter_table("roles", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("uq_roles_name"), type_="unique")

    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.add_column(sa.Column("announcements_id", sa.VARCHAR(length=36), nullable=True))
        batch_op.drop_constraint(batch_op.f("fk_notifications_alert_id_alerts"), type_="foreignkey")
        batch_op.drop_constraint(batch_op.f("fk_notifications_appointment_id_appointments"), type_="foreignkey")
        batch_op.drop_constraint(batch_op.f("fk_notifications_queue_ticket_id_queue_tickets"), type_="foreignkey")
        batch_op.drop_constraint(batch_op.f("fk_notifications_announcement_id_announcements"), type_="foreignkey")
        batch_op.create_foreign_key(
            batch_op.f("fk_notifications_announcements_id_announcements"),
            "announcements",
            ["announcements_id"],
            ["id"],
        )
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_user_id"))
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_read"))
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_queue_ticket_id"))
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_incident_id"))
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_created_at"))
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_appointment_id"))
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_announcement_id"))
        batch_op.drop_index(batch_op.f("ix_notifications_notifications_alert_id"))
        batch_op.drop_column("deeplink")
        batch_op.drop_column("action")
        batch_op.drop_column("data")
        batch_op.drop_column("scheduled_at")
        batch_op.drop_column("delivered_at")
        batch_op.drop_column("read_at")
        batch_op.drop_column("queue_ticket_id")
        batch_op.drop_column("appointment_id")
        batch_op.drop_column("alert_id")
        batch_op.drop_column("announcement_id")
        batch_op.drop_column("title")
        batch_op.drop_column("type")

    with op.batch_alter_table("incident_categories", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("uq_incident_categories_name"), type_="unique")

    with op.batch_alter_table("departments", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("uq_departments_name"), type_="unique")

    with op.batch_alter_table("barangays", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_barangays_barangays_name"))
        batch_op.create_index(batch_op.f("ix_barangays_name"), ["name"], unique=1)

    with op.batch_alter_table("announcements", schema=None) as batch_op:
        batch_op.alter_column(
            "image_url",
            existing_type=sa.String(),
            type_=sa.TEXT(),
            existing_nullable=True,
        )

    with op.batch_alter_table("announcement_comments", schema=None) as batch_op:
        batch_op.alter_column(
            "announcement_id",
            existing_type=sa.VARCHAR(length=36),
            nullable=False,
        )
