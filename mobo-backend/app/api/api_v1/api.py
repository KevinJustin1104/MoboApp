from fastapi import APIRouter
from app.api.api_v1.endpoints import (
    auth,
    users,
    incidents,
    announcements,
    notifications,
    profile,
    departments,
    incident_categories,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(
    announcements.router, prefix="/announcements", tags=["announcements"]
)
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(
    departments.router, prefix="/departments", tags=["departments"]
)
api_router.include_router(
    incident_categories.router,
    prefix="/incident_categories",
    tags=["incident_categories"],
)
