# app/api/api_v1/endpoints/admin_appointments.py
from datetime import time as dt_time, date as dt_date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.session import get_db_session
from app import models, schemas

router = APIRouter()



# Helper to serialize ORM -> Pydantic across v1/v2
def to_model(pyd_model, obj):
    # v2
    if hasattr(pyd_model, "model_validate"):
        return pyd_model.model_validate(obj)
    # v1
    return pyd_model.from_orm(obj)

@router.get("/schedules", response_model=List[schemas.ScheduleOut])
def list_schedules(
    department_id: Optional[int] = Query(None),
    service_id: Optional[int] = Query(None),
    db: Session = Depends(get_db_session),
):
    """
    List admin appointment schedules.
    - If department_id is provided, filters by services under that department.
    - If service_id is provided, filters by that service.
    Both filters can be combined.
    """
    q = (
        db.query(models.AppointmentSchedule)
        .join(
            models.AppointmentService,
            models.AppointmentService.id == models.AppointmentSchedule.service_id,
        )
    )

    if department_id is not None:
        q = q.filter(models.AppointmentService.department_id == department_id)

    if service_id is not None:
        q = q.filter(models.AppointmentSchedule.service_id == service_id)

    q = q.order_by(
        models.AppointmentSchedule.service_id.asc(),
        models.AppointmentSchedule.day_of_week.asc(),
        models.AppointmentSchedule.start_time.asc(),
    )

    rows = q.all()
    return [to_model(schemas.ScheduleOut, r) for r in rows]

@router.post("/services", response_model=schemas.ServiceOut, status_code=201)
def create_service(
    payload: schemas.ServiceCreate,
    db: Session = Depends(get_db_session)
):
    # Verify department exists
    dept_exists = (
        db.query(models.Department.id)
        .filter(models.Department.id == payload.department_id)
        .first()
    )
    if not dept_exists:
        raise HTTPException(status_code=404, detail=f"Unknown department_id {payload.department_id}")

    # Unique by name
    exists = (
        db.query(models.AppointmentService.id)
        .filter(models.AppointmentService.name == payload.name)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Service name already exists")

    item = models.AppointmentService(
        name=payload.name,
        department_id=payload.department_id,
        description=payload.description,
        duration_min=payload.duration_min,
        capacity_per_slot=payload.capacity_per_slot,
        is_active=payload.is_active,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Integrity error while creating service") from e

    db.refresh(item)
    # Explicit conversion (works on v1/v2)
    return to_model(schemas.ServiceOut, item)


def to_model(pyd_model, obj):
    if hasattr(pyd_model, "model_validate"):  # pydantic v2
        return pyd_model.model_validate(obj)
    return pyd_model.from_orm(obj)  

@router.post("/schedules", response_model=List[schemas.ScheduleOut], status_code=201)
def create_schedules(
    items: List[schemas.ScheduleCreate],
    db: Session = Depends(get_db_session)
):
    if not items:
        raise HTTPException(status_code=400, detail="Empty payload")

    # validate referenced services
    service_ids = {i.service_id for i in items}
    rows = (
        db.query(models.AppointmentService.id)
        .filter(models.AppointmentService.id.in_(service_ids))
        .all()
    )
    existing_ids = {sid for (sid,) in rows}
    missing = service_ids - existing_ids
    if missing:
        raise HTTPException(status_code=404, detail=f"Unknown service_ids: {sorted(missing)}")

    created: list[models.AppointmentSchedule] = []
    for p in items:
        # p.start_time / p.end_time are already datetime.time
        if p.start_time >= p.end_time:
            raise HTTPException(status_code=400, detail="start_time must be before end_time")

        sched = models.AppointmentSchedule(
            service_id=p.service_id,
            day_of_week=p.day_of_week,
            start_time=p.start_time,
            end_time=p.end_time,
            slot_minutes=p.slot_minutes,
            capacity_per_slot=p.capacity_per_slot,
            valid_from=p.valid_from,   # datetime.date or None
            valid_to=p.valid_to,       # datetime.date or None
            timezone=p.timezone,
        )
        db.add(sched)
        created.append(sched)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Schedule window conflicts or duplicate") from e

    for c in created:
        db.refresh(c)

    return [to_model(schemas.ScheduleOut, c) for c in created]

