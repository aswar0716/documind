import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_db
from app.models.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
)
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: sqlite3.Connection = Depends(get_db)):
    return project_service.create_project(body.name, body.description, db)


@router.get("/", response_model=ProjectListResponse)
def list_projects(db: sqlite3.Connection = Depends(get_db)):
    return ProjectListResponse(projects=project_service.list_projects(db))


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    project = project_service.get_project(project_id, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: sqlite3.Connection = Depends(get_db),
):
    project = project_service.update_project(project_id, body.name, body.description, db)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    deleted = project_service.delete_project(project_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
