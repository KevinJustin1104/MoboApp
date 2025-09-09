# alembic/env.py
from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
import os, sys

# Ensure project root on path (so "from app..." works when running alembic)
THIS_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(THIS_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Import your Base and models ---
# (Pick the correct Base import for your project)
try:
    from app.db.base import Base
except Exception:
    from app.db.base_class import Base  # fallback if you use this pattern

import app.models  # IMPORTANT: register all model mappers

# --- Load DB URL from your config.py (your Settings uses DATABASE_URL) ---
try:
    # adjust to your real module path:
    from app.core.config import settings  # e.g., app/core/config.py
except Exception:
    from app.config import settings        # if your file is app/config.py

db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        render_as_batch=True,   # helpful for SQLite schema changes
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            render_as_batch=True,   # helpful for SQLite schema changes
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
