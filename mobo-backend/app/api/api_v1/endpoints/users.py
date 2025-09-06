# app/api/api_v1/endpoints/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db_session
from app.deps import get_current_user, get_current_admin
from app import crud, schemas

router = APIRouter()


@router.get("/me", response_model=schemas.UserOut)
def me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_admin": (
            current_user.role.name.lower() == "admin" if current_user.role else False
        ),
        "role": (
            {
                "id": str(current_user.role.id),
                "name": current_user.role.name,
            }
            if current_user.role
            else {"id": "", "name": ""}
        ),
    }


@router.get("/admin/all", response_model=List[schemas.UserOut])
def admin_list_users(
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100,
):
    return crud.list_users(db, skip=skip, limit=limit)
