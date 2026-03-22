from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from app.models.schemas import (
    ChatMessage, ChatMessagePair, SourceChunk,
)
from app.services.query_service import _run_pipeline
from app.services.project_service import touch_project
from app.services import document_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_message(row: sqlite3.Row) -> ChatMessage:
    raw_sources = json.loads(row["sources"])
    sources = [SourceChunk(**s) for s in raw_sources]
    return ChatMessage(
        id=row["id"],
        project_id=row["project_id"],
        role=row["role"],
        content=row["content"],
        document_ids=json.loads(row["document_ids"]),
        sources=sources,
        confidence=row["confidence"],
        created_at=row["created_at"],
    )


def send_message(
    project_id: str,
    question: str,
    document_ids: list[str],
    top_k: int,
    db: sqlite3.Connection,
) -> ChatMessagePair:
    """
    Run the RAG pipeline, then persist both the user question and
    the assistant answer as message rows in SQLite.

    If document_ids is empty, all documents in the project are used.
    """
    # Default to all project documents if none specified
    if not document_ids:
        docs = document_service.list_documents(project_id, db)
        document_ids = [d.id for d in docs]

    if not document_ids:
        # No documents in the project yet
        user_msg = _insert_message(
            db, project_id, "user", question, [], [], None
        )
        assistant_msg = _insert_message(
            db, project_id, "assistant",
            "No documents have been added to this project yet. Please upload a PDF first.",
            [], [], 0.0
        )
        touch_project(project_id, db)
        return ChatMessagePair(user_message=user_msg, assistant_message=assistant_msg)

    # Run the RAG pipeline (same function used by the old /query endpoint)
    pipeline_result = _run_pipeline(question, document_ids, top_k)

    # Persist user message
    user_msg = _insert_message(
        db, project_id, "user", question, document_ids, [], None
    )

    # Persist assistant message
    sources_data = [s.model_dump() for s in pipeline_result.sources]
    assistant_msg = _insert_message(
        db, project_id, "assistant",
        pipeline_result.answer,
        document_ids,
        sources_data,
        pipeline_result.confidence,
    )

    touch_project(project_id, db)
    return ChatMessagePair(user_message=user_msg, assistant_message=assistant_msg)


def _insert_message(
    db: sqlite3.Connection,
    project_id: str,
    role: str,
    content: str,
    document_ids: list[str],
    sources: list[dict],
    confidence: float | None,
) -> ChatMessage:
    msg_id = str(uuid.uuid4())
    created_at = _now()
    db.execute(
        """INSERT INTO messages (id, project_id, role, content, document_ids, sources, confidence, created_at)
           VALUES (?,?,?,?,?,?,?,?)""",
        (
            msg_id, project_id, role, content,
            json.dumps(document_ids),
            json.dumps(sources),
            confidence,
            created_at,
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM messages WHERE id = ?", (msg_id,)).fetchone()
    return _row_to_message(row)


def list_messages(
    project_id: str,
    limit: int,
    offset: int,
    db: sqlite3.Connection,
) -> tuple[list[ChatMessage], int]:
    total = db.execute(
        "SELECT COUNT(*) FROM messages WHERE project_id = ?", (project_id,)
    ).fetchone()[0]
    rows = db.execute(
        "SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?",
        (project_id, limit, offset),
    ).fetchall()
    return [_row_to_message(r) for r in rows], total


def clear_messages(project_id: str, db: sqlite3.Connection) -> None:
    db.execute("DELETE FROM messages WHERE project_id = ?", (project_id,))
    db.commit()
