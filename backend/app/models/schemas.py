from pydantic import BaseModel
from datetime import datetime


# --- Document schemas ---

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    message: str


class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    uploaded_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentInfo]


# --- Query schemas ---

class QueryRequest(BaseModel):
    question: str
    document_ids: list[str]
    top_k: int = 5


class SourceChunk(BaseModel):
    document_id: str
    filename: str
    page: int
    text: str
    score: float


class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceChunk]
    confidence: float
    document_ids: list[str]


# --- Comparison mode ---

class CompareRequest(BaseModel):
    question: str
    document_id_a: str
    document_id_b: str
    top_k: int = 5


class CompareResponse(BaseModel):
    question: str
    answer_a: QueryResponse
    answer_b: QueryResponse


# --- What's missing mode ---

class MissingRequest(BaseModel):
    question: str
    document_ids: list[str]


class MissingResponse(BaseModel):
    question: str
    answer: str
    is_answerable: bool
    missing_aspects: list[str]
