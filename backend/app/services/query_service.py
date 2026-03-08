from __future__ import annotations

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

from app.core.config import settings
from app.core.vector_store import get_collection, embedding_fn
from app.models.schemas import QueryRequest, QueryResponse, SourceChunk


# ---------------------------------------------------------------------------
# LLM singleton — same pattern as the embedding model in vector_store.py
# ---------------------------------------------------------------------------

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.openai_api_key,
            temperature=0,  # deterministic answers — no creative variation
        )
    return _llm


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a precise document assistant. Answer the user's question using ONLY
the provided document passages. Follow these rules strictly:

1. Base your answer entirely on the passages given — do not use outside knowledge.
2. If the passages do not contain enough information to answer, say so clearly.
3. Be concise and direct.
4. Do not mention that you are using passages or context — just answer naturally.
"""

_USER_PROMPT_TEMPLATE = """\
Document passages:
{context}

Question: {question}

Answer:"""


# ---------------------------------------------------------------------------
# Core retrieval function
# ---------------------------------------------------------------------------

def _retrieve_chunks(
    question: str,
    document_ids: list[str],
    top_k: int,
) -> list[dict]:
    """
    Embed the question, query ChromaDB for the most similar chunks,
    filtered to the given document IDs.

    Returns a list of result dicts with keys:
      text, document_id, filename, page, score
    """
    question_embedding = embedding_fn().embed_query(question)

    collection = get_collection()

    # Build a ChromaDB metadata filter.
    # If one document → simple equality filter.
    # If multiple documents → use $in operator.
    if len(document_ids) == 1:
        where_filter = {"document_id": document_ids[0]}
    else:
        where_filter = {"document_id": {"$in": document_ids}}

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    # ChromaDB returns results wrapped in an extra list (one per query embedding).
    # We sent one embedding so we unwrap index [0].
    texts = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]  # cosine distance: 0 = identical, 2 = opposite

    chunks = []
    for text, meta, distance in zip(texts, metadatas, distances):
        # Convert cosine distance → similarity score (0–1, higher = more relevant)
        similarity = 1 - (distance / 2)
        chunks.append({
            "text": text,
            "document_id": meta["document_id"],
            "filename": meta["filename"],
            "page": meta["page"],
            "score": round(similarity, 4),
        })

    return chunks


# ---------------------------------------------------------------------------
# Confidence scoring
# ---------------------------------------------------------------------------

def _compute_confidence(chunks: list[dict]) -> float:
    """
    Estimate how confident we should be in the answer, based on retrieval quality.

    Logic:
    - If the top chunk has high similarity, that's a good signal.
    - If multiple chunks have high similarity, even better (consistent evidence).
    - If all scores are low, the documents probably don't cover this topic well.

    Returns a float 0.0–1.0.
    """
    if not chunks:
        return 0.0

    scores = [c["score"] for c in chunks]
    top_score = scores[0]          # highest similarity chunk
    mean_score = sum(scores) / len(scores)

    # Weighted blend: top score matters most, mean score adds stability
    raw = (top_score * 0.7) + (mean_score * 0.3)

    # Clamp to [0, 1] in case of floating point edge cases
    return round(max(0.0, min(1.0, raw)), 3)


# ---------------------------------------------------------------------------
# Main query function
# ---------------------------------------------------------------------------

def query_documents(request: QueryRequest) -> QueryResponse:
    """
    Full RAG pipeline:
      1. Retrieve the most relevant chunks for the question
      2. Build a prompt with those chunks as context
      3. Call the LLM for an answer
      4. Package everything into a QueryResponse
    """
    chunks = _retrieve_chunks(
        question=request.question,
        document_ids=request.document_ids,
        top_k=request.top_k,
    )

    if not chunks:
        return QueryResponse(
            question=request.question,
            answer="No relevant content found in the selected documents.",
            sources=[],
            confidence=0.0,
            document_ids=request.document_ids,
        )

    # Build the context block from retrieved chunks
    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        context_parts.append(
            f"[Passage {i} — {chunk['filename']}, page {chunk['page']}]\n{chunk['text']}"
        )
    context = "\n\n".join(context_parts)

    # Call the LLM
    llm = _get_llm()
    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=_USER_PROMPT_TEMPLATE.format(
            context=context,
            question=request.question,
        )),
    ]
    response = llm.invoke(messages)
    answer = response.content.strip()

    # Build source objects for the response
    sources = [
        SourceChunk(
            document_id=c["document_id"],
            filename=c["filename"],
            page=c["page"],
            text=c["text"],
            score=c["score"],
        )
        for c in chunks
    ]

    confidence = _compute_confidence(chunks)

    return QueryResponse(
        question=request.question,
        answer=answer,
        sources=sources,
        confidence=confidence,
        document_ids=request.document_ids,
    )
