import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer
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
    password = Column(String, nullable=False)  # <-- likely this
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


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Fix here: rename type -> incident_type
    incident_type = Column(Integer, ForeignKey("incident_categories.id"), nullable=True)
    department = Column(Integer, ForeignKey("departments.id"), nullable=True)

    # Add all missing fields
    address = Column(String, nullable=True)
    purok = Column(String, nullable=True)
    barangay = Column(String, nullable=True)
    street = Column(String, nullable=True)
    landmark = Column(String, nullable=True)

    status = Column(String, default="submitted")
    created_at = Column(DateTime, default=datetime.utcnow)

    photos = relationship("IncidentPhoto", back_populates="incident")
    comments = relationship(
        "IncidentComment", back_populates="incident", cascade="all, delete-orphan"
    )


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
