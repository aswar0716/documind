from fastapi import APIRouter

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
async def upload_document():
    # Phase 2: accept PDF upload, parse, chunk, embed, store in ChromaDB
    pass


@router.get("/")
async def list_documents():
    # Phase 2: return all uploaded documents
    pass


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    # Phase 2: remove document and its vectors from ChromaDB
    pass
