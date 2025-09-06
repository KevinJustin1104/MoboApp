from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app import schemas, crud, models
from app.db.session import get_db_session
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import verify_password, create_access_token

router = APIRouter()


from sqlalchemy.orm import joinedload

UPLOAD_DIR = "uploads"


@router.post(
    "/register",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db_session)):
    # Check if email exists
    print("test")
    existing = crud.get_user_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Ensure roles exist
    for role_name in ["admin", "user"]:
        role_obj = db.query(models.Role).filter(models.Role.name == role_name).first()
        if not role_obj:
            role_obj = models.Role(name=role_name)
            db.add(role_obj)
            db.commit()
            db.refresh(role_obj)

    # Get the role object from the payload
    role_obj = db.query(models.Role).filter(models.Role.name == user_in.role).first()
    if not role_obj:
        raise HTTPException(
            status_code=400, detail=f"Role '{user_in.role}' does not exist"
        )

    # Create the user
    user = crud.create_user(
        db,
        name=user_in.name,
        email=user_in.email,
        password=user_in.password,
        phone=user_in.phone,
        role_id=role_obj.id,
    )

    # Load role relationship
    user = (
        db.query(models.User)
        .options(joinedload(models.User.role))
        .filter_by(id=user.id)
        .first()
    )

    # Convert SQLAlchemy Role object to dict for Pydantic
    user_dict = user.__dict__.copy()
    user_dict["role"] = {"id": str(user.role.id), "name": user.role.name}
    return user_dict


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_session),
):
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}
