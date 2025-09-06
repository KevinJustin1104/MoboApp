# app/api/api_v1/endpoints/announcements.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os, shutil
from app.db.session import get_db_session
from app.deps import get_current_admin, get_current_user
from app import crud, schemas
import uuid

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/latest", response_model=List[schemas.AnnouncementOut])
def latest(db: Session = Depends(get_db_session), limit: int = 5):
    return crud.latest_announcements(db, limit=limit)


@router.get("/{announcement_id}", response_model=schemas.AnnouncementOut)
def get_announcement(announcement_id: str, db: Session = Depends(get_db_session)):
    a = crud.get_announcement_by_id(db, announcement_id)
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return a


@router.post("/", response_model=schemas.AnnouncementOut)
def create_announcement(
    title: str = Form(...),
    body: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    image_url = None
    if file:
        # create a safer filename
        filename = f"announcement_{str(uuid.uuid4())}_{file.filename}"
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        image_url = path

    a = crud.create_announcement(
        db, author_id=admin.id, title=title, body=body, image_storage_path=image_url
    )
    return a
