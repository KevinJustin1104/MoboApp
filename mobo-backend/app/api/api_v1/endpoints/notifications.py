# app/api/api_v1/endpoints/notifications.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db_session
from app.deps import get_current_user
from app import crud, schemas, models

router = APIRouter()


@router.get("/", response_model=List[schemas.NotificationOut])
def my_notifications(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    return crud.list_notifications_for_user(db, current_user.id, skip=skip, limit=limit)


@router.post("/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    n = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    db.refresh(n)
    return n


# NEW: get unread count for the current user
@router.get("/unread_count")
def unread_count(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.read == False,
        )
        .count()
    )
    return {"count": count}
