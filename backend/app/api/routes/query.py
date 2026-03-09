from fastapi import APIRouter, HTTPException, status

from app.models.schemas import (
    QueryRequest, QueryResponse,
    CompareRequest, CompareResponse,
    MissingRequest, MissingResponse,
)
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


@router.post("/compare", response_model=CompareResponse)
async def compare_documents(request: CompareRequest):
    """
    Ask the same question against two documents independently.
    Returns side-by-side answers, each with their own sources and confidence score.
    """
    if request.document_id_a == request.document_id_b:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="document_id_a and document_id_b must be different documents.",
        )
    return query_service.compare_documents(request)


@router.post("/missing", response_model=MissingResponse)
async def what_is_missing(request: MissingRequest):
    """
    Identify what aspects of the question the selected documents do NOT answer.
    Returns is_answerable, a list of gaps, and a summary.
    """
    if not request.document_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one document_id.",
        )
    return query_service.what_is_missing(request)
