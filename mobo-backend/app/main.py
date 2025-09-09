import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.db import session, base
from app.models import (
    User,
    Role,
)  # make sure this import exists so models are registered
from app.core.config import settings
from app.api.api_v1.api import api_router

from fastapi.staticfiles import StaticFiles
import os

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create FastAPI app first
app = FastAPI(title="Mobo App API", version="0.1.0")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api/v1")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
# helper to extract sqlite file path (if sqlite URL used)
def _sqlite_filepath_from_url(url: str) -> str | None:
    if not url.startswith("sqlite"):
        return None
    parts = url.split("://", 1)
    if len(parts) != 2:
        return None
    return parts[1]  # relative ./file.db or /absolute/path/file.db


@app.on_event("startup")
def startup():
    logger.info("Starting app startup()")
    engine = session.engine

    # --- Inspect existing vs defined tables ---
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    defined_tables = set(base.Base.metadata.tables.keys())

    print(f"[startup] Tables defined in metadata: {sorted(defined_tables)}")
    print(f"[startup] Tables existing in DB: {sorted(existing_tables)}")

    # --- Create missing tables ---
    base.Base.metadata.create_all(bind=engine)

    # --- Seed roles and admin user ---
    db: Session = session.SessionLocal()
    try:
        # ✅ Ensure admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            print("[startup] Admin role created")
        else:
            print("[startup] Admin role already exists")

        # ✅ Ensure user role
        user_role = db.query(Role).filter(Role.name == "user").first()
        if not user_role:
            user_role = Role(name="user")
            db.add(user_role)
            db.commit()
            db.refresh(user_role)
            print("[startup] User role created")
        else:
            print("[startup] User role already exists")

        user_role = db.query(Role).filter(Role.name == "staff").first()
        if not user_role:
            user_role = Role(name="staff")
            db.add(user_role)
            db.commit()
            db.refresh(user_role)
            print("[startup] Staff role created")
        else:
            print("[startup] Staff role already exists")   

        # ✅ Ensure default admin user
        admin_user = db.query(User).filter(User.email == "admin@mobo.ph").first()
        if not admin_user:
            hashed_password = pwd_context.hash("Admin@123")
            admin_user = User(
                name="Admin User",
                email="admin@mobo.ph",
                password=hashed_password,
                role_id=admin_role.id,
            )
            db.add(admin_user)
            db.commit()
            print("[startup] Default admin user created")
        else:
            print("[startup] Default admin user already exists")

    except Exception as e:
        logger.exception(f"Failed to create default roles/users: {e}")
    finally:
        db.close()

    print("[startup] complete")
