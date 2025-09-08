import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


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
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class AnnouncementImage(Base):
    __tablename__ = "announcement_images"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    announcement_id = Column(String(36), ForeignKey("announcements.id"))
    storage_path = Column(String, nullable=False)
    url = Column(String, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=True)
    message = Column(Text, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


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
