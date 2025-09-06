# app/api/api_v1/endpoints/incident_categories.py
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db_session
from app import crud, models, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.IncidentCategoryRead])
def get_incident_categories(db: Session = Depends(get_db_session)):
    categories = crud.get_incident_categories(db)
    # include department_name
    result = []
    for cat in categories:
        dept = None
        if cat.department_id:
            dept = db.query(models.Department).filter(models.Department.id == cat.department_id).first()
        result.append(
            schemas.IncidentCategoryRead(
                id=cat.id,
                name=cat.name,
                department_id=cat.department_id,
                department_name=dept.name if dept else None,
                urgency_level=cat.urgency_level,
            )
        )
    return result


@router.post("/", response_model=schemas.IncidentCategoryRead, status_code=status.HTTP_201_CREATED)
def create_incident_category(payload: schemas.IncidentCategoryCreate, db: Session = Depends(get_db_session)):
    existing = db.query(models.IncidentCategory).filter(models.IncidentCategory.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Incident category already exists")

    cat = crud.create_incident_category(db, payload.name, payload.department_id, payload.urgency_level)

    dept = None
    if cat.department_id:
        dept = db.query(models.Department).filter(models.Department.id == cat.department_id).first()

    return schemas.IncidentCategoryRead(
        id=cat.id,
        name=cat.name,
        department_id=cat.department_id,
        department_name=dept.name if dept else None,
        urgency_level=cat.urgency_level,
    )


@router.put("/{category_id}", response_model=schemas.IncidentCategoryRead)
def update_incident_category(category_id: int, payload: schemas.IncidentCategoryUpdate, db: Session = Depends(get_db_session)):
    cat = crud.update_incident_category(db, category_id, name=payload.name, department_id=payload.department_id, urgency_level=payload.urgency_level)
    if not cat:
        raise HTTPException(status_code=404, detail="Incident category not found")

    dept = None
    if cat.department_id:
        dept = db.query(models.Department).filter(models.Department.id == cat.department_id).first()

    return schemas.IncidentCategoryRead(
        id=cat.id,
        name=cat.name,
        department_id=cat.department_id,
        department_name=dept.name if dept else None,
        urgency_level=cat.urgency_level,
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident_category(category_id: int, db: Session = Depends(get_db_session)):
    ok = crud.delete_incident_category(db, category_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Incident category not found")
    return None
