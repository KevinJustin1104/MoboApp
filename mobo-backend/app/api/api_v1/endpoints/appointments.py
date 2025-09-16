# app/api/api_v1/endpoints/appointments.py
from __future__ import annotations
from datetime import datetime, date as ddate, time as dtime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, and_

from app.db.session import get_db_session
from app.deps import get_current_user
from app import models, schemas, crud

router = APIRouter()

# ---------------------------
# Helpers
# ---------------------------

def _to_model(pyd_model, obj):
    return pyd_model.model_validate(obj) if hasattr(pyd_model, "model_validate") else pyd_model.from_orm(obj)

def _active_scheds_for_day(db: Session, service_id: int, day: ddate) -> list[models.AppointmentSchedule]:
    """Return schedules for a service that apply to 'day' (weekday + validity range)."""
    wd = day.weekday()  # 0..6 Mon..Sun
    q = db.query(models.AppointmentSchedule).filter(
        models.AppointmentSchedule.service_id == service_id,
        models.AppointmentSchedule.day_of_week == wd,
        # validity (nullable = always active)
        and_(
            (models.AppointmentSchedule.valid_from == None) | (models.AppointmentSchedule.valid_from <= day),  # noqa: E711
            (models.AppointmentSchedule.valid_to == None) | (models.AppointmentSchedule.valid_to >= day),      # noqa: E711
        )
    )
    return q.all()

def _count_booked(db: Session, service_id: int, start: datetime, end: datetime) -> int:
    """Count appointments within [start, end) that are not cancelled."""
    return (
        db.query(func.count(models.Appointment.id))
        .filter(
            models.Appointment.service_id == service_id,
            models.Appointment.slot_start >= start,
            models.Appointment.slot_start < end,
            models.Appointment.status != "cancelled",
        )
        .scalar()
        or 0
    )

def _slot_length_min(svc: models.AppointmentService, sched: Optional[models.AppointmentSchedule]) -> int:
    return (sched.slot_minutes if (sched and sched.slot_minutes) else svc.duration_min)

def _capacity_per_slot(svc: models.AppointmentService, sched: Optional[models.AppointmentSchedule]) -> int:
    return (sched.capacity_per_slot if (sched and sched.capacity_per_slot) else svc.capacity_per_slot or 1)

# ---------------------------
# Services & Schedules (read)
# ---------------------------

@router.get("/services", response_model=List[schemas.ServiceOut])
def list_services(department_id: Optional[int] = None, db: Session = Depends(get_db_session)):
    q = db.query(models.AppointmentService).filter(models.AppointmentService.is_active == True)  # noqa: E712
    if department_id is not None:
        q = q.filter(models.AppointmentService.department_id == department_id)
    q = q.order_by(models.AppointmentService.name.asc())
    items = q.all()
    return [_to_model(schemas.ServiceOut, s) for s in items]

@router.get("/services/{service_id}/schedules", response_model=List[schemas.ScheduleOut])
def get_schedules(service_id: int, db: Session = Depends(get_db_session)):
    rows = (
        db.query(models.AppointmentSchedule)
        .filter(models.AppointmentSchedule.service_id == service_id)
        .order_by(models.AppointmentSchedule.day_of_week.asc(),
                  models.AppointmentSchedule.start_time.asc())
        .all()
    )
    return [_to_model(schemas.ScheduleOut, r) for r in rows]

# ---------------------------
# Slots computation
# ---------------------------

@router.get("/services/{service_id}/slots", response_model=List[schemas.SlotOut])
def get_slots(
    service_id: int,
    day: ddate = Query(..., description="Target day in YYYY-MM-DD (local day)"),
    db: Session = Depends(get_db_session),
):
    weekday = day.weekday()  # 0=Mon .. 6=Sun

    svc = db.query(models.AppointmentService).get(service_id)
    if not svc or not svc.is_active:
        raise HTTPException(404, "Service not found")
    debugdata = db.query(models.AppointmentSchedule).all()
    print(f"data {debugdata}")
    schedules = (
        db.query(models.AppointmentSchedule)
        .filter(
            models.AppointmentSchedule.service_id == service_id,
            models.AppointmentSchedule.day_of_week == weekday,
            (models.AppointmentSchedule.valid_from.is_(None)) | (models.AppointmentSchedule.valid_from <= day),
            (models.AppointmentSchedule.valid_to.is_(None))   | (models.AppointmentSchedule.valid_to >= day),
        )
        .all()
    )
    out: list[schemas.SlotOut] = []
    for s in schedules:
        step_min = s.slot_minutes or svc.duration_min or 15
        capacity = s.capacity_per_slot or svc.capacity_per_slot or 1

        ptr = datetime.combine(day, s.start_time)
        end = datetime.combine(day, s.end_time)

        while ptr + timedelta(minutes=step_min) <= end:
            slot_start = ptr
            slot_end   = ptr + timedelta(minutes=step_min)
            used = crud.count_booked_in_slot(db, service_id, slot_start, slot_end)
            avail = max(0, capacity - used)
            if avail > 0:
                out.append(schemas.SlotOut(
                    start=slot_start, end=slot_end,
                    capacity=capacity, available=avail
                ))
            ptr = slot_end

    return out

# ---------------------------
# Booking / My appointments
# ---------------------------

