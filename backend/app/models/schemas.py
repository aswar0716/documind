from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


# ─── Project ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    message_count: int = 0

class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]


# ─── Document ─────────────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    page_count: int
    chunk_count: int
    uploaded_at: datetime

class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]

# Legacy — kept so old routes don't break during migration
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


# ─── Chat / Messages ──────────────────────────────────────────────────────────

class SourceChunk(BaseModel):
    document_id: str
    filename: str
    page: int
    text: str
    score: float

class ChatMessage(BaseModel):
    id: str
    project_id: str
    role: str                        # "user" | "assistant"
    content: str
    document_ids: list[str] = []
    sources: list[SourceChunk] = []
    confidence: Optional[float] = None
    created_at: datetime

class ChatMessagePair(BaseModel):
    user_message: ChatMessage
    assistant_message: ChatMessage

class SendMessageRequest(BaseModel):
    question: str
    document_ids: list[str] = []    # empty = use all project documents
    top_k: int = 5

class MessageListResponse(BaseModel):
    messages: list[ChatMessage]
    total: int


# ─── Legacy query schemas (kept for old /query routes) ────────────────────────

class QueryRequest(BaseModel):
    question: str
    document_ids: list[str]
    top_k: int = 5

class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceChunk]
    confidence: float
    document_ids: list[str]

class CompareRequest(BaseModel):
    question: str
    document_id_a: str
    document_id_b: str
    top_k: int = 5

class CompareResponse(BaseModel):
    question: str
    answer_a: QueryResponse
    answer_b: QueryResponse

class MissingRequest(BaseModel):
    question: str
    document_ids: list[str]

class MissingResponse(BaseModel):
    question: str
    answer: str
    is_answerable: bool
    missing_aspects: list[str]
