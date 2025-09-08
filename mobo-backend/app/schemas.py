# app/schemas.py
from pydantic import BaseModel, EmailStr, Field, constr
from datetime import datetime
from typing import Dict, List, Optional, Literal


# Auth
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Request schema for registration
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role: str  # frontend sends "user" or "admin"


# Response schema
class UserOut(BaseModel):
    id: str
    name: str
    email: str
    is_active: bool
    is_admin: bool = False
    role: Dict[str, str]  # must be a dict with 'id' and 'name'

    class Config:
        orm_mode = True


# Incidents
class IncidentCreate(BaseModel):
    title: str
    type: Optional[int] = (
        None  # now integer category id (we keep field name `type` for backward compatibility)
    )
    description: Optional[str] = None
    address: Optional[str] = None
    purok: Optional[str] = None
    barangay: Optional[int] = None
    street: Optional[str] = None
    landmark: Optional[str] = None
    department_id: Optional[int] = None

class IncidentCommentCreate(BaseModel):
    comment: str

class IncidentCommentOut(BaseModel):
    id: str
    incident_id: str
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    comment: str
    created_at: Optional[str] = None

class IncidentOut(BaseModel):
    id: str
    reporter_id: Optional[str] = None
    title: str
    type: Optional[int] = None
    type_name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    purok: Optional[str] = None
    barangay: Optional[str] = None
    street: Optional[str] = None
    landmark: Optional[str] = None
    department: Optional[int] = None
    department_name: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    photos: Optional[List[str]] = []
    reporterName: Optional[str] = None
    reporterPhone: Optional[str] = None
    reportedAt: Optional[datetime] = None

    class Config:
        orm_mode = True

class IncidentStatusUpdate(BaseModel):
    status: Literal["submitted","acknowledged","in_progress","resolved","rejected"]
    note: Optional[str] = None

class IncidentCommentCreate(BaseModel):
    comment: str = Field(..., min_length=1)

# Notification
class NotificationOut(BaseModel):
    id: str
    user_id: str
    incident_id: Optional[str]
    read: bool
    created_at: datetime
    message: Optional[str]

    class Config:
        orm_mode = True


# Announcement
class AnnouncementCreate(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None


class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    image_url: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


# Admin: status update payload
class StatusUpdate(BaseModel):
    new_status: str
    comment: str


# Departments and Incident Categories
class DepartmentBase(BaseModel):
    name: str
    description: str | None = None  # <-- add description


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentRead(DepartmentBase):
    id: int

    class Config:
        orm_mode = True


class IncidentCategoryBase(BaseModel):
    name: str
    department_id: Optional[int] = None
    urgency_level: Optional[int] = None   # 1=Low, 2=Medium, 3=High

class IncidentCategoryCreate(IncidentCategoryBase):
    pass

class IncidentCategoryUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    urgency_level: Optional[int] = None

class IncidentCategoryRead(IncidentCategoryBase):
    id: int
    department_name: Optional[str] = None

    class Config:
        orm_mode = True


class IncidentStatusUpdate(BaseModel):
    new_status: str
    comment: str | None = None
    departmentId: Optional[int] = None


class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str

class UserWithDeptOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True  # SQLAlchemy -> Pydantic

class StaffListResponse(BaseModel):
    items: List[UserWithDeptOut]
    total: int


# --- Barangays --------------------------------------------------------------

class BarangayCreate(BaseModel):
    name: str
    code: Optional[str] = None

class BarangayUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class BarangayOut(BaseModel):
    id: int
    name: str
    code: Optional[str] = None

# --- Alerts ---

# ---------- Alerts ----------
class AlertCreate(BaseModel):
    title: str
    body: Optional[str] = None
    severity: Literal["info", "warning", "danger"] = "info"
    category: Optional[str] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None   # NEW (resolved to name)
    purok: Optional[str] = None
    source: Optional[str] = None
    valid_until: Optional[datetime] = None

class AlertUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    severity: Optional[Literal["info", "warning", "danger"]] = None
    category: Optional[str] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None    # NEW
    purok: Optional[str] = None
    source: Optional[str] = None
    valid_until: Optional[datetime] = None

class AlertOut(BaseModel):
    id: str
    title: str
    body: Optional[str] = None
    severity: str
    category: Optional[str] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None     # NEW (best-effort echo)
    purok: Optional[str] = None
    source: Optional[str] = None
    valid_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# ---------- Reads ----------
class AlertReadIdsOut(BaseModel):
    ids: List[str]

# ---------- Preferences ----------
class AlertPreferenceUpdate(BaseModel):
    baha: Optional[bool] = None
    bagyo: Optional[bool] = None
    brownout: Optional[bool] = None
    road: Optional[bool] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None     # NEW
    silent_start_min: Optional[int] = None
    silent_end_min: Optional[int] = None

class AlertPreferenceOut(BaseModel):
    baha: bool
    bagyo: bool
    brownout: bool
    road: bool
    barangay: Optional[str]
    barangay_id: Optional[int] = None     # NEW
    silent_start_min: Optional[int] = None
    silent_end_min: Optional[int] = None