@router.post("", response_model=schemas.AppointmentOut)
def book(
    payload: schemas.AppointmentCreate,
    db: Session = Depends(get_db_session),
    user = Depends(get_current_user),
):
    svc = db.query(models.AppointmentService).get(payload.service_id)
    if not svc or not svc.is_active:
        raise HTTPException(404, "Service not found")

    slot_start: datetime = payload.slot_start
    day = slot_start.date()

    # Find schedule that covers this time (use override length/capacity if present)
    scheds = _active_scheds_for_day(db, svc.id, day)
    covering = next(
        (
            s for s in scheds
            if s.start_time <= slot_start.time() < s.end_time
        ),
        None,
    )
    length_min = _slot_length_min(svc, covering)
    cap = _capacity_per_slot(svc, covering)

    slot_end = slot_start + timedelta(minutes=length_min)

    # Capacity check
    used = _count_booked(db, svc.id, slot_start, slot_end)
    if used >= cap:
        raise HTTPException(409, "Slot is full")

    # Create appointment
    appt = models.Appointment(
        user_id=user.id,
        service_id=svc.id,
        department_id=svc.department_id,
        slot_date=datetime.combine(day, dtime(0,0)),
        slot_start=slot_start,
        slot_end=slot_end,
        status="booked",
    )
    
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return _to_model(schemas.AppointmentOut, appt)

@router.get("/me", response_model=List[schemas.AppointmentOut])
def my_appointments(db: Session = Depends(get_db_session), user = Depends(get_current_user)):
    rows = (
        db.query(models.Appointment)
        .filter(models.Appointment.user_id == user.id)
        .order_by(models.Appointment.slot_start.desc())
        .all()
    )
    return [_to_model(schemas.AppointmentOut, r) for r in rows]

@router.post("/{appointment_id}/cancel")
def cancel(
    appointment_id: str,
    db: Session = Depends(get_db_session),
    user = Depends(get_current_user),
):
    appt = db.query(models.Appointment).get(appointment_id)
    if not appt or appt.user_id != user.id:
        raise HTTPException(404, "Appointment not found")
    if appt.status not in ("booked",):
        raise HTTPException(400, "Cannot cancel this appointment")
    appt.status = "cancelled"
    db.commit()
    return {"ok": True}

# ---------------------------
# Check-in & Queue (user/staff handoff)
# ---------------------------

@router.post("/{appointment_id}/checkin", response_model=schemas.QueueTicketOut)
def checkin(
    appointment_id: str,
    payload: schemas.CheckinPayload,
    db: Session = Depends(get_db_session),
):
    appt = db.query(models.Appointment).get(appointment_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.qr_token != payload.qr_token:
        raise HTTPException(401, "QR token invalid")
    if appt.status not in ("booked", "checked_in"):
        raise HTTPException(400, f"Cannot check-in from status {appt.status}")

    # Assign queue number for today (department scope)
    qdate = datetime.combine(datetime.utcnow().date(), dtime(0,0))
    last_num = (
        db.query(func.max(models.QueueTicket.number))
        .filter(models.QueueTicket.department_id == appt.department_id,
                models.QueueTicket.date == qdate)
        .scalar()
        or 0
    )
    next_num = last_num + 1

    ticket = models.QueueTicket(
        department_id=appt.department_id,
        service_id=appt.service_id,
        date=qdate,
        number=next_num,
        appointment_id=appt.id,
        status="waiting",
    )
    db.add(ticket)

    appt.queue_number = next_num
    appt.queue_date = qdate
    appt.status = "checked_in"

    db.commit()
    db.refresh(ticket)
    db.refresh(appt)
    return _to_model(schemas.QueueTicketOut, ticket)

@router.get("/queue/now", response_model=schemas.QueueNowOut)
def queue_now(
    department_id: int = Query(...),
    db: Session = Depends(get_db_session),
):
    qdate = datetime.combine(datetime.utcnow().date(), dtime(0,0))

    now_serving = (
        db.query(models.QueueTicket.number)
        .filter(models.QueueTicket.department_id == department_id,
                models.QueueTicket.date == qdate,
                models.QueueTicket.status == "serving")
        .order_by(models.QueueTicket.called_at.desc())
        .limit(1)
        .scalar()
    )

    waiting = (
        db.query(func.count(models.QueueTicket.id))
        .filter(models.QueueTicket.department_id == department_id,
                models.QueueTicket.date == qdate,
                models.QueueTicket.status == "waiting")
        .scalar()
        or 0
    )

    # (Optional) compute a simple average; set None for now
    avg = None

    return schemas.QueueNowOut(
        department_id=department_id,
        date=qdate,
        now_serving=now_serving,
        waiting=waiting,
        average_wait_min=avg,
    )


# =========================================================
# ME
# =========================================================
@router.get("/me/current", response_model=Optional[schemas.AppointmentOut])
def my_current_appointment(
    db: Session = Depends(get_db_session),
    user=Depends(get_current_user),
):
    now = datetime.utcnow()
    appt = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.user_id == user.id,
            models.Appointment.status.in_(["booked", "checked_in", "serving"]),
            models.Appointment.slot_end >= now,
        )
        .order_by(models.Appointment.slot_start.asc())
        .first()
    )
    return appt