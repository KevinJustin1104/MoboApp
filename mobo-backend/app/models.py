import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, UniqueConstraint, Time, Index, Date
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime, date, time
class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)


class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    role = relationship("Role")
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    phone = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department")

    # FIX: point to the correct table name
    barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=True)
    barangay = relationship("Barangay")   # optional: add back_populates on Barangay

    password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)



class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)


class IncidentCategory(Base):
    __tablename__ = "incident_categories"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    urgency_level = Column(Integer, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department")


# models.py

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = Column(String, nullable=False)  # (optional) you can later make this a FK to users.id
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    incident_type = Column(Integer, ForeignKey("incident_categories.id"), nullable=True)
    department = Column(Integer, ForeignKey("departments.id"), nullable=True)

    address = Column(String, nullable=True)
    purok = Column(String, nullable=True)

    # CHANGE: use FK instead of free-text
    barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=True)
    barangay = relationship("Barangay")

    street = Column(String, nullable=True)
    landmark = Column(String, nullable=True)

    status = Column(String, default="submitted")
    created_at = Column(DateTime, default=datetime.utcnow)

    photos = relationship("IncidentPhoto", back_populates="incident")
    comments = relationship(
        "IncidentComment", back_populates="incident", cascade="all, delete-orphan"
    )

    # If you still need the barangay name for old clients, you can expose a convenience property:
    @property
    def barangay_name(self):
        return self.barangay.name if self.barangay else None


class IncidentPhoto(Base):
    __tablename__ = "incident_photos"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"))
    storage_path = Column(String, nullable=False)
    url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    incident = relationship("Incident", back_populates="photos")


class IncidentComment(Base):
    __tablename__ = "incident_comments"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"))
    author_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    incident = relationship("Incident", back_populates="comments")

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id = Column(String(36), ForeignKey("users.id"))
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)

    # NEW: store public URL for the hero image
    image_url = Column(String, nullable=True)

    comments = relationship(
        "AnnouncementComment",
        back_populates="announcement",
        cascade="all, delete-orphan",
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class AnnouncementImage(Base):
    __tablename__ = "announcement_images"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    announcement_id = Column(String(36), ForeignKey("announcements.id"))
    storage_path = Column(String, nullable=False)
    url = Column(String, nullable=True)


class AnnouncementComment(Base):
    __tablename__ = "announcement_comments"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    announcement_id = Column(String(36), ForeignKey("announcements.id", ondelete="CASCADE"), index=True)
    announcement = relationship("Announcement", back_populates="comments")

    author_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    # NEW: relationship so we can read the author's name
    author = relationship("User")  # optionally: relationship("User", lazy="joined")

    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    parent_id = Column(String(36), ForeignKey("announcement_comments.id"), nullable=True)
    parent = relationship("AnnouncementComment", remote_side=[id], backref="replies")



class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # What kind of notif is this?
    # 'system' | 'announcement' | 'incident' | 'alert' | 'appointment' | 'queue'
    type = Column(String, nullable=False, default="system")
    title = Column(String, nullable=True)
    message = Column(Text, nullable=True)

    # Optional foreign keys to jump the user directly to context
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=True, index=True)
    # normalize: use singular; we’ll keep migration to rename if needed
    announcement_id = Column(String(36), ForeignKey("announcements.id"), nullable=True, index=True)
    alert_id = Column(String(36), ForeignKey("alerts.id"), nullable=True, index=True)

    # NEW for appointments & queue
    appointment_id = Column(String(36), ForeignKey("appointments.id"), nullable=True, index=True)
    queue_ticket_id = Column(String(36), ForeignKey("queue_tickets.id"), nullable=True, index=True)

    # Delivery & read tracking
    read = Column(Boolean, default=False, index=True)      # kept for backward compatibility
    read_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)

    # Freeform JSON payload as string (SQLite-friendly)
    data = Column(Text, nullable=True)       # JSON-encoded string
    action = Column(String, nullable=True)   # e.g. "open_appointment"
    deeplink = Column(String, nullable=True) # e.g. "mobo://appointments/<id>"

    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class Barangay(Base):
    __tablename__ = "barangays"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False, index=True)
    district = Column(String, nullable=True)           # optional: zone/district
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)

    # 'info' | 'warning' | 'critical'
    severity = Column(String, nullable=False, default="info")

    # high-level type for prefs filter: 'flood' | 'typhoon' | 'brownout' | 'road' | etc.
    category = Column(String, nullable=True)

    # geo targeting
    barangay = Column(String, nullable=True)
    purok = Column(String, nullable=True)

    source = Column(String, nullable=True)        # optional: LGU/agency name or link label
    valid_until = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class AlertRead(Base):
    __tablename__ = "alert_reads"
    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String(36), ForeignKey("alerts.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    read_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("alert_id", "user_id", name="uq_alert_user"),)

class AlertPreference(Base):
    __tablename__ = "alert_preferences"
    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)

    # categories on/off (defaults ON)
    baha = Column(Boolean, default=True)
    bagyo = Column(Boolean, default=True)
    brownout = Column(Boolean, default=True)
    road = Column(Boolean, default=True)

    # user's preferred barangay for targeting/filter
    barangay = Column(String, nullable=True)

    # "silent hours" (minutes since midnight, 0..1439)
    silent_start_min = Column(Integer, nullable=True)
    silent_end_min = Column(Integer, nullable=True)


