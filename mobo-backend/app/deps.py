# app/deps.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from app.db.session import get_db_session
from app import models
from app.core.security import decode_token
from typing import Optional
from jose import JWTError, ExpiredSignatureError

# OAuth2 token URL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


# DB dependency
def get_db(db: Session = Depends(get_db_session)):
    return db


# Get current logged-in user
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db_session)
) -> models.User:
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
            )
        return user
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    role_name = getattr(getattr(current_user, "role", None), "name", None)
    if not (getattr(current_user, "is_admin", False) or role_name == "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


# Get current admin user
def get_current_admin(current_user: models.User = Depends(get_current_user)):
    """
    Checks if current user is admin.
    Looks for either:
    - is_admin attribute
    - role relationship with name "admin"
    """
    role_name = getattr(getattr(current_user, "role", None), "name", None)
    if getattr(current_user, "is_admin", False) or role_name == "admin" or role_name == "staff":
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
    )
