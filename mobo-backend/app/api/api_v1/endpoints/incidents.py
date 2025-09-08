# app/api/api_v1/endpoints/incidents.py
import pathlib
from app import deps
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
    Body,
    Query
)
import uuid
from sqlalchemy.orm import Session
from typing import Any, List, Optional
import os, shutil
from app.db.session import get_db_session
from app.deps import get_current_user, get_current_admin
from datetime import datetime
from app import crud, schemas, models
import base64
from pathlib import Path
from sqlalchemy import inspect as sa_inspect
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
    barangay: Optional[int] = Form(None),
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
    barangay_id_assign = barangay
    if barangay and not barangay:
        brgy = db.query(models.Barangay).filter_by(id=barangay_id_assign).first()
        if brgy:
            barangay_id_assign = brgy.id
    inc_in = schemas.IncidentCreate(
        title=title,
        type=category_id,
        description=description,
        address=address,
        purok=purok,
        barangay=barangay_id_assign,
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
    current_user: models.User = Depends(deps.get_current_user),  # <-- use current user
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    role_name = (getattr(getattr(current_user, "role", None), "name", None) or "").lower()

    if role_name == "admin":
        # admins see everything
        return crud.list_incidents_all(db, skip=skip, limit=limit, department_id=None)

    if role_name == "staff":
        # staff must be assigned to a department
        if current_user.department_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Staff user has no department assigned."
            )
        return crud.list_incidents_all(
            db, skip=skip, limit=limit, department_id=current_user.department_id
        )

    # others are forbidden
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to view incidents."
    )

# file: your router (where you had the endpoint)
@router.put("/admin/{incident_id}/status", response_model=schemas.IncidentOut)
def update_status(
    incident_id: str,
    payload: schemas.IncidentStatusUpdate,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
) -> Any:
    print("admin user:", admin.id, getattr(admin, "name", None), admin)
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
    print("Updated incident:", updated)
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

# Reuse this if you already added a creator helper earlier
def _comment_text_key() -> str:
    # Works with your current model ("comment")
    mapper = sa_inspect(models.IncidentComment)
    cols = set(mapper.columns.keys())
    for k in ("message", "content", "body", "text", "comment", "note"):
        if k in cols:
            return k
    raise HTTPException(status_code=500, detail="IncidentComment has no text column.")

@router.get("/{incident_id}/comments", response_model=List[schemas.IncidentCommentOut])
def list_comments(
    incident_id: str,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(deps.get_current_user),
):
    # ensure incident exists
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")

    # permission: admin OK; staff only if same department; reporter OK
    role = (getattr(getattr(current_user, "role", None), "name", None) or "").lower()
    if role == "admin":
        pass
    elif role == "staff":
        if current_user.department_id != inc.department:
            raise HTTPException(403, "Not allowed for this department.")
    else:
        if current_user.id != inc.reporter_id:
            raise HTTPException(403, "Not allowed")

    text_key = _comment_text_key()

    # join user to get author name, order oldest->newest
    rows = (
        db.query(models.IncidentComment, models.User.name.label("author_name"))
        .outerjoin(models.User, models.IncidentComment.author_id == models.User.id)
        .filter(models.IncidentComment.incident_id == incident_id)
        .order_by(models.IncidentComment.created_at.asc())
        .all()
    )

    out: List[schemas.IncidentCommentOut] = []
    for c, author_name in rows:
        msg = getattr(c, text_key, None) or ""
        out.append(
            schemas.IncidentCommentOut(
                id=c.id,
                incident_id=c.incident_id,
                author_id=getattr(c, "author_id", None),
                author_name=author_name,
                comment=msg,
                created_at=getattr(c, "created_at", None).isoformat() if getattr(c, "created_at", None) else None,
            )
        )
    return out


@router.post(
    "/{incident_id}/re/comments",
    response_model=schemas.IncidentCommentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment / follow-up to an incident",
)
def post_comment(
    incident_id: str,
    payload: schemas.IncidentCommentCreate,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(deps.get_current_user),
):
    # 1) incident exists?
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # 2) permission: admin OK; staff must match dept; reporter OK
    role = (getattr(getattr(current_user, "role", None), "name", None) or "").lower()
    if role == "admin":
        pass
    elif role == "staff":
        if current_user.department_id != inc.department:
            raise HTTPException(status_code=403, detail="Not allowed for this department")
    else:
        if current_user.id != inc.reporter_id:
            raise HTTPException(status_code=403, detail="Not allowed")

    # 3) validate
    msg = (payload.comment or "").strip()
    if not msg:
        raise HTTPException(status_code=422, detail="Comment is required")

    # 4) insert (column name is "comment" in your model)
    text_key = _comment_text_key()  # will return "comment" for your model
    c = models.IncidentComment(
        incident_id=incident_id,
        author_id=current_user.id,
        **{text_key: msg},
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    # 5) author name (optional join avoided here for speed)
    author_name = getattr(current_user, "name", None)
    # create notification
    try:
        crud.create_notification(
            db,
            user_id=inc.reporter_id,  # use reporter_id from the updated dict
            incident_id=incident_id,  # use incident id
            message=payload.comment or "",
        )

    except Exception:
        print("[update_status] Failed to create notification")
        db.rollback()
    return schemas.IncidentCommentOut(
        id=str(c.id),
        incident_id=str(c.incident_id),
        author_id=str(c.author_id) if c.author_id else None,
        author_name=author_name,
        comment=getattr(c, text_key, ""),
        created_at=c.created_at.isoformat() if getattr(c, "created_at", None) else None,
    )