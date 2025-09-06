from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models import User
from app.schemas import UserOut
from app.db.session import get_db_session
from app.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    """
    Get the current user's profile
    """
    return current_user


@router.put("/", response_model=UserOut)
def update_profile(
    name: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update the current user's profile (name only)
    """
    current_user.name = name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
