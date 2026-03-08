import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, status

from app.core.config import settings
from app.models.schemas import DocumentUploadResponse, DocumentListResponse
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])

_ALLOWED_CONTENT_TYPES = {"application/pdf"}
_MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF. The file is:
      1. Validated (must be PDF, under size limit)
      2. Saved to disk
      3. Parsed, chunked, embedded, stored in ChromaDB
    """
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Only PDF files are accepted. Got: {file.content_type}",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / file.filename

    # Stream to disk, checking size as we go
    bytes_written = 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 256):  # 256 KB chunks
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
        )
    except ValueError as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    return result


@router.get("/", response_model=DocumentListResponse)
async def list_documents():
    """Return metadata for all uploaded documents."""
    docs = document_service.list_documents()
    return DocumentListResponse(documents=docs)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str):
    """Delete a document and all its vectors from ChromaDB."""
    try:
        document_service.delete_document(document_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
