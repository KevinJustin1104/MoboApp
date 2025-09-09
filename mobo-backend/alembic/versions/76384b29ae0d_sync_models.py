"""sync models

Revision ID: 76384b29ae0d
Revises: 1a12a54186b4
Create Date: 2025-09-08 23:10:31.891254
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "76384b29ae0d"
down_revision: Union[str, Sequence[str], None] = "1a12a54186b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# -------- helpers --------
def _idx_exists_by_name(insp, table: str, name: str) -> bool:
    try:
        return any(ix["name"] == name for ix in insp.get_indexes(table))
    except Exception:
        return False


def _idx_exists_by_cols(insp, table: str, cols: list[str], unique: bool | None = None) -> bool:
    want = set(cols)
    try:
        for ix in insp.get_indexes(table):
            if set(ix.get("column_names") or []) == want:
                if unique is None or bool(ix.get("unique")) == unique:
                    return True
    except Exception:
        pass
    return False


def _uniq_exists(insp, table: str, cols: list[str], name: str | None = None) -> bool:
    want = set(cols)
    try:
        uqs = insp.get_unique_constraints(table)
        for uq in uqs:
            if name and uq.get("name") == name:
                return True
            if set(uq.get("column_names") or []) == want:
                return True
    except Exception:
        pass
    # SQLite often represents UNIQUE via a unique index:
    return _idx_exists_by_cols(insp, table, cols, unique=True)


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # =======================
    # alert_reads (index guards)
    # =======================
    # Ensure single-column indexes on alert_id and user_id exist; don't drop anything.
    with op.batch_alter_table("alert_reads", schema=None) as batch_op:
        # alert_id
        if not _idx_exists_by_cols(insp, "alert_reads", ["alert_id"]):
            # name will follow your naming_convention (may render with duplicated table name; that's fine)
            batch_op.create_index(batch_op.f("ix_alert_reads_alert_id"), ["alert_id"], unique=False)
        # user_id
        if not _idx_exists_by_cols(insp, "alert_reads", ["user_id"]):
            batch_op.create_index(batch_op.f("ix_alert_reads_user_id"), ["user_id"], unique=False)

    # ==========================================
    # announcement_comments (columns, backfill, FKs, index) — idempotent
    # ==========================================
    cols_ac = {c["name"] for c in insp.get_columns("announcement_comments")}
    # 1) add columns if missing (nullable first)
    with op.batch_alter_table("announcement_comments", schema=None) as batch_op:
        if "announcement_id" not in cols_ac:
            batch_op.add_column(sa.Column("announcement_id", sa.String(length=36), nullable=True))
        if "parent_id" not in cols_ac:
            batch_op.add_column(sa.Column("parent_id", sa.String(length=36), nullable=True))

    # refresh columns
    cols_ac = {c["name"] for c in insp.get_columns("announcement_comments")}

    # 2) backfill announcement_id from legacy announcements_id if present
    if "announcements_id" in cols_ac and "announcement_id" in cols_ac:
        op.execute(
            sa.text(
                "UPDATE announcement_comments "
                "SET announcement_id = announcements_id "
                "WHERE announcement_id IS NULL"
            )
        )

    # 3) index + FKs + NOT NULL; drop legacy column if present
    with op.batch_alter_table("announcement_comments", schema=None) as batch_op:
        # index on announcement_id if missing
        if not _idx_exists_by_cols(insp, "announcement_comments", ["announcement_id"]):
            batch_op.create_index(batch_op.f("ix_announcement_comments_announcement_id"), ["announcement_id"], unique=False)

        # FKs (guard with try; SQLite inspector can be flaky for FKs)
        try:
            batch_op.create_foreign_key(
                batch_op.f("fk_announcement_comments_announcement_id_announcements"),
                "announcements",
                ["announcement_id"],
                ["id"],
                ondelete="CASCADE",
            )
        except Exception:
            pass

        try:
            batch_op.create_foreign_key(
                batch_op.f("fk_announcement_comments_parent_id_announcement_comments"),
                "announcement_comments",
                ["parent_id"],
                ["id"],
            )
        except Exception:
            pass

        # make NOT NULL if possible
        try:
            batch_op.alter_column("announcement_id", existing_type=sa.String(length=36), nullable=False)
        except Exception:
            pass

        # drop legacy column if it still exists
        now_cols = {c["name"] for c in insp.get_columns("announcement_comments")}
        if "announcements_id" in now_cols:
            try:
                batch_op.drop_column("announcements_id")
            except Exception:
                pass

    # =======================
    # announcements (image_url)
    # =======================
    cols_a = {c["name"] for c in insp.get_columns("announcements")}
    with op.batch_alter_table("announcements", schema=None) as batch_op:
        if "image_url" not in cols_a:
            batch_op.add_column(sa.Column("image_url", sa.String(), nullable=True))

    # =======================
    # barangays (unique index on name; don't force-drop old)
    # =======================
    # Ensure UNIQUE on name exists
    if not _uniq_exists(insp, "barangays", ["name"], name=None):
        with op.batch_alter_table("barangays", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_barangays_name"), ["name"], unique=True)

    # =======================
    # departments / incident_categories / roles — unique(name)
    # =======================
    if not _uniq_exists(insp, "departments", ["name"], name="uq_departments_name"):
        with op.batch_alter_table("departments", schema=None) as batch_op:
            try:
                batch_op.create_unique_constraint(batch_op.f("uq_departments_name"), ["name"])
            except Exception:
                pass

    if not _uniq_exists(insp, "incident_categories", ["name"], name="uq_incident_categories_name"):
        with op.batch_alter_table("incident_categories", schema=None) as batch_op:
            try:
                batch_op.create_unique_constraint(batch_op.f("uq_incident_categories_name"), ["name"])
            except Exception:
                pass

    if not _uniq_exists(insp, "roles", ["name"], name="uq_roles_name"):
        with op.batch_alter_table("roles", schema=None) as batch_op:
            try:
                batch_op.create_unique_constraint(batch_op.f("uq_roles_name"), ["name"])
            except Exception:
                pass

    # =======================
    # users (unique index on email)
    # =======================
    if not _uniq_exists(insp, "users", ["email"], name="ix_users_users_email"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            # prefer a unique index on email
            if not _idx_exists_by_cols(insp, "users", ["email"], unique=True):
                batch_op.create_index(batch_op.f("ix_users_users_email"), ["email"], unique=True)


def downgrade() -> None:
    # Make downgrade safe/no-op-ish; only revert what’s clearly present.
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # users
    with op.batch_alter_table("users", schema=None) as batch_op:
        if _idx_exists_by_name(insp, "users", batch_op.f("ix_users_users_email")):
            try:
                batch_op.drop_index(batch_op.f("ix_users_users_email"))
            except Exception:
                pass
        # Optional: recreate non-unique index if you had it originally
        if not _idx_exists_by_cols(insp, "users", ["email"], unique=False):
            try:
                batch_op.create_index(batch_op.f("ix_users_email"), ["email"], unique=False)
            except Exception:
                pass

    # roles
    with op.batch_alter_table("roles", schema=None) as batch_op:
        try:
            batch_op.drop_constraint(batch_op.f("uq_roles_name"), type_="unique")
        except Exception:
            pass

    # incident_categories
    with op.batch_alter_table("incident_categories", schema=None) as batch_op:
        try:
            batch_op.drop_constraint(batch_op.f("uq_incident_categories_name"), type_="unique")
        except Exception:
            pass

    # departments
    with op.batch_alter_table("departments", schema=None) as batch_op:
        try:
            batch_op.drop_constraint(batch_op.f("uq_departments_name"), type_="unique")
        except Exception:
            pass

    # barangays
    with op.batch_alter_table("barangays", schema=None) as batch_op:
        # drop any unique index on name that matches naming_convention
        for name in (
            batch_op.f("ix_barangays_name"),
            batch_op.f("ix_barangays_barangays_name"),
        ):
            if _idx_exists_by_name(insp, "barangays", name):
                try:
                    batch_op.drop_index(name)
                except Exception:
                    pass
        # (optionally) recreate non-unique plain index
        if not _idx_exists_by_cols(insp, "barangays", ["name"], unique=False):
            try:
                batch_op.create_index(batch_op.f("ix_barangays_name"), ["name"], unique=False)
            except Exception:
                pass

    # announcements
    cols_a = {c["name"] for c in insp.get_columns("announcements")}
    with op.batch_alter_table("announcements", schema=None) as batch_op:
        if "image_url" in cols_a:
            try:
                batch_op.drop_column("image_url")
            except Exception:
                pass

    # announcement_comments
    with op.batch_alter_table("announcement_comments", schema=None) as batch_op:
        # drop FKs if present
        for fk_name in (
            batch_op.f("fk_announcement_comments_parent_id_announcement_comments"),
            batch_op.f("fk_announcement_comments_announcement_id_announcements"),
        ):
            try:
                batch_op.drop_constraint(fk_name, type_="foreignkey")
            except Exception:
                pass
        # drop index on announcement_id
        for ix_name in (
            batch_op.f("ix_announcement_comments_announcement_id"),
            batch_op.f("ix_announcement_comments_announcement_comments_announcement_id"),
        ):
            if _idx_exists_by_name(insp, "announcement_comments", ix_name):
                try:
                    batch_op.drop_index(ix_name)
                except Exception:
                    pass

    # (Optionally) revert columns: add legacy, copy back, drop new
    cols_ac = {c["name"] for c in insp.get_columns("announcement_comments")}
    if "announcement_id" in cols_ac and "announcements_id" not in cols_ac:
        with op.batch_alter_table("announcement_comments", schema=None) as batch_op:
            try:
                batch_op.add_column(sa.Column("announcements_id", sa.String(length=36), nullable=True))
            except Exception:
                pass
        op.execute(
            sa.text(
                "UPDATE announcement_comments "
                "SET announcements_id = announcement_id "
                "WHERE announcements_id IS NULL"
            )
        )
        with op.batch_alter_table("announcement_comments", schema=None) as batch_op:
            for col in ("parent_id", "announcement_id"):
                try:
                    batch_op.drop_column(col)
                except Exception:
                    pass

    # alert_reads (best-effort revert; keep at least one index per column)
    with op.batch_alter_table("alert_reads", schema=None) as batch_op:
        # nothing mandatory to drop; leave indexes as-is to avoid breaking queries
        pass
