from fastapi import APIRouter

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/")
async def query_documents():
    # Phase 3: run RAG pipeline, return answer + cited sources + confidence
    pass


@router.post("/compare")
async def compare_documents():
    # Phase 4: run RAG against two documents separately, return side-by-side
    pass


@router.post("/missing")
async def what_is_missing():
    # Phase 4: detect what the documents don't answer about the question
    pass
