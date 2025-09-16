from http.client import HTTPException
from typing import List, Iterable, Set
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.deps import get_current_user
from app.models import Department
from app import schemas

router = APIRouter()


def _role_to_str(r) -> str:
    """Best-effort convert a role object/enum/string to a lowercase string."""
    if r is None:
        return ""
    if isinstance(r, str):
        return r.lower()
    # enum-like: value or name
    if hasattr(r, "value") and isinstance(getattr(r, "value"), str):
        return str(r.value).lower()
    if hasattr(r, "name") and isinstance(getattr(r, "name"), str):
        return str(r.name).lower()
    # ORM Role model: try common fields
    for attr in ("code", "slug", "key", "title", "name"):
        v = getattr(r, attr, None)
        if isinstance(v, str):
            return v.lower()
    return str(r).lower()

def _collect_role_strings(user) -> Set[str]:
    """Collect role strings from user.role, user.roles, and typical admin flags."""
    roles: Set[str] = set()

    # single role
    if hasattr(user, "role"):
        roles.add(_role_to_str(user.role))

    # many roles
    maybe_roles = getattr(user, "roles", None)
    if isinstance(maybe_roles, Iterable):
        for rr in maybe_roles:
            roles.add(_role_to_str(rr))

    # common admin flags
    if getattr(user, "is_superuser", False) or getattr(user, "is_admin", False):
        roles.add("admin")

    # normalize blanks out
    roles = {r for r in roles if r}
    return roles

def _extract_department_ids(user) -> List[int]:
    """Find department ids from typical fields/relations on a staff user."""
    ids: Set[int] = set()

    # direct fk
    for attr in ("department_id", "dept_id"):
        v = getattr(user, attr, None)
        if isinstance(v, int):
            ids.add(v)

    # single relation
    dept = getattr(user, "department", None)
    if dept is not None and hasattr(dept, "id") and isinstance(dept.id, int):
        ids.add(dept.id)

    # many-to-many relations
    for coll_name in ("departments", "staff_departments"):
        coll = getattr(user, coll_name, None)
        if coll:
            for d in coll:
                if d is not None and hasattr(d, "id") and isinstance(d.id, int):
                    ids.add(d.id)

    return sorted(ids)

@router.get("/", response_model=List[schemas.DepartmentRead])
def get_departments(
    db: Session = Depends(get_db_session),
    user = Depends(get_current_user),
):
    roles = _collect_role_strings(user)

    # Admin or plain user -> all departments
    if "admin" in roles or "user" in roles or not roles:
        return db.query(Department).all()

    # Staff -> restricted to their department(s)
    if "staff" in roles:
        dept_ids = _extract_department_ids(user)
        if not dept_ids:
            # No linked department(s)
            return []
        return db.query(Department).filter(Department.id.in_(dept_ids)).all()

    # Fallback: if role is unknown, behave like plain user
    return db.query(Department).all()


# Create department
@router.post("/", response_model=schemas.DepartmentRead)
def create_department(payload: schemas.DepartmentCreate, db: Session = Depends(get_db_session)):
    # Check if department with same name exists
    existing = db.query(Department).filter(Department.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")

    # Create department with name and optional description
    dept = Department(name=payload.name, description=payload.description)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept
