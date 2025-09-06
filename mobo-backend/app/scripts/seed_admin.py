# scripts/seed_admin.py
"""
Run this script to create an 'admin' role (if missing) and an admin user.
Usage:
  - Activate your virtualenv (.venv)
  - From project root run: python scripts/seed_admin.py
You can override env vars:
  SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=admin123 python scripts/seed_admin.py
"""

import os
import sys

sys.path.insert(0, os.getcwd())

from datetime import datetime
from sqlalchemy.orm import Session

# Adjust imports to match your project layout
try:
    from app.db.session import (
        SessionLocal,
    )  # SessionLocal should be defined in app/db/session.py
    from app import models
    from app.core.security import hash_password
except Exception as e:
    print("Import error — check your project structure and module names:", e)
    raise

ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "admin123")
ADMIN_NAME = os.environ.get("SEED_ADMIN_NAME", "Administrator")


def run():
    db: Session = SessionLocal()
    try:
        # Create admin role if Role model exists
        role_id = None
        if hasattr(models, "Role"):
            admin_role = (
                db.query(models.Role).filter(models.Role.name == "admin").first()
            )
            if not admin_role:
                admin_role = models.Role(name="admin")
                db.add(admin_role)
                db.commit()
                db.refresh(admin_role)
                print(f"Created role 'admin' id={admin_role.id}")
            role_id = admin_role.id

        # Check for existing admin user
        existing = (
            db.query(models.User).filter(models.User.email == ADMIN_EMAIL).first()
        )
        if existing:
            print(
                f"Admin user already exists: {existing.email} (id={getattr(existing, 'id', 'n/a')})"
            )
            return

        # Build admin user fields based on what your User model supports
        user_kwargs = {
            "id": str(__import__("uuid").uuid4()),
            "name": ADMIN_NAME,
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # If Role/role_id present on User model, set it
        if role_id is not None and hasattr(models.User, "role_id"):
            user_kwargs["role_id"] = role_id

        # If your model uses is_admin flag, set it
        if hasattr(models.User, "is_admin"):
            user_kwargs["is_admin"] = True

        user = models.User(**user_kwargs)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(
            f"Created admin user: {user.email} (password: {ADMIN_PASSWORD}) id={user.id}"
        )
    except Exception as exc:
        print("Failed to seed admin:", exc)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
