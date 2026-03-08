from __future__ import annotations

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.core.config import settings


def get_embedding_function() -> HuggingFaceEmbeddings:
    """
    Returns a HuggingFace embedding function.
    sentence-transformers/all-MiniLM-L6-v2 runs locally — no API cost.
    It produces 384-dimensional vectors, fast and good enough for most RAG tasks.
    """
    return HuggingFaceEmbeddings(
        model_name=settings.embedding_model,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def get_chroma_client() -> chromadb.PersistentClient:
    """
    Returns a persistent ChromaDB client.
    PersistentClient saves the vector store to disk so data survives restarts.
    """
    return chromadb.PersistentClient(
        path=settings.chroma_db_path,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


# Module-level singletons — created once, reused across requests.
# Embedding model takes ~2s to load; we don't want that per request.
_embedding_fn: HuggingFaceEmbeddings | None = None
_chroma_client: chromadb.PersistentClient | None = None


def embedding_fn() -> HuggingFaceEmbeddings:
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = get_embedding_function()
    return _embedding_fn


def chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = get_chroma_client()
    return _chroma_client


COLLECTION_NAME = "documents"


def get_collection() -> chromadb.Collection:
    """
    Returns (or creates) the single ChromaDB collection that holds all document chunks.
    All documents share one collection — we filter by document_id metadata at query time.
    """
    return chroma_client().get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},  # cosine similarity for text embeddings
    )
