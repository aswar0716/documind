import uuid
import os
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.core.vector_store import get_collection, embedding_fn
from app.models.schemas import DocumentInfo, DocumentUploadResponse


# Chunk settings:
# - chunk_size=800 chars ≈ ~150 words — small enough to be specific, big enough for context
# - chunk_overlap=100 chars — overlap prevents answers being split across chunk boundaries
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def _extract_pages(pdf_path: str) -> list[tuple[int, str]]:
    """
    Extract text from each page of a PDF.
    Returns list of (page_number, text) tuples. Page numbers are 1-indexed.
    """
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = text.strip()
        if text:  # skip blank pages
            pages.append((i + 1, text))
    return pages


def process_and_store_pdf(
    pdf_path: str,
    filename: str,
) -> DocumentUploadResponse:
    """
    Full pipeline for a single PDF:
      1. Extract text per page
      2. Split into chunks
      3. Embed each chunk
      4. Store in ChromaDB with metadata
    Returns a response with the document_id and stats.
    """
    document_id = str(uuid.uuid4())
    pages = _extract_pages(pdf_path)

    if not pages:
        raise ValueError(f"Could not extract any text from '{filename}'. Is it a scanned PDF?")

    # Build chunks with page-level metadata
    all_chunks: list[str] = []
    all_metadata: list[dict] = []

    for page_num, page_text in pages:
        chunks = _splitter.split_text(page_text)
        for chunk in chunks:
            all_chunks.append(chunk)
            all_metadata.append({
                "document_id": document_id,
                "filename": filename,
                "page": page_num,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            })

    # Embed all chunks in one batch (faster than one-by-one)
    embeddings = embedding_fn().embed_documents(all_chunks)

    # Store in ChromaDB
    collection = get_collection()
    chunk_ids = [f"{document_id}_{i}" for i in range(len(all_chunks))]

    collection.add(
        ids=chunk_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadata,
    )

    return DocumentUploadResponse(
        document_id=document_id,
        filename=filename,
        page_count=len(pages),
        chunk_count=len(all_chunks),
        message=f"'{filename}' processed successfully.",
    )


def list_documents() -> list[DocumentInfo]:
    """
    Retrieve all unique documents stored in ChromaDB.
    We query all chunks and deduplicate by document_id.
    """
    collection = get_collection()
    result = collection.get(include=["metadatas"])

    seen: dict[str, DocumentInfo] = {}
    for meta in result["metadatas"]:
        doc_id = meta["document_id"]
        if doc_id not in seen:
            seen[doc_id] = DocumentInfo(
                document_id=doc_id,
                filename=meta["filename"],
                page_count=meta["page"],      # will be updated to max below
                chunk_count=0,
                uploaded_at=datetime.fromisoformat(meta["uploaded_at"]),
            )
        # track max page seen (= total page count)
        if meta["page"] > seen[doc_id].page_count:
            seen[doc_id] = seen[doc_id].model_copy(update={"page_count": meta["page"]})
        seen[doc_id] = seen[doc_id].model_copy(
            update={"chunk_count": seen[doc_id].chunk_count + 1}
        )

    return list(seen.values())


def delete_document(document_id: str) -> None:
    """
    Delete all chunks belonging to a document from ChromaDB.
    Also removes the uploaded PDF file from disk.
    """
    collection = get_collection()

    # Find all chunk IDs for this document
    result = collection.get(
        where={"document_id": document_id},
        include=["metadatas"],
    )

    if not result["ids"]:
        raise ValueError(f"Document '{document_id}' not found.")

    # Delete all chunks
    collection.delete(ids=result["ids"])

    # Delete the file from disk
    filename = result["metadatas"][0]["filename"]
    file_path = Path(settings.upload_dir) / filename
    if file_path.exists():
        os.remove(file_path)
