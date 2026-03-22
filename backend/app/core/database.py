"""
SQLite connection and schema management.

DocuMind uses two storage systems for different purposes:
  - SQLite  → structured relational data (projects, documents, messages)
  - ChromaDB → vector embeddings (similarity search)

SQLite is part of Python's standard library — no extra dependency needed.
"""
from __future__ import annotations

import sqlite3
from collections.abc import Generator

from app.core.config import settings


def get_connection() -> sqlite3.Connection:
    """
    Open a SQLite connection with sensible defaults:

    - row_factory = sqlite3.Row  → columns are accessible by name (row["id"])
      instead of by index (row[0]). Much easier to work with.
    - WAL journal mode            → allows concurrent reads while a write is
      in progress. Prevents "database is locked" errors under load.
    - foreign_keys = ON           → enforces ON DELETE CASCADE so deleting a
      project automatically removes its documents and messages rows.
    """
    # check_same_thread=False is safe here because each request gets its own
    # connection via the get_db() dependency — connections are never shared.
    conn = sqlite3.connect(settings.sqlite_db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """
    Create all tables if they don't already exist.
    Called once at application startup via the FastAPI lifespan event.
    'IF NOT EXISTS' makes this safe to call on every restart.
    """
    conn = get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS documents (
                id          TEXT PRIMARY KEY,
                project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                filename    TEXT NOT NULL,
                page_count  INTEGER NOT NULL DEFAULT 0,
                chunk_count INTEGER NOT NULL DEFAULT 0,
                file_path   TEXT NOT NULL,
                uploaded_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id           TEXT PRIMARY KEY,
                project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                role         TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content      TEXT NOT NULL,
                document_ids TEXT NOT NULL DEFAULT '[]',
                sources      TEXT NOT NULL DEFAULT '[]',
                confidence   REAL,
                created_at   TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_documents_project
                ON documents(project_id);

            CREATE INDEX IF NOT EXISTS idx_messages_project
                ON messages(project_id, created_at);
        """)
        conn.commit()
    finally:
        conn.close()


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """
    FastAPI dependency that yields a database connection per request
    and closes it automatically when the request finishes.

    Usage in a route:
        def my_route(db: sqlite3.Connection = Depends(get_db)):
            ...
    """
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
