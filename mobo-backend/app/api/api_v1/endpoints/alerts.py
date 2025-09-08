# app/api/api_v1/endpoints/alerts.py
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.deps import get_current_user, get_current_admin
from app.db import session as dbsession
from app import models, schemas

router = APIRouter()

def get_db_session():
    db = dbsession.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.AlertOut, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: schemas.AlertCreate,
    db: Session = Depends(get_db_session),
    _: models.User = Depends(get_current_admin),
):
    # optional: parse/validate valid_until if it arrived as string
    vu = payload.valid_until
    # if client sends "YYYY-MM-DD HH:mm" you can parse it:
    # try:
    #     if isinstance(vu, str):
    #         vu = datetime.fromisoformat(vu.replace(" ", "T"))
    # except:
    #     raise HTTPException(422, detail="Invalid valid_until format")

    now = datetime.utcnow()
    a = models.Alert(
        title=payload.title.strip(),
        body=payload.body or None,
        severity=payload.severity or "info",
        category=payload.category or None,
        barangay=payload.barangay or None,
        purok=payload.purok or None,
        source=payload.source or None,
        valid_until=vu if isinstance(vu, datetime) else None,
        created_at=now,
        updated_at=now,
    )
    db.add(a)
    db.commit()
    db.refresh(a)

    # OPTIONAL: Fan-out to your existing notifications table/push system here.
    # If you have a Notifications model, you could:
    # _fanout_alert_as_notifications(db, a)

    return schemas.AlertOut(
        id=a.id,
        title=a.title,
        body=a.body,
        severity=a.severity,
        category=a.category,
        barangay=a.barangay,
        purok=a.purok,
        source=a.source,
        valid_until=a.valid_until.isoformat() if a.valid_until else None,
        created_at=a.created_at.isoformat() if a.created_at else None,
        updated_at=a.updated_at.isoformat() if a.updated_at else None,
    )


def _resolve_barangay_name(db: Session, barangay: Optional[str], barangay_id: Optional[int]) -> Optional[str]:
    """If barangay_id is given, return its canonical name; else keep provided barangay string."""
    if barangay_id is not None:
        b = db.query(models.Barangay).filter(models.Barangay.id == barangay_id).first()
        if not b:
            raise HTTPException(status_code=404, detail="Barangay id not found")
        return b.name
    return barangay

def _best_effort_barangay_ids(db: Session, names: List[str]) -> dict[str, int]:
    if not names:
        return {}
    lower_names = [n.lower() for n in names if n]
    rows = db.query(models.Barangay).filter(func.lower(models.Barangay.name).in_(lower_names)).all()
    return {r.name.lower(): r.id for r in rows}

# ---------- LIST ----------
@router.get("/", response_model=List[schemas.AlertOut])
def list_alerts(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    since: Optional[datetime] = Query(None, description="Return alerts created after this timestamp"),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    barangay: Optional[str] = Query(None),
    barangay_id: Optional[int] = Query(None),
):
    # id -> name
    if barangay_id is not None and barangay is None:
        b = db.query(models.Barangay).filter(models.Barangay.id == barangay_id).first()
        if not b:
            raise HTTPException(404, "Barangay id not found")
        barangay = b.name

    q = db.query(models.Alert)
    if since:
        q = q.filter(models.Alert.created_at > since)
    if category:
        q = q.filter(func.lower(models.Alert.category) == category.lower())
    if severity:
        q = q.filter(func.lower(models.Alert.severity) == severity.lower())
    if barangay:
        q = q.filter(func.lower(models.Alert.barangay) == barangay.lower())

    rows = q.order_by(models.Alert.created_at.desc()).limit(limit).all()
    id_by_name = _best_effort_barangay_ids(db, [r.barangay for r in rows if r.barangay])

    return [
        schemas.AlertOut(
            id=r.id,
            title=r.title,
            body=r.body,
            severity=r.severity,
            category=r.category,
            barangay=r.barangay,
            barangay_id=id_by_name.get((r.barangay or "").lower()),
            purok=r.purok,
            source=r.source,
            valid_until=r.valid_until,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]

# ---------- GET ONE ----------
@router.get("/{alert_id}", response_model=schemas.AlertOut)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(get_current_user),
):
    r = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not r:
        raise HTTPException(404, "Alert not found")
    bmap = _best_effort_barangay_ids(db, [r.barangay] if r.barangay else [])
    return schemas.AlertOut(
        id=r.id, title=r.title, body=r.body, severity=r.severity, category=r.category,
        barangay=r.barangay, barangay_id=bmap.get((r.barangay or "").lower()),
        purok=r.purok, source=r.source, valid_until=r.valid_until,
        created_at=r.created_at, updated_at=r.updated_at
    )

# ---------- CREATE (admin) ----------
@router.post("/", response_model=schemas.AlertOut, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: schemas.AlertCreate,
    db: Session = Depends(get_db_session),
    _: models.User = Depends(get_current_admin),
):
    resolved_name = _resolve_barangay_name(db, payload.barangay, payload.barangay_id)
    r = models.Alert(
        title=payload.title,
        body=payload.body,
        severity=payload.severity or "info",
        category=payload.category,
        barangay=resolved_name,
        purok=payload.purok,
        source=payload.source,
        valid_until=payload.valid_until,
    )
    db.add(r)
    db.commit()
    db.refresh(r)

    bmap = _best_effort_barangay_ids(db, [resolved_name] if resolved_name else [])
    return schemas.AlertOut(
        id=r.id, title=r.title, body=r.body, severity=r.severity, category=r.category,
        barangay=r.barangay, barangay_id=bmap.get((resolved_name or "").lower()),
        purok=r.purok, source=r.source, valid_until=r.valid_until,
        created_at=r.created_at, updated_at=r.updated_at
    )

