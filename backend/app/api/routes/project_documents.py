import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status

from app.core.config import settings
from app.core.database import get_db
from app.models.schemas import DocumentResponse, DocumentListResponse
from app.services import document_service, project_service

router = APIRouter(tags=["documents"])

_ALLOWED_CONTENT_TYPES = {"application/pdf"}
_MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024


@router.post(
    "/projects/{project_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db),
):
    if not project_service.get_project(project_id, db):
        raise HTTPException(status_code=404, detail="Project not found")

    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Only PDF files are accepted. Got: {file.content_type}",
        )

    upload_dir = Path(settings.upload_dir) / project_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / file.filename

    bytes_written = 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 256):
            bytes_written += len(chunk)
            if bytes_written > _MAX_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {settings.max_upload_size_mb} MB limit.",
                )
            f.write(chunk)

    try:
        result = document_service.process_and_store_pdf(
            pdf_path=str(dest),
            filename=file.filename,
            project_id=project_id,
            db=db,
        )
    except ValueError as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    return result


@router.get("/projects/{project_id}/documents", response_model=DocumentListResponse)
def list_documents(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    if not project_service.get_project(project_id, db):
        raise HTTPException(status_code=404, detail="Project not found")
    docs = document_service.list_documents(project_id, db)
    return DocumentListResponse(documents=docs)


@router.delete(
    "/projects/{project_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    project_id: str,
    document_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    try:
        document_service.delete_document(document_id, project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
