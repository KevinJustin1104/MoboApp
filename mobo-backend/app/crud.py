# app/crud.py
from http.client import HTTPException
from operator import or_
import os
from pathlib import Path
from sqlite3 import IntegrityError
import uuid
from sqlalchemy.orm import Session, joinedload
from app import models, schemas
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from app.core.security import hash_password
import base64
from sqlalchemy import func, or_    

# Users
def create_user(
    db: Session, name: str, email: str, password: str, phone: str | None, role_id: int
):
    hashed = hash_password(password)
    user = models.User(
        name=name,
        email=email,
        password=hashed,
        phone=phone,
        role_id=role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Return the user fetched with the role relationship eagerly loaded
    user_with_role = (
        db.query(models.User)
        .options(joinedload(models.User.role))
        .filter(models.User.id == user.id)
        .first()
    )
    return user_with_role


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user(db: Session, user_id: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def list_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()


# Incidents


def incident_to_out(db: Session, inc: models.Incident) -> Dict:
    # type name
    type_name = None
    if getattr(inc, "incident_type", None):
        cat = db.query(models.IncidentCategory).filter_by(id=inc.incident_type).first()
        type_name = cat.name if cat else None
    # department name
    department_name = None
    if getattr(inc, "department", None):
        dept = db.query(models.Department).filter_by(id=inc.department).first()
        department_name = dept.name if dept else None
    # photos
    photo_b64_list = []
    for p in getattr(inc, "photos", []) or []:
        try:
            storage_path = getattr(p, "storage_path", None) or getattr(p, "file_path", None) or getattr(p, "url", None)
            if storage_path:
                fp = Path(storage_path)
                if not fp.exists():
                    candidate = Path(os.getcwd()) / "uploads" / fp.name
                    if candidate.exists(): fp = candidate
                if fp.exists():
                    with open(fp, "rb") as f:
                        encoded = base64.b64encode(f.read()).decode("utf-8")
                        photo_b64_list.append(f"data:image/jpeg;base64,{encoded}")
        except Exception: pass

    # reporter (optional)
    reporter_name = getattr(inc, "reporter_name", None)
    reporter_phone = getattr(inc, "reporter_phone", None)

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
        "status": (inc.status.capitalize() if inc.status else "Submitted"),
        "created_at": inc.created_at,
        "photos": photo_b64_list,
        "reporterName": reporter_name,
        "reporterPhone": reporter_phone,
        "reportedAt": inc.created_at,
    }

def create_incident(db: Session, reporter_id: str, inc_in: schemas.IncidentCreate):
    """
    Create and persist an Incident.
    Maps Pydantic `type` -> SQLAlchemy `incident_type`.
    """
    incident_type_val = str(inc_in.type) if inc_in.type is not None else None
    department_val = (
        str(inc_in.department_id) if inc_in.department_id is not None else None
    )
    print(inc_in)
    inc = models.Incident(
        reporter_id=reporter_id,
        title=inc_in.title,
        description=inc_in.description,
        incident_type=incident_type_val,
        department=department_val,
        purok=inc_in.purok,
        barangay=inc_in.barangay,
        street=inc_in.street,
        landmark=inc_in.landmark,
        address=inc_in.address,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc


def list_incidents_for_user(db: Session, user_id: str, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Incident)
        .filter(models.Incident.reporter_id == user_id)
        .order_by(models.Incident.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def latest_announcements(db: Session, limit: int = 5) -> List[models.Announcement]:
    """
    Return active announcements ordered newest first.
    Also attach image_url if an AnnouncementImage exists.
    """
    anns = (
        db.query(models.Announcement)
        .filter(models.Announcement.is_active == True)
        .order_by(models.Announcement.created_at.desc())
        .limit(limit)
        .all()
    )

    # attach image_url from announcement_images if present
    for a in anns:
        img = (
            db.query(models.AnnouncementImage)
            .filter(models.AnnouncementImage.announcement_id == a.id)
            .order_by(models.AnnouncementImage.id)  # you can change ordering
            .first()
        )
        if img:
            # if you store file path, expose relative static URL
            # convert storage_path -> /uploads/<basename>
            a.image_url = img.url or ("/uploads/" + os.path.basename(img.storage_path))
        else:
            a.image_url = None
    return anns


def create_announcement(
    db: Session,
    author_id: str,
    title: str,
    body: str,
    image_storage_path: Optional[str] = None,
) -> models.Announcement:
    """
    Create announcement; optionally create AnnouncementImage row and attach 'image_url'
    to the returned object.
    """
    a = models.Announcement(author_id=author_id, title=title, body=body)
    db.add(a)
    db.commit()
    db.refresh(a)

    if image_storage_path:
        # store AnnouncementImage; url is exposed to client as /uploads/<filename>
        from os.path import basename

        url = "/uploads/" + basename(image_storage_path)
        ai = models.AnnouncementImage(
            announcement_id=a.id,
            storage_path=image_storage_path,
            url=url,
        )
        db.add(ai)
        db.commit()
        db.refresh(ai)
        # attach image_url property for serialization
        a.image_url = ai.url
    else:
        a.image_url = None

    return a


def get_announcement_by_id(
    db: Session, announcement_id: str
) -> Optional[models.Announcement]:
    a = (
        db.query(models.Announcement)
        .filter(models.Announcement.id == announcement_id)
        .first()
    )
    if not a:
        return None
    img = (
        db.query(models.AnnouncementImage)
        .filter(models.AnnouncementImage.announcement_id == a.id)
        .order_by(models.AnnouncementImage.id)
        .first()
    )
    a.image_url = img.url if img else None
    return a


def get_incident(db: Session, incident_id: str):
    return db.query(models.Incident).filter(models.Incident.id == incident_id).first()


def update_incident_status(
    db: Session,
    incident_id: str,
    new_status: str,
    admin_id: str,
    comment_text: str,
    department_id: Optional[int] = None,   # <-- new param
) -> Optional[dict]:
    inc = get_incident(db, incident_id)
    if not inc:
        return None
    print(f"current messages: {[c.comment for c in getattr(inc, 'comments', [])]}")
    # Add comment
    if comment_text:
        comment = models.IncidentComment(
            id=str(uuid.uuid4()),
            incident_id=incident_id,
            author_id=admin_id,
            comment=comment_text,
            created_at=datetime.utcnow(),
        )
        db.add(comment)

    # Update status & optionally update department
    try:
        inc.status = new_status
        # If department_id is provided (explicitly None allowed), set it;
        # if department_id is None and you want to *clear* the department, this will set it to None.
        # If you prefer to leave it unchanged when not supplied, check `if department_id is not None: ...`.
        if department_id is not None:
            inc.department = department_id
        inc.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(inc)
    except Exception:
        db.rollback()
        raise

    # Convert photos to list of strings (urls or base64)
    photos_list = []
    for p in inc.photos or []:
        if getattr(p, "url", None):
            photos_list.append(str(p.url))
        else:
            storage_path = getattr(p, "storage_path", None) or getattr(p, "file_path", None)
            if storage_path and Path(storage_path).exists():
                with open(storage_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    photos_list.append(f"data:image/jpeg;base64,{encoded}")

    # --- NEW: fetch reporter user by reporter_id ---
    reporter_name = None
    reporter_phone = None
    try:
        if inc.reporter_id:
            reporter = db.query(models.User).filter(models.User.id == inc.reporter_id).first()
            if reporter:
                reporter_name = reporter.name
                reporter_phone = reporter.phone
    except Exception:
        # fallback if lookup fails
        reporter_name = getattr(inc, "reporter_name", None)
        reporter_phone = getattr(inc, "reporter_phone", None)

    if not reporter_name:
        reporter_name = getattr(inc, "reporter_name", None)
    if not reporter_phone:
        reporter_phone = getattr(inc, "reporter_phone", None)

    # --- NEW: department name lookup (if department present) ---
    department_name = None
    try:
        if inc.department is not None:
            dept = db.query(models.Department).filter(models.Department.id == inc.department).first()
            if dept:
                department_name = dept.name
    except Exception:
        department_name = None

    # Return a dict that matches your Pydantic schema (add department_name)
    return {
        "id": inc.id,
        "reporter_id": inc.reporter_id,
        "title": inc.title,
        "type": inc.incident_type,
        "description": inc.description,
        "address": inc.address,
        "purok": inc.purok,
        "barangay": inc.barangay,
        "street": inc.street,
        "landmark": inc.landmark,
        "department": inc.department,
        "department_name": department_name,
        "status": inc.status.capitalize() if inc.status else "Submitted",
        "created_at": inc.created_at,
        "photos": photos_list,
        "reporterName": reporter_name,
        "reporterPhone": reporter_phone,
        "reportedAt": inc.created_at,
    }

# Incident photos
def add_incident_photo(
    db: Session, incident_id: str, storage_path: str, url: Optional[str] = None
):
    p = models.IncidentPhoto(
        id=str(__import__("uuid").uuid4()),
        incident_id=incident_id,
        storage_path=storage_path,
        url=url,
        created_at=datetime.utcnow(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# Announcements
def create_announcement(
    db: Session, author_id: str, title: str, body: str, image_url: Optional[str] = None
):
    a = models.Announcement(
        id=str(__import__("uuid").uuid4()),
        author_id=author_id,
        title=title,
        body=body,
        image_url=image_url,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def latest_announcements(db: Session, limit: int = 5):
    return (
        db.query(models.Announcement)
        .order_by(models.Announcement.created_at.desc())
        .limit(limit)
        .all()
    )


# Notifications
def create_notification(
    db: Session, user_id: str, incident_id: Optional[str], message: str
):
    n = models.Notification(
        id=str(__import__("uuid").uuid4()),
        user_id=user_id,
        incident_id=incident_id,
        message=message,
        read=False,
        created_at=datetime.utcnow(),
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def list_notifications_for_user(
    db: Session, user_id: str, skip: int = 0, limit: int = 100
):
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user_id)
        .order_by(models.Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def mark_notification_read(db: Session, notification_id: str):
    n = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id)
        .first()
    )
    if not n:
        return None
    n.read = True
    db.commit()
    db.refresh(n)
    return n


def image_to_base64(file_path: str) -> str:
    """Convert image file to base64 string"""
    try:
        with open(file_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
            return f"data:image/jpeg;base64,{encoded}"  # include mime type
    except Exception as e:
        print("Error encoding image:", e)
        return ""

def list_incidents_all(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    department_id: Optional[int] = None,   # <--- NEW
) -> List[Dict]:
    q = db.query(models.Incident)
    if department_id is not None:
        q = q.filter(models.Incident.department == department_id)

    incidents = (
        q.order_by(models.Incident.created_at.desc())
         .offset(skip)
         .limit(limit)
         .all()
    )

    # (rest of your function unchanged) ...
    reporter_ids = {inc.reporter_id for inc in incidents if getattr(inc, "reporter_id", None)}
    users_by_id = {}
    if reporter_ids:
        users = db.query(models.User).filter(models.User.id.in_(list(reporter_ids))).all()
        users_by_id = {u.id: u for u in users}

    result = []
    for inc in incidents:
        type_name = None
        if getattr(inc, "incident_type", None):
            cat = db.query(models.IncidentCategory).filter_by(id=inc.incident_type).first()
            type_name = cat.name if cat else None

        department_name = None
        if getattr(inc, "department", None):
            dept = db.query(models.Department).filter_by(id=inc.department).first()
            department_name = dept.name if dept else None

        photo_b64_list = []
        for p in getattr(inc, "photos", []) or []:
            try:
                storage_path = (
                    getattr(p, "storage_path", None)
                    or getattr(p, "file_path", None)
                    or getattr(p, "url", None)
                )
                if storage_path:
                    fp = Path(storage_path)
                    if not fp.exists():
                        candidate = Path(os.getcwd()) / "uploads" / fp.name
                        if candidate.exists():
                            fp = candidate
                    if fp.exists():
                        with open(fp, "rb") as f:
                            encoded = base64.b64encode(f.read()).decode("utf-8")
                            photo_b64_list.append(f"data:image/jpeg;base64,{encoded}")
                # else: silently skip
            except Exception as e:
                print(f"[list_incidents_all] Failed to process photo for incident {inc.id}: {e}")

        reporter_name = None
        reporter_phone = None
        if getattr(inc, "reporter_id", None):
            user = users_by_id.get(inc.reporter_id)
            if user:
                reporter_name = user.name
                reporter_phone = user.phone

        if not reporter_name:
            reporter_name = getattr(inc, "reporter_name", None)
        if not reporter_phone:
            reporter_phone = getattr(inc, "reporter_phone", None)

        result.append(
            {
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
                "status": (inc.status.capitalize() if inc.status else "Submitted"),
                "created_at": inc.created_at,
                "photos": photo_b64_list,
                "reporterName": reporter_name,
                "reporterPhone": reporter_phone,
                "reportedAt": inc.created_at,
            }
        )

    return result

def get_incident_category(db: Session, category_id: int) -> Optional[models.IncidentCategory]:
    return db.query(models.IncidentCategory).filter(models.IncidentCategory.id == category_id).first()

def get_incident_categories(db: Session) -> List[models.IncidentCategory]:
    return db.query(models.IncidentCategory).order_by(models.IncidentCategory.name).all()

def create_incident_category(db: Session, name: str, department_id: Optional[int] = None, urgency_level: Optional[int] = None) -> models.IncidentCategory:
    cat = models.IncidentCategory(name=name, department_id=department_id, urgency_level=urgency_level)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

def update_incident_category(db: Session, category_id: int, name: Optional[str] = None, department_id: Optional[int] = None, urgency_level: Optional[int] = None) -> Optional[models.IncidentCategory]:
    cat = db.query(models.IncidentCategory).filter(models.IncidentCategory.id == category_id).first()
    if not cat:
        return None
    if name is not None:
        cat.name = name
    # allow setting department_id to None explicitly
    if department_id is not None or (department_id is None and hasattr(cat, "department_id")):
        cat.department_id = department_id
    if urgency_level is not None:
        cat.urgency_level = urgency_level
    db.commit()
    db.refresh(cat)
    return cat

def delete_incident_category(db: Session, category_id: int) -> bool:
    cat = db.query(models.IncidentCategory).filter(models.IncidentCategory.id == category_id).first()
    if not cat:
        return False
    db.delete(cat)
    db.commit()
    return True


def _get_or_create_role(db: Session, name: str) -> models.Role:
    role = db.query(models.Role).filter(models.Role.name == name).first()
    if role:
        return role
    role = models.Role(name=name)
    db.add(role)
    db.flush()
    return role

def create_staff_for_department(
    db: Session, department_id: int, payload: schemas.StaffCreate
) -> models.User:
    dept = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    role_user = _get_or_create_role(db, "user")

    user = models.User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password=hash_password(payload.password),  # store HASH
        role_id=role_user.id,
        department_id=dept.id,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(user)
    return user

def list_staff(
    db: Session,
    q: Optional[str] = None,
    department_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    sort: str = "-created",                         # "-created" or "created"
    role_names: Optional[List[str]] = None,         # <--- accept multiple roles
) -> Tuple[List[Tuple[models.User, Optional[str]]], int]:
    base = (
        db.query(models.User, models.Department.name.label("department_name"))
        .outerjoin(models.Department, models.User.department_id == models.Department.id)
        .outerjoin(models.Role, models.User.role_id == models.Role.id)
    )

    # Filter by roles, if provided
    if role_names:
        lowered = [r.lower() for r in role_names]
        base = base.filter(func.lower(models.Role.name).in_(lowered))

    if department_id:
        base = base.filter(models.User.department_id == department_id)

    if q:
        like = f"%{q}%"
        base = base.filter(
            or_(
                models.User.name.ilike(like),
                models.User.email.ilike(like),
                models.Department.name.ilike(like),
            )
        )

    ordered = base.order_by(
        models.User.created_at.asc() if sort == "created" else models.User.created_at.desc()
    )

    # Accurate total with joins: count distinct users after filters
    subq = base.with_entities(models.User.id).distinct().subquery()
    total = db.query(func.count()).select_from(subq).scalar() or 0

    rows = ordered.limit(limit).offset(offset).all()
    return rows, total