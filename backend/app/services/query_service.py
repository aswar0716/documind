from __future__ import annotations

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

from app.core.config import settings
from app.core.vector_store import get_collection, embedding_fn
from app.models.schemas import (
    QueryRequest, QueryResponse, SourceChunk,
    CompareRequest, CompareResponse,
    MissingRequest, MissingResponse,
)


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
# Shared helper — run the full RAG pipeline for one set of document IDs
# ---------------------------------------------------------------------------

def _run_pipeline(question: str, document_ids: list[str], top_k: int) -> QueryResponse:
    """
    Internal helper used by both query_documents and compare_documents.
    Retrieves chunks, calls the LLM, computes confidence, returns QueryResponse.
    """
    chunks = _retrieve_chunks(question=question, document_ids=document_ids, top_k=top_k)

    if not chunks:
        return QueryResponse(
            question=question,
            answer="No relevant content found in the selected documents.",
            sources=[],
            confidence=0.0,
            document_ids=document_ids,
        )

    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        context_parts.append(
            f"[Passage {i} — {chunk['filename']}, page {chunk['page']}]\n{chunk['text']}"
        )
    context = "\n\n".join(context_parts)

    llm = _get_llm()
    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=_USER_PROMPT_TEMPLATE.format(
            context=context,
            question=question,
        )),
    ]
    answer = llm.invoke(messages).content.strip()

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

    return QueryResponse(
        question=question,
        answer=answer,
        sources=sources,
        confidence=_compute_confidence(chunks),
        document_ids=document_ids,
    )


# ---------------------------------------------------------------------------
# Main query function
# ---------------------------------------------------------------------------

def query_documents(request: QueryRequest) -> QueryResponse:
    """Ask a question against one or more documents. Returns answer + sources + confidence."""
    return _run_pipeline(request.question, request.document_ids, request.top_k)


# ---------------------------------------------------------------------------
# Comparison mode
# ---------------------------------------------------------------------------

def compare_documents(request: CompareRequest) -> CompareResponse:
    """
    Run the full RAG pipeline independently against two documents and return
    both answers side by side.

    Each call to _run_pipeline sees ONLY its own document's chunks —
    the answers are genuinely independent, not blended.
    """
    answer_a = _run_pipeline(request.question, [request.document_id_a], request.top_k)
    answer_b = _run_pipeline(request.question, [request.document_id_b], request.top_k)

    return CompareResponse(
        question=request.question,
        answer_a=answer_a,
        answer_b=answer_b,
    )


# ---------------------------------------------------------------------------
# "What's missing" mode
# ---------------------------------------------------------------------------

_MISSING_SYSTEM_PROMPT = """\
You are an expert at identifying gaps in document coverage.
You will be given passages retrieved from a document and a question.
Your job is to identify what aspects of the question the passages do NOT answer.

Respond in this exact format:
ANSWERABLE: yes or no
GAPS: a bullet-point list of specific aspects not covered (or "none" if fully answered)
SUMMARY: one sentence summarising what is and isn't covered
"""

_MISSING_USER_TEMPLATE = """\
Document passages:
{context}

Question: {question}

Analyse what the passages cover and what they miss:"""


def what_is_missing(request: MissingRequest) -> MissingResponse:
    """
    Retrieve relevant chunks then ask the LLM to identify what aspects of
    the question are NOT covered by the documents.
    """
    chunks = _retrieve_chunks(
        question=request.question,
        document_ids=request.document_ids,
        top_k=5,
    )

    if not chunks:
        return MissingResponse(
            question=request.question,
            answer="No relevant content found — the documents appear to cover nothing about this topic.",
            is_answerable=False,
            missing_aspects=["The documents contain no information on this topic."],
        )

    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        context_parts.append(
            f"[Passage {i} — {chunk['filename']}, page {chunk['page']}]\n{chunk['text']}"
        )
    context = "\n\n".join(context_parts)

    llm = _get_llm()
    messages = [
        SystemMessage(content=_MISSING_SYSTEM_PROMPT),
        HumanMessage(content=_MISSING_USER_TEMPLATE.format(
            context=context,
            question=request.question,
        )),
    ]
    raw = llm.invoke(messages).content.strip()

    # Parse the structured LLM response
    is_answerable, missing_aspects, summary = _parse_missing_response(raw)

    return MissingResponse(
        question=request.question,
        answer=summary,
        is_answerable=is_answerable,
        missing_aspects=missing_aspects,
    )


def _parse_missing_response(raw: str) -> tuple[bool, list[str], str]:
    """
    Parse the structured output from the 'what's missing' LLM call.
    Falls back gracefully if the model doesn't follow the exact format.
    """
    lines = raw.splitlines()
    is_answerable = True
    missing_aspects: list[str] = []
    summary = raw  # fallback: return raw text as summary

    for line in lines:
        line = line.strip()
        if line.lower().startswith("answerable:"):
            value = line.split(":", 1)[1].strip().lower()
            is_answerable = value == "yes"
        elif line.lower().startswith("summary:"):
            summary = line.split(":", 1)[1].strip()
        elif line.startswith("-") or line.startswith("•"):
            aspect = line.lstrip("-•").strip()
            if aspect and aspect.lower() != "none":
                missing_aspects.append(aspect)

    if not missing_aspects and not is_answerable:
        missing_aspects = ["The documents do not sufficiently address this question."]

    return is_answerable, missing_aspects, summary
