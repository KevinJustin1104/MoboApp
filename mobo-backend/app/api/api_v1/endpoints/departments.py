from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Department
from app.schemas import DepartmentCreate, DepartmentRead
from app.db.session import get_db_session

router = APIRouter()


# Get all departments
@router.get("/", response_model=list[DepartmentRead])
def get_departments(db: Session = Depends(get_db_session)):
    return db.query(Department).all()


# Create department
@router.post("/", response_model=DepartmentRead)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db_session)):
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
