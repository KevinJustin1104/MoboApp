# app/routers/announcements.py
import os, shutil, uuid, base64, mimetypes
from urllib.parse import urlparse, unquote
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from pathlib import Path
import shutil

from app.db.session import get_db_session
from app.deps import get_current_admin, get_current_user
from app import crud, models, schemas

router = APIRouter()

# Resolve uploads dir robustly (works on Windows too)
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # app/routers/ -> app -> <root>
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def _path_from_image_url(image_url: Optional[str]) -> Optional[Path]:
    """
    Accepts absolute or relative URLs. Returns a Path inside UPLOAD_DIR if possible.
    Handles %20, extra path parts, etc.
    """
    if not image_url:
        return None

    # Parse and keep only path
    p = urlparse(image_url).path if "://" in image_url else image_url
    # Expect something like "/uploads/<filename>" or "uploads/<filename>"
    if p.startswith("/"):
        p = p[1:]
    # normalize and ensure it begins with "uploads/"
    if not p.lower().startswith("uploads/"):
        return None

    # Extract only the final filename part, decode %xx
    filename = os.path.basename(p)  # protects against traversal
    filename = unquote(filename)    # turn %20 into spaces

    candidate = UPLOAD_DIR / filename
    if candidate.is_file():
        return candidate

    # Fallback: try to match by name ignoring spaces normalization
    # (in case a previous save normalized spaces/characters)
    try:
        for f in UPLOAD_DIR.iterdir():
            if f.name == filename:
                return f
    except Exception:
        pass

    return None

def _file_to_data_uri(path: Path) -> Optional[str]:
    try:
        raw = path.read_bytes()
        mime, _ = mimetypes.guess_type(str(path))
        mime = mime or "image/jpeg"
        b64 = base64.b64encode(raw).decode("utf-8")
        return f"data:{mime};base64,{b64}"
    except Exception:
        return None

def _embed_image_data_uri(image_url: Optional[str]) -> Optional[str]:
    path = _path_from_image_url(image_url)
    if not path:
        return None
    return _file_to_data_uri(path)

@router.get("/latest", response_model=List[schemas.AnnouncementOut])
def latest(db: Session = Depends(get_db_session), limit: int = 5):
    items = crud.latest_announcements(db, limit=limit)
    out: List[schemas.AnnouncementOut] = []
    for a in items:
        d = schemas.AnnouncementOut.from_orm(a).dict()
        d["image_data_uri"] = _embed_image_data_uri(a.image_url)
        out.append(schemas.AnnouncementOut(**d))
    return out

@router.get("/{announcement_id}", response_model=schemas.AnnouncementOut)
def get_announcement(announcement_id: str, db: Session = Depends(get_db_session)):
    a = crud.get_announcement_by_id(db, announcement_id)
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    d = schemas.AnnouncementOut.from_orm(a).dict()
    d["image_data_uri"] = _embed_image_data_uri(a.image_url)
    return schemas.AnnouncementOut(**d)

# ---------- Admin: create / update keep storing the file on disk ----------

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
        # Normalize filename a bit to avoid weird path chars
        clean_name = file.filename.replace("\\", "_").replace("/", "_")
        filename = f"announcement_{uuid.uuid4()}_{clean_name}"
        path = UPLOAD_DIR / filename
        with path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        image_url = f"/uploads/{filename}"

    a = crud.create_announcement(db, author_id=admin.id, title=title, body=body, image_url=image_url)
    d = schemas.AnnouncementOut.from_orm(a).dict()
    d["image_data_uri"] = _embed_image_data_uri(a.image_url)
    try:
        crud.create_notification(
            db,
            user_id=a.author_id,  # use reporter_id from the updated dict
            announcement_id=a.id,  # use incident id
            message=title or "",
        )

    except Exception:
        print("[update_status] Failed to create announcement notification")
        db.rollback()
    return schemas.AnnouncementOut(**d)

@router.put("/{announcement_id}", response_model=schemas.AnnouncementOut)
def update_announcement(
    announcement_id: str,
    title: Optional[str] = Form(None),
    body: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    fields = {}
    if title is not None:
        fields["title"] = title
    if body is not None:
        fields["body"] = body
    if file:
        clean_name = file.filename.replace("\\", "_").replace("/", "_")
        filename = f"announcement_{uuid.uuid4()}_{clean_name}"
        path = UPLOAD_DIR / filename
        with path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        fields["image_url"] = f"/uploads/{filename}"

    a = crud.update_announcement(db, announcement_id, **fields)
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")

    d = schemas.AnnouncementOut.from_orm(a).dict()
    d["image_data_uri"] = _embed_image_data_uri(a.image_url)
    try:
        crud.create_notification(
            db,
            user_id=a.author_id,  # use reporter_id from the updated dict
            announcement_id=a.id,  # use incident id
            message=title or "",
        )

    except Exception:
        print("[update_status] Failed to create announcement notification")
        db.rollback()
    return schemas.AnnouncementOut(**d)

def _author_name(db: Session, c) -> Optional[str]:
    # Prefer the eager-loaded relationship
    try:
        if getattr(c, "author", None) and getattr(c.author, "name", None):
            return c.author.name
    except Exception:
        pass

    # Fallback: direct lookup by author_id (covers cases where relationship didn't load
    # or the comment row was created when the users table didn't have that record yet)
    if getattr(c, "author_id", None):
        u = db.query(models.User).filter(models.User.id == c.author_id).first()
        if u and getattr(u, "name", None):
            return u.name
    return None
# --- Comments (user + admin/staff) ---
@router.get("/{announcement_id}/comments", response_model=List[schemas.AnnouncementCommentOut])
def list_comments(announcement_id: str, db: Session = Depends(get_db_session), user=Depends(get_current_user)):
    flat = crud.list_announcement_comments(db, announcement_id)
    tree = crud.build_comment_tree(flat)

    def ser(c):
        return {
            "id": c.id,
            "author_id": c.author_id,
            "author_name": _author_name(db, c),  # ← use resolver
            "comment": c.comment,
            "created_at": c.created_at,
            "parent_id": c.parent_id,
            "replies": [ser(r) for r in getattr(c, "replies", [])],
        }

    return [ser(c) for c in tree]

@router.post("/{announcement_id}/comments", response_model=schemas.AnnouncementCommentOut)
def post_comment(
    announcement_id: str,
    payload: schemas.AnnouncementCommentCreate,
    db: Session = Depends(get_db_session),
    user=Depends(get_current_user),
):
    if payload.parent_id:
        flat = crud.list_announcement_comments(db, announcement_id)
        if payload.parent_id not in [c.id for c in flat]:
            raise HTTPException(status_code=400, detail="Invalid parent_id")

    c = crud.create_announcement_comment(
        db,
        announcement_id=announcement_id,
        author_id=getattr(user, "id", None),
        comment=payload.comment.strip(),
        parent_id=payload.parent_id,
    )

    # Return with the user’s current name without relying on relationship load
    return {
        "id": c.id,
        "author_id": c.author_id,
        "author_name": getattr(user, "name", None),  # ← real name here
        "comment": c.comment,
        "created_at": c.created_at,
        "parent_id": c.parent_id,
        "replies": [],
    }
