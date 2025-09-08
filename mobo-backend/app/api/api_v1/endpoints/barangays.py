from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.inspection import inspect as sa_inspect

from app.deps import get_current_user, get_current_admin
from app import models, schemas
from app.db import session as dbsession

router = APIRouter()

def get_db_session():
    db = dbsession.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _has_code_column() -> bool:
    """Return True if Barangay model has a 'code' column."""
    try:
        return "code" in set(sa_inspect(models.Barangay).columns.keys())
    except Exception:
        return False

# ---------- LIST ----------
@router.get("/", response_model=List[schemas.BarangayOut])
def list_barangays(
    db: Session = Depends(get_db_session),
    _: models.User = Depends(get_current_admin),  # keep admin-only list per your current code
    q: Optional[str] = Query(None, description="Search by name or code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    has_code = _has_code_column()
    query = db.query(models.Barangay)

    if q:
        like = f"%{q.strip()}%"
        name_filter = func.lower(models.Barangay.name).like(func.lower(like))
        if has_code:
            code_filter = func.lower(models.Barangay.code).like(func.lower(like))
            query = query.filter(name_filter | code_filter)
        else:
            query = query.filter(name_filter)

    rows = (
        query.order_by(models.Barangay.name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    # use getattr to be safe if 'code' column doesn't exist
    return [schemas.BarangayOut(id=r.id, name=r.name, code=getattr(r, "code", None)) for r in rows]

# ---------- CREATE (admin only) ----------
@router.post("/", response_model=schemas.BarangayOut, status_code=status.HTTP_201_CREATED)
def create_barangay(
    payload: schemas.BarangayCreate,
    db: Session = Depends(get_db_session),
    _: models.User = Depends(get_current_admin),
):
    has_code = _has_code_column()

    # unique name
    exists = (
        db.query(models.Barangay)
        .filter(func.lower(models.Barangay.name) == payload.name.strip().lower())
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Barangay name already exists")

    # unique code (only if column exists and payload has code)
    if has_code and payload.code:
        code_exists = (
            db.query(models.Barangay)
            .filter(func.lower(models.Barangay.code) == payload.code.strip().lower())
            .first()
        )
        if code_exists:
            raise HTTPException(status_code=409, detail="Barangay code already exists")

    # construct safely (don't pass code if column doesn't exist)
    b = models.Barangay(name=payload.name.strip())
    if has_code:
        setattr(b, "code", payload.code.strip() if payload.code else None)

    db.add(b)
    db.commit()
    db.refresh(b)

    return schemas.BarangayOut(id=b.id, name=b.name, code=getattr(b, "code", None))

# ---------- UPDATE (admin only) ----------
@router.put("/{barangay_id}", response_model=schemas.BarangayOut)
def update_barangay(
    barangay_id: int,
    payload: schemas.BarangayUpdate,
    db: Session = Depends(get_db_session),
    _: models.User = Depends(get_current_admin),
):
    has_code = _has_code_column()

    b = db.query(models.Barangay).filter(models.Barangay.id == barangay_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Barangay not found")

    # update name if changed
    if payload.name and payload.name.strip().lower() != b.name.lower():
        dup = (
            db.query(models.Barangay)
            .filter(func.lower(models.Barangay.name) == payload.name.strip().lower())
            .first()
        )
        if dup:
            raise HTTPException(status_code=409, detail="Barangay name already exists")
        b.name = payload.name.strip()

    # update code only if the column exists and a value was provided
    if has_code and (payload.code is not None):
        new_code = payload.code.strip() if payload.code else None
        cur_code = getattr(b, "code", None)
        if (new_code or "") != (cur_code or ""):
            if new_code:
                dupc = (
                    db.query(models.Barangay)
                    .filter(func.lower(models.Barangay.code) == new_code.lower())
                    .first()
                )
                if dupc and dupc.id != b.id:
                    raise HTTPException(status_code=409, detail="Barangay code already exists")
            setattr(b, "code", new_code)

    db.commit()
    db.refresh(b)
    return schemas.BarangayOut(id=b.id, name=b.name, code=getattr(b, "code", None))


@router.get("/public", response_model=List[schemas.BarangayOut])
def public_list_barangays(
    db: Session = Depends(get_db_session),
    q: Optional[str] = Query(None, description="Search by name or code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):


    has_code = "code" in set(sa_inspect(models.Barangay).columns.keys())
    query = db.query(models.Barangay)
    if q:
        like = f"%{q}%"
        name_filter = func.lower(models.Barangay.name).like(func.lower(like))
        if has_code:
            code_filter = func.lower(models.Barangay.code).like(func.lower(like))
            query = query.filter(name_filter | code_filter)
        else:
            query = query.filter(name_filter)

    rows = query.order_by(models.Barangay.name.asc()).offset(skip).limit(limit).all()
    return [schemas.BarangayOut(id=r.id, name=r.name, code=getattr(r, "code", None)) for r in rows]


# ---------- DELETE (admin only) ----------
@router.delete("/{barangay_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_barangay(
    barangay_id: int,
    db: Session = Depends(get_db_session),
    _: models.User = Depends(get_current_admin),
):
    b = db.query(models.Barangay).filter(models.Barangay.id == barangay_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Barangay not found")

    db.delete(b)
    db.commit()
    return