class AppointmentService(Base):
    __tablename__ = "appointment_services"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    description = Column(Text, nullable=True)

    # core knobs
    duration_min = Column(Integer, nullable=False, default=15)          # default slot length
    capacity_per_slot = Column(Integer, nullable=False, default=1)      # how many people per slot
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department")

class AppointmentSchedule(Base):
    __tablename__ = "appointment_schedules"
    id = Column(Integer, primary_key=True, autoincrement=True)
    service_id = Column(Integer, ForeignKey("appointment_services.id", ondelete="CASCADE"), nullable=False)

    # 0=Mon .. 6=Sun
    day_of_week = Column(Integer, nullable=False)

    # opening window for the day
    start_time = Column(Time, nullable=False)
    end_time   = Column(Time, nullable=False)

    # override defaults (optional)
    slot_minutes = Column(Integer, nullable=True)
    capacity_per_slot = Column(Integer, nullable=True)

    # optional validity range
    valid_from = Column(Date, nullable=True)
    valid_to   = Column(Date, nullable=True)

    timezone = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        # avoid exact duplicates
        UniqueConstraint("service_id", "day_of_week", "start_time", "end_time", name="uq_sched_window"),
        Index("ix_schedules_service_dow", "service_id", "day_of_week"),
    )
class OfficeWindow(Base):
    """
    A counter/window that serves the queue for a department.
    """
    __tablename__ = "office_windows"
    id = Column(Integer, primary_key=True, autoincrement=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # e.g., "Window 1"
    is_open = Column(Boolean, default=False)
    department = relationship("Department")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("appointment_services.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)

    # chosen slot
    slot_date = Column(DateTime, nullable=False)      # date part used (00:00 local)
    slot_start = Column(DateTime, nullable=False)     # exact start time
    slot_end = Column(DateTime, nullable=False)       # exact end time

    # status: booked | cancelled | checked_in | serving | done | no_show
    status = Column(String, nullable=False, default="booked")
    notes = Column(Text, nullable=True)

    # Assigned on check-in
    queue_number = Column(Integer, nullable=True, index=True)  # per dept per date
    queue_date = Column(DateTime, nullable=True)               # normalized date when queued
    window_id = Column(Integer, ForeignKey("office_windows.id"), nullable=True)

    # secure token for QR validation
    qr_token = Column(String, nullable=False, default=lambda: str(uuid.uuid4()))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    service = relationship("AppointmentService")
    department = relationship("Department")
    window = relationship("OfficeWindow")

    __table_args__ = (
        # prevent double booking on exact slot by same user
        UniqueConstraint("user_id", "service_id", "slot_start", name="uq_user_service_slot"),
    )

class QueueTicket(Base):
    """
    Optional explicit ticket table; also useful for walk-ins.
    We will create one automatically on check-in for an Appointment.
    """
    __tablename__ = "queue_tickets"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("appointment_services.id"), nullable=True, index=True)
    date = Column(DateTime, nullable=False, index=True)  # normalized date (00:00)
    number = Column(Integer, nullable=False)             # incrementing per dept/date
    appointment_id = Column(String(36), ForeignKey("appointments.id"), nullable=True)
    window_id = Column(Integer, ForeignKey("office_windows.id"), nullable=True)

    # status: waiting | serving | done | no_show
    status = Column(String, nullable=False, default="waiting")
    created_at = Column(DateTime, default=datetime.utcnow)
    called_at = Column(DateTime, nullable=True)
    served_at = Column(DateTime, nullable=True)

    department = relationship("Department")
    service = relationship("AppointmentService")
    appointment = relationship("Appointment")
    window = relationship("OfficeWindow")

    __table_args__ = (
        UniqueConstraint("department_id", "date", "number", name="uq_queue_dept_date_num"),
    )