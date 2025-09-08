from typing import Any, Optional, List, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import Body
from app.db.session import get_db_session
from app import models, schemas, deps
from app.core.security import hash_password  # if you use it in creation

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get(
    "/staff",
    response_model=schemas.StaffListResponse,
    summary="List users with department (role gated)",
)
def get_staff(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(deps.get_current_user),
    q: Optional[str] = Query(None, description="Search name/email/department"),
    department_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort: str = Query("-created", pattern="^-?created$"),
):
    # Role gating
    role_name = (getattr(getattr(current_user, "role", None), "name", None) or "").lower()
    print("Current user role:", role_name)
    if role_name == "admin":
        allowed_roles = ["admin", "staff"]
    elif role_name == "staff":
        allowed_roles = ["staff"]
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to see the other user role.",
        )

    base = (
        db.query(models.User, models.Department.name.label("department_name"))
        .outerjoin(models.Department, models.User.department_id == models.Department.id)
        .outerjoin(models.Role, models.User.role_id == models.Role.id)
        .filter(func.lower(models.Role.name).in_([r.lower() for r in allowed_roles]))
    )

    if department_id:
        base = base.filter(models.User.department_id == department_id)

    if q:
        like = f"%{q}%"
        base = base.filter(
            or_(
                models.User.name.ilike(like),
                models.User.email.ilike(like),
                models.Department.name.ilike(like),
            )
        )

    ordered = base.order_by(
        models.User.created_at.asc() if sort == "created" else models.User.created_at.desc()
    )

    # correct total (distinct user ids)
    subq = base.with_entities(models.User.id).distinct().subquery()
    total = db.query(func.count()).select_from(subq).scalar() or 0

    rows: List[Tuple[models.User, Optional[str]]] = ordered.limit(limit).offset(offset).all()
    items = [
        schemas.UserWithDeptOut(
            id=u.id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            department_id=u.department_id,
            department_name=dept_name,
            role=getattr(getattr(u, "role", None), "name", None),
            is_active=u.is_active,
        )
        for (u, dept_name) in rows
    ]
    return schemas.StaffListResponse(items=items, total=total)


@router.post(
    "/departments/{department_id}/staff",
    response_model=schemas.UserWithDeptOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create staff (role=staff) in a department",
)
def create_department_staff(
    department_id: int,
    payload: schemas.StaffCreate = Body(...),   # <-- explicit JSON body
    db: Session = Depends(get_db_session),
    _: Any = Depends(deps.require_admin),
):
    dept = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # find/create 'staff' role
    staff_role = db.query(models.Role).filter(func.lower(models.Role.name) == "staff").first()
    if not staff_role:
        staff_role = models.Role(name="staff")
        db.add(staff_role)
        db.flush()

    exists = db.query(models.User).filter(models.User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already in use")

    user = models.User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password=hash_password(payload.password),  # store HASH
        role_id=staff_role.id,
        department_id=dept.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return schemas.UserWithDeptOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        department_id=user.department_id,
        department_name=dept.name,
        role=getattr(getattr(user, "role", None), "name", None),
        is_active=user.is_active,
    )
