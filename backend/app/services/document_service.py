from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.core.vector_store import get_collection, embedding_fn
from app.models.schemas import DocumentResponse, DocumentUploadResponse, DocumentInfo
from app.services.project_service import touch_project


_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_pages(pdf_path: str) -> list[tuple[int, str]]:
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i + 1, text))
    return pages


def process_and_store_pdf(
    pdf_path: str,
    filename: str,
    project_id: str,
    db: sqlite3.Connection,
) -> DocumentResponse:
    """
    Full pipeline for a single PDF:
      1. Extract text per page
      2. Split into chunks
      3. Embed each chunk
      4. Store chunks in ChromaDB with project_id + document_id metadata
      5. Store document row in SQLite
    """
    document_id = str(uuid.uuid4())
    pages = _extract_pages(pdf_path)

    if not pages:
        raise ValueError(f"Could not extract any text from '{filename}'. Is it a scanned PDF?")

    all_chunks: list[str] = []
    all_metadata: list[dict] = []

    for page_num, page_text in pages:
        for chunk in _splitter.split_text(page_text):
            all_chunks.append(chunk)
            all_metadata.append({
                "project_id":  project_id,   # ← scopes chunks to this project
                "document_id": document_id,
                "filename":    filename,
                "page":        page_num,
                "uploaded_at": _now(),
            })

    embeddings = embedding_fn().embed_documents(all_chunks)
    collection = get_collection()
    chunk_ids = [f"{document_id}_{i}" for i in range(len(all_chunks))]
    collection.add(
        ids=chunk_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadata,
    )

    uploaded_at = _now()
    db.execute(
        """INSERT INTO documents (id, project_id, filename, page_count, chunk_count, file_path, uploaded_at)
           VALUES (?,?,?,?,?,?,?)""",
        (document_id, project_id, filename, len(pages), len(all_chunks), pdf_path, uploaded_at),
    )
    db.commit()
    touch_project(project_id, db)

    return DocumentResponse(
        id=document_id,
        project_id=project_id,
        filename=filename,
        page_count=len(pages),
        chunk_count=len(all_chunks),
        uploaded_at=uploaded_at,
    )


def list_documents(project_id: str, db: sqlite3.Connection) -> list[DocumentResponse]:
    """Return all documents for a project, ordered by upload time."""
    rows = db.execute(
        "SELECT * FROM documents WHERE project_id = ? ORDER BY uploaded_at ASC",
        (project_id,),
    ).fetchall()
    return [
        DocumentResponse(
            id=row["id"],
            project_id=row["project_id"],
            filename=row["filename"],
            page_count=row["page_count"],
            chunk_count=row["chunk_count"],
            uploaded_at=row["uploaded_at"],
        )
        for row in rows
    ]


def delete_document(document_id: str, project_id: str, db: sqlite3.Connection) -> None:
    """Delete document chunks from ChromaDB, file from disk, and row from SQLite."""
    row = db.execute(
        "SELECT * FROM documents WHERE id = ? AND project_id = ?",
        (document_id, project_id),
    ).fetchone()
    if not row:
        raise ValueError(f"Document '{document_id}' not found in this project.")

    # Remove vectors from ChromaDB
    collection = get_collection()
    results = collection.get(where={"document_id": document_id}, include=[])
    if results["ids"]:
        collection.delete(ids=results["ids"])

    # Remove file from disk
    try:
        Path(row["file_path"]).unlink(missing_ok=True)
    except Exception:
        pass

    # Remove SQLite row
    db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    db.commit()


# ─── Legacy helpers (used by old /documents routes during migration) ──────────

def list_documents_legacy() -> list[DocumentInfo]:
    collection = get_collection()
    result = collection.get(include=["metadatas"])
    seen: dict[str, DocumentInfo] = {}
    for meta in result["metadatas"]:
        doc_id = meta["document_id"]
        if doc_id not in seen:
            seen[doc_id] = DocumentInfo(
                document_id=doc_id,
                filename=meta["filename"],
                page_count=meta["page"],
                chunk_count=0,
                uploaded_at=datetime.fromisoformat(meta["uploaded_at"]),
            )
        if meta["page"] > seen[doc_id].page_count:
            seen[doc_id] = seen[doc_id].model_copy(update={"page_count": meta["page"]})
        seen[doc_id] = seen[doc_id].model_copy(update={"chunk_count": seen[doc_id].chunk_count + 1})
    return list(seen.values())
