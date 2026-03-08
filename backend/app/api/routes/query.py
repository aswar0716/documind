from fastapi import APIRouter, HTTPException, status

from app.models.schemas import QueryRequest, QueryResponse
from app.services import query_service

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Ask a question against one or more uploaded documents.
    Returns the answer, cited source passages, and a confidence score.
    """
    if not request.document_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one document_id to query against.",
        )
    return query_service.query_documents(request)


@router.post("/compare")
async def compare_documents():
    # Phase 4
    pass


@router.post("/missing")
async def what_is_missing():
    # Phase 4
    pass
