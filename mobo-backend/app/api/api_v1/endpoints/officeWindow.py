from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.deps import get_current_admin
from app import models, schemas, crud

def _to_model(pyd_model, obj):
    return pyd_model.model_validate(obj) if hasattr(pyd_model, "model_validate") else pyd_model.from_orm(obj)

router = APIRouter()
@router.get("/queue/windows", response_model=List[schemas.OfficeWindowOut])
def admin_list_windows(
    department_id: Optional[int] = Query(None),
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    q = db.query(models.OfficeWindow)
    if department_id is not None:
        q = q.filter(models.OfficeWindow.department_id == department_id)
    windows = q.order_by(models.OfficeWindow.department_id, models.OfficeWindow.name).all()
    return [_to_model(schemas.OfficeWindowOut, w) for w in windows]

@router.post("/queue/windows", response_model=schemas.OfficeWindowOut, status_code=201)
def admin_create_window(
    payload: schemas.OfficeWindowCreate,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    dept = db.query(models.Department.id).filter(models.Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    exists = (
        db.query(models.OfficeWindow.id)
        .filter(
            models.OfficeWindow.department_id == payload.department_id,
            models.OfficeWindow.name == payload.name,
        )
        .first()
    )
    if exists:
        raise HTTPException(409, "Window name already exists in that department")

    w = models.OfficeWindow(
        department_id=payload.department_id,
        name=payload.name,
        is_open=False,
    )
    db.add(w)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Failed to create window")
    db.refresh(w)
    return _to_model(schemas.OfficeWindowOut, w)

@router.patch("/queue/windows/{window_id}", response_model=schemas.OfficeWindowOut)
def admin_update_window(
    window_id: int,
    payload: schemas.OfficeWindowCreate,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    w = db.query(models.OfficeWindow).get(window_id)
    if not w:
        raise HTTPException(404, "Window not found")

    if payload.name is not None:
        clash = (
            db.query(models.OfficeWindow.id)
            .filter(
                models.OfficeWindow.department_id == w.department_id,
                models.OfficeWindow.name == payload.name,
                models.OfficeWindow.id != w.id,
            )
            .first()
        )
        if clash:
            raise HTTPException(409, "Another window with that name already exists in this department")
        w.name = payload.name

    if payload.is_open is not None:
        w.is_open = payload.is_open

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Failed to update window")
    db.refresh(w)
    return _to_model(schemas.OfficeWindowOut, w)

@router.delete("/queue/windows/{window_id}", status_code=204)
def admin_delete_window(
    window_id: int,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    w = db.query(models.OfficeWindow).get(window_id)
    if not w:
        raise HTTPException(404, "Window not found")
    db.delete(w)
    db.commit()
    return None


# These you already had and should remain admin-only:
@router.post("/queue/{window_id}/open")
def open_window(window_id: int, db: Session = Depends(get_db_session), admin=Depends(get_current_admin)):
    w = db.query(models.OfficeWindow).get(window_id)
    if not w:
        raise HTTPException(404, "Window not found")
    w.is_open = True
    db.commit()
    return {"ok": True}

@router.post("/queue/{window_id}/close")
def close_window(window_id: int, db: Session = Depends(get_db_session), admin=Depends(get_current_admin)):
    w = db.query(models.OfficeWindow).get(window_id)
    if not w:
        raise HTTPException(404, "Window not found")
    w.is_open = False
    db.commit()
    return {"ok": True}

@router.post("/queue/{window_id}/next", response_model=schemas.QueueTicketOut)
def call_next(window_id: int, db: Session = Depends(get_db_session), admin=Depends(get_current_admin)):
    w = db.query(models.OfficeWindow).get(window_id)
    if not w or not w.is_open:
        raise HTTPException(400, "Window not open")

    # Get the next waiting ticket and move it to 'serving'
    t = crud.call_next_ticket(db, w.department_id, window_id=w.id)
    if not t:
        raise HTTPException(404, "No waiting tickets")

    # If you're on Pydantic v1 and QueueTicketOut.Config.orm_mode = True,
    # you can return `t` directly. To be safe across v1/v2, use your helper:
    return _to_model(schemas.QueueTicketOut, t)

@router.post("/queue/{ticket_id}/done", response_model=schemas.QueueTicketOut)
def ticket_done(ticket_id: str, db: Session = Depends(get_db_session), admin=Depends(get_current_admin)):
    t = crud.close_ticket(db, ticket_id, "done")
    if not t:
        raise HTTPException(404, "Ticket not found")
    return t

@router.post("/queue/{ticket_id}/no_show", response_model=schemas.QueueTicketOut)
def ticket_no_show(ticket_id: str, db: Session = Depends(get_db_session), admin=Depends(get_current_admin)):
    t = crud.close_ticket(db, ticket_id, "no_show")
    if not t:
        raise HTTPException(404, "Ticket not found")
    return t


# =========================================================
# Public/User router (read-only)
# =========================================================

@router.get("/queue/windows", response_model=List[schemas.OfficeWindowOut])
def user_list_windows(
    department_id: Optional[int] = Query(None),
    db: Session = Depends(get_db_session),
):
    q = db.query(models.OfficeWindow)
    if department_id is not None:
        q = q.filter(models.OfficeWindow.department_id == department_id)
    windows = q.order_by(models.OfficeWindow.department_id, models.OfficeWindow.name).all()
    return [_to_model(schemas.OfficeWindowOut, w) for w in windows]

@router.get("/queue/windows/{window_id}/current", response_model=Optional[schemas.QueueTicketOut])
def user_current_for_window(
    window_id: int,
    db: Session = Depends(get_db_session),
):
    t = (
        db.query(models.QueueTicket)
        .filter(models.QueueTicket.window_id == window_id, models.QueueTicket.status == "serving")
        .order_by(models.QueueTicket.called_at.desc())
        .first()
    )
    return t  # may be None
