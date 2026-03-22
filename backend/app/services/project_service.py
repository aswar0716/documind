"""
Project CRUD service.

All functions take a sqlite3.Connection as their last argument —
they never open their own connection. This keeps them testable in
isolation and plays nicely with FastAPI's Depends(get_db) pattern.
"""
from __future__ import annotations

import json
import shutil
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.core.vector_store import get_collection
from app.models.schemas import ProjectResponse


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_project(row: sqlite3.Row, doc_count: int = 0, msg_count: int = 0) -> ProjectResponse:
    return ProjectResponse(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        document_count=doc_count,
        message_count=msg_count,
    )


def create_project(name: str, description: str, db: sqlite3.Connection) -> ProjectResponse:
    project_id = str(uuid.uuid4())
    now = _now()
    db.execute(
        "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?,?,?,?,?)",
        (project_id, name.strip(), description.strip(), now, now),
    )
    db.commit()
    row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return _row_to_project(row)


def list_projects(db: sqlite3.Connection) -> list[ProjectResponse]:
    rows = db.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
    result = []
    for row in rows:
        doc_count = db.execute(
            "SELECT COUNT(*) FROM documents WHERE project_id = ?", (row["id"],)
        ).fetchone()[0]
        msg_count = db.execute(
            "SELECT COUNT(*) FROM messages WHERE project_id = ?", (row["id"],)
        ).fetchone()[0]
        result.append(_row_to_project(row, doc_count, msg_count))
    return result


def get_project(project_id: str, db: sqlite3.Connection) -> ProjectResponse | None:
    row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        return None
    doc_count = db.execute(
        "SELECT COUNT(*) FROM documents WHERE project_id = ?", (project_id,)
    ).fetchone()[0]
    msg_count = db.execute(
        "SELECT COUNT(*) FROM messages WHERE project_id = ?", (project_id,)
    ).fetchone()[0]
    return _row_to_project(row, doc_count, msg_count)


def update_project(
    project_id: str,
    name: str | None,
    description: str | None,
    db: sqlite3.Connection,
) -> ProjectResponse | None:
    row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        return None
    new_name = name.strip() if name is not None else row["name"]
    new_desc = description.strip() if description is not None else row["description"]
    db.execute(
        "UPDATE projects SET name=?, description=?, updated_at=? WHERE id=?",
        (new_name, new_desc, _now(), project_id),
    )
    db.commit()
    return get_project(project_id, db)


def delete_project(project_id: str, db: sqlite3.Connection) -> bool:
    """
    Delete a project and all its data:
      1. Remove all ChromaDB vectors for this project
      2. Delete all uploaded PDF files from disk
      3. Delete the SQLite row (CASCADE removes documents + messages rows)
    """
    row = db.execute("SELECT id FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        return False

    # 1. Delete vectors from ChromaDB
    try:
        collection = get_collection()
        results = collection.get(where={"project_id": project_id}, include=[])
        if results["ids"]:
            collection.delete(ids=results["ids"])
    except Exception:
        pass  # Don't block deletion if ChromaDB is in a bad state

    # 2. Delete uploaded files from disk
    doc_rows = db.execute(
        "SELECT file_path FROM documents WHERE project_id = ?", (project_id,)
    ).fetchall()
    for doc_row in doc_rows:
        try:
            Path(doc_row["file_path"]).unlink(missing_ok=True)
        except Exception:
            pass

    # 3. Delete SQLite row (CASCADE handles documents + messages)
    db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    db.commit()
    return True


def touch_project(project_id: str, db: sqlite3.Connection) -> None:
    """Update updated_at to now — called when a document is added or a message is sent."""
    db.execute(
        "UPDATE projects SET updated_at=? WHERE id=?", (_now(), project_id)
    )
    db.commit()
