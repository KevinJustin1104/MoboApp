# app/schemas.py
from pydantic import BaseModel, EmailStr, Field, constr
from typing import Dict, List, Optional, Literal
from datetime import datetime, date, time
from pydantic import BaseModel, Field, conint, validator
from datetime import time as dt_time, date as dt_date
try:
    from pydantic import ConfigDict, field_validator  # v2
    V2 = True
except Exception:
    from pydantic import validator                     # v1
    V2 = False
# --------- Schemas ---------
# Optional: support Pydantic v2 if available
try:
    from pydantic import ConfigDict  # v2+
    HAVE_V2 = True
except Exception:  # v1
    ConfigDict = None
    HAVE_V2 = False


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1)
    department_id: int
    description: str | None = None
    duration_min: int = Field(ge=5, le=240)
    capacity_per_slot: int = Field(ge=1, le=50)
    is_active: bool = True


class ServiceOut(BaseModel):
    id: int
    name: str
    department_id: int
    description: str | None = None
    duration_min: int
    capacity_per_slot: int
    is_active: bool

    # v2
    if HAVE_V2:
        model_config = ConfigDict(from_attributes=True, extra="ignore")
    # v1
    class Config:
        orm_mode = True


class ScheduleCreate(BaseModel):
    service_id: int
    day_of_week: int = Field(ge=0, le=6)
    start_time: dt_time
    end_time: dt_time
    slot_minutes: int | None = None
    capacity_per_slot: int | None = None
    valid_from: dt_date | None = None
    valid_to: dt_date | None = None
    timezone: str | None = None

    if V2:
        @field_validator("start_time", "end_time", mode="before")
        def _parse_time(cls, v):
            if isinstance(v, str) and len(v) == 5:  # "08:00"
                hh, mm = v.split(":")
                return dt_time(int(hh), int(mm), 0)
            return v
        # dates like "YYYY-MM-DD" are already accepted by Pydantic v2
    else:
        @validator("start_time", "end_time", pre=True)
        def _parse_time_v1(cls, v):
            if isinstance(v, str) and len(v) == 5:
                hh, mm = v.split(":")
                return dt_time(int(hh), int(mm), 0)
            return v


class ScheduleOut(BaseModel):
    id: int
    service_id: int
    day_of_week: int
    start_time: dt_time
    end_time: dt_time
    slot_minutes: int | None = None
    capacity_per_slot: int | None = None
    valid_from: dt_date | None = None
    valid_to: dt_date | None = None
    timezone: str | None = None

    if V2:
        model_config = ConfigDict(from_attributes=True, extra="ignore")
    else:
        class Config:
            orm_mode = True
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

# --- Announcements ---
class AnnouncementCreate(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    image_url: Optional[str] = None
    image_data_uri: Optional[str] = None  # <— base64 "data:image/...;base64,...."
    created_at: datetime

    class Config:
        orm_mode = True

# --- Comments ---
class AnnouncementCommentCreate(BaseModel):
    comment: str
    parent_id: Optional[str] = None

class AnnouncementCommentOut(BaseModel):
    id: str
    author_id: Optional[str] = None
    # NEW: show real name
    author_name: Optional[str] = None
    comment: str
    created_at: datetime
    parent_id: Optional[str] = None
    replies: List["AnnouncementCommentOut"] = []

    class Config:
        orm_mode = True

AnnouncementCommentOut.update_forward_refs()

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




# --- Services & schedules ---

class AppointmentServiceCreate(BaseModel):
    department_id: int
    name: str
    description: Optional[str] = None
    duration_min: int = 15
    capacity_per_slot: int = 1
    is_active: bool = True

class AppointmentServiceOut(BaseModel):
    id: int
    department_id: int
    name: str
    description: Optional[str]
    duration_min: int
    capacity_per_slot: int
    is_active: bool
    class Config: orm_mode = True

class ServiceScheduleCreate(BaseModel):
    service_id: int
    weekday: int  # 0..6
    start_time: time
    end_time: time
    slot_length_min: int = 15
    capacity_per_slot: int = 1

class ServiceScheduleOut(BaseModel):
    id: int
    service_id: int
    weekday: int
    start_time: time
    end_time: time
    slot_length_min: int
    capacity_per_slot: int
    class Config: orm_mode = True

# --- Slots ---

class SlotOut(BaseModel):
    start: datetime
    end: datetime
    capacity: int
    available: int

# --- Appointment ---

class AppointmentCreate(BaseModel):
    service_id: int
    slot_start: datetime
    notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: str
    user_id: str
    service_id: int
    department_id: int
    slot_date: datetime
    slot_start: datetime
    slot_end: datetime
    status: str
    notes: Optional[str]
    queue_number: Optional[int]
    queue_date: Optional[datetime]
    window_id: Optional[int]
    qr_token: str
    created_at: datetime
    updated_at: datetime
    class Config: orm_mode = True

# --- Queue ---

class OfficeWindowOut(BaseModel):
    id: int
    department_id: int
    name: str
    is_open: bool
    if V2:
        model_config = ConfigDict(from_attributes=True, extra="ignore")
    else:
        class Config:
            orm_mode = True


class QueueNowOut(BaseModel):
    department_id: int
    date: datetime
    now_serving: Optional[int] = None
    waiting: int
    average_wait_min: Optional[int] = None

# schemas.py
class OfficeWindowCreate(BaseModel):
    department_id: int
    name: str

class OfficeWindowUpdate(BaseModel):
    name: Optional[str] = None
    is_open: Optional[bool] = None
class CheckinPayload(BaseModel):
    qr_token: str
class QueueTicketOut(BaseModel):
    id: str
    department_id: int
    service_id: Optional[int]
    date: datetime
    number: int
    appointment_id: Optional[str]
    window_id: Optional[int]
    status: str
    created_at: datetime
    called_at: Optional[datetime]
    served_at: Optional[datetime]
    class Config: orm_mode = True
