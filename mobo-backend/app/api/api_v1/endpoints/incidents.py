# app/api/api_v1/endpoints/incidents.py
import pathlib
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
import uuid
from sqlalchemy.orm import Session
from typing import Any, List, Optional
import os, shutil
from app import crud, schemas
from app.db.session import get_db_session
from app.deps import get_current_user, get_current_admin
from datetime import datetime
from app import crud, schemas, models
import base64
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = "uploads/incidents"
BASE_URL = "http://localhost:8081"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/create", response_model=schemas.IncidentOut)
async def create_incident(
    request: Request,
    title: str = Form(...),
    category_id: Optional[int] = Form(None, alias="type"),
    description: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    purok: Optional[str] = Form(None),
    barangay: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    landmark: Optional[str] = Form(None),
    department_id: Optional[int] = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    # --- Create incident record ---
    department_to_assign = department_id
    if category_id and not department_id:
        cat = db.query(models.IncidentCategory).filter_by(id=category_id).first()
        if cat:
            department_to_assign = cat.department_id

    inc_in = schemas.IncidentCreate(
        title=title,
        type=category_id,
        description=description,
        address=address,
        purok=purok,
        barangay=barangay,
        street=street,
        landmark=landmark,
        department_id=department_to_assign,
    )
    inc = crud.create_incident(db=db, reporter_id=current_user.id, inc_in=inc_in)

    saved_photos_urls = []

    # --- Save uploaded files ---
    for upload in files:
        filename = f"{inc.id}_{pathlib.Path(upload.filename).name}"
        safe_path = os.path.join(UPLOAD_DIR, filename)
        with open(safe_path, "wb") as f:
            f.write(await upload.read())

        # Save DB record
        photo_record = crud.add_incident_photo(
            db=db,
            incident_id=inc.id,
            storage_path=safe_path,
            url=f"{BASE_URL}/uploads/incidents/{filename}",
        )
        saved_photos_urls.append(photo_record.url)

    # --- Optional notification ---
    try:
        crud.create_notification(
            db,
            user_id=current_user.id,
            incident_id=inc.id,
            message=f"Incident {inc.title} submitted",
        )
    except Exception:
        db.rollback()

    # --- Refresh and resolve names ---
    db.refresh(inc)
    type_name = None
    department_name = None
    if inc.incident_type:
        cat = db.query(models.IncidentCategory).filter_by(id=inc.incident_type).first()
        type_name = cat.name if cat else None
    if inc.department:
        dept = db.query(models.Department).filter_by(id=inc.department).first()
        department_name = dept.name if dept else None

    return {
        "id": inc.id,
        "reporter_id": inc.reporter_id,
        "title": inc.title,
        "type": inc.incident_type,
        "type_name": type_name,
        "description": inc.description,
        "address": inc.address,
        "purok": inc.purok,
        "barangay": inc.barangay,
        "street": inc.street,
        "landmark": inc.landmark,
        "department": inc.department,
        "department_name": department_name,
        "status": inc.status,
        "created_at": inc.created_at,
        "photos": saved_photos_urls,
        "reporterName": getattr(inc, "reporter_name", None),
        "reporterPhone": getattr(inc, "reporter_phone", None),
        "reportedAt": inc.created_at,
    }


@router.get("/{incident_id}", response_model=schemas.IncidentOut)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    # --- Fetch incident ---
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # --- Access control ---
    if inc.reporter_id != current_user.id:
        role_name = getattr(getattr(current_user, "role", None), "name", None)
        if not (getattr(current_user, "is_admin", False) or role_name == "admin"):
            raise HTTPException(
                status_code=403, detail="Not authorized to view this incident"
            )

    # --- Resolve category and department names ---
    type_name = None
    department_name = None
    if inc.incident_type:
        cat = db.query(models.IncidentCategory).filter_by(id=inc.incident_type).first()
        type_name = cat.name if cat else None
    if inc.department:
        dept = db.query(models.Department).filter_by(id=inc.department).first()
        department_name = dept.name if dept else None

        # --- Prepare photos list from IncidentPhoto ---
    photos_list = []
    for p in inc.photos:
        if p.url:
            file_path = Path("uploads/incidents") / Path(p.url).name
            if file_path.exists():
                with open(file_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    photos_list.append(f"data:image/jpeg;base64,{encoded}")

    # --- Build response ---
    return {
        "id": inc.id,
        "reporter_id": inc.reporter_id,
        "title": inc.title,
        "type": inc.incident_type,
        "type_name": type_name,
        "description": inc.description,
        "address": inc.address,
        "purok": inc.purok,
        "barangay": inc.barangay,
        "street": inc.street,
        "landmark": inc.landmark,
        "department": inc.department,
        "department_name": department_name,
        "status": inc.status,
        "created_at": inc.created_at,
        "photos": photos_list,  # frontend can display these
        "reporterName": getattr(inc, "reporter_name", None),
        "reporterPhone": getattr(inc, "reporter_phone", None),
        "reportedAt": inc.created_at,
    }


@router.get("/me", response_model=List[schemas.IncidentOut])
def my_incidents(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    return crud.list_incidents_for_user(db, current_user.id, skip=skip, limit=limit)


# Admin: list all incidents ordered by date
@router.get("/admin/all", response_model=List[schemas.IncidentOut])
def all_incidents(
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100,
):
    return crud.list_incidents_all(db, skip=skip, limit=limit)


# file: your router (where you had the endpoint)
@router.put("/admin/{incident_id}/status", response_model=schemas.IncidentOut)
def update_status(
    incident_id: str,
    payload: schemas.IncidentStatusUpdate,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
) -> Any:
    # update incident (pass departmentId through)
    updated = crud.update_incident_status(
        db,
        incident_id,
        payload.new_status,
        admin.id,
        payload.comment or "",
        payload.departmentId,   # <- new: pass department id (may be None)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Incident not found")

    # create notification
    try:
        crud.create_notification(
            db,
            user_id=updated["reporter_id"],  # use reporter_id from the updated dict
            incident_id=updated["id"],  # use incident id
            message=payload.comment or "",
        )
    except Exception:
        print("[update_status] Failed to create notification")
        db.rollback()

    return updated