# ---------- UPDATE (admin) ----------
@router.put("/{alert_id}", response_model=schemas.AlertOut)
def update_alert(
    alert_id: str,
    payload: schemas.AlertUpdate,
    db: Session = Depends(get_db_session),
    _: models.User = Depends(get_current_admin),
):
    r = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not r:
        raise HTTPException(404, "Alert not found")

    if payload.barangay_id is not None or payload.barangay is not None:
        r.barangay = _resolve_barangay_name(db, payload.barangay, payload.barangay_id)

    if payload.title is not None: r.title = payload.title
    if payload.body is not None: r.body = payload.body
    if payload.severity is not None: r.severity = payload.severity
    if payload.category is not None: r.category = payload.category
    if payload.purok is not None: r.purok = payload.purok
    if payload.source is not None: r.source = payload.source
    if payload.valid_until is not None: r.valid_until = payload.valid_until
    db.commit()
    db.refresh(r)

    bmap = _best_effort_barangay_ids(db, [r.barangay] if r.barangay else [])
    return schemas.AlertOut(
        id=r.id, title=r.title, body=r.body, severity=r.severity, category=r.category,
        barangay=r.barangay, barangay_id=bmap.get((r.barangay or "").lower()),
        purok=r.purok, source=r.source, valid_until=r.valid_until,
        created_at=r.created_at, updated_at=r.updated_at
    )

# ---------- READS ----------
@router.get("/reads/me", response_model=schemas.AlertReadIdsOut)
def get_my_reads(
    db: Session = Depends(get_db_session),
    user: models.User = Depends(get_current_user),
):
    rows = db.query(models.AlertRead.alert_id).filter(models.AlertRead.user_id == user.id).all()
    return schemas.AlertReadIdsOut(ids=[r[0] for r in rows])

@router.post("/{alert_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    alert_id: str,
    db: Session = Depends(get_db_session),
    user: models.User = Depends(get_current_user),
):
    exists = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not exists:
        raise HTTPException(404, "Alert not found")

    already = db.query(models.AlertRead)\
        .filter(models.AlertRead.alert_id == alert_id, models.AlertRead.user_id == user.id)\
        .first()
    if not already:
        db.add(models.AlertRead(alert_id=alert_id, user_id=user.id))
        db.commit()
    return

# ---------- PREFERENCES ----------
@router.get("/preferences/me", response_model=schemas.AlertPreferenceOut)
def get_prefs(
    db: Session = Depends(get_db_session),
    user: models.User = Depends(get_current_user),
):
    p = db.query(models.AlertPreference).filter(models.AlertPreference.user_id == user.id).first()
    if not p:
        # defaults (all on, no barangay)
        return schemas.AlertPreferenceOut(
            baha=True, bagyo=True, brownout=True, road=True,
            barangay=None, barangay_id=None, silent_start_min=None, silent_end_min=None
        )

    barangay_id = None
    if p.barangay:
        b = db.query(models.Barangay).filter(func.lower(models.Barangay.name) == p.barangay.lower()).first()
        barangay_id = b.id if b else None

    return schemas.AlertPreferenceOut(
        baha=bool(p.baha), bagyo=bool(p.bagyo), brownout=bool(p.brownout), road=bool(p.road),
        barangay=p.barangay, barangay_id=barangay_id,
        silent_start_min=p.silent_start_min, silent_end_min=p.silent_end_min
    )

@router.put("/preferences/me", response_model=schemas.AlertPreferenceOut)
def update_prefs(
    payload: schemas.AlertPreferenceUpdate,
    db: Session = Depends(get_db_session),
    user: models.User = Depends(get_current_user),
):
    p = db.query(models.AlertPreference).filter(models.AlertPreference.user_id == user.id).first()
    if not p:
        p = models.AlertPreference(user_id=user.id)
        db.add(p)
        db.flush()

    # barangay name from id overrides any string
    if payload.barangay_id is not None or payload.barangay is not None:
        p.barangay = _resolve_barangay_name(db, payload.barangay, payload.barangay_id)

    if payload.baha is not None: p.baha = bool(payload.baha)
    if payload.bagyo is not None: p.bagyo = bool(payload.bagyo)
    if payload.brownout is not None: p.brownout = bool(payload.brownout)
    if payload.road is not None: p.road = bool(payload.road)
    if payload.silent_start_min is not None: p.silent_start_min = payload.silent_start_min
    if payload.silent_end_min is not None: p.silent_end_min = payload.silent_end_min

    db.commit()
    db.refresh(p)

    barangay_id = None
    if p.barangay:
        b = db.query(models.Barangay).filter(func.lower(models.Barangay.name) == p.barangay.lower()).first()
        barangay_id = b.id if b else None

    return schemas.AlertPreferenceOut(
        baha=bool(p.baha), bagyo=bool(p.bagyo), brownout=bool(p.brownout), road=bool(p.road),
        barangay=p.barangay, barangay_id=barangay_id,
        silent_start_min=p.silent_start_min, silent_end_min=p.silent_end_min
    )
