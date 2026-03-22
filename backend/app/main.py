from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import documents, query, projects, chat, project_documents


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once on startup: create SQLite tables if they don't exist.
    init_db()
    yield
    # Anything after yield runs on shutdown (nothing needed here).


app = FastAPI(
    title="DocuMind API",
    description="Multi-document RAG intelligence platform",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy routes (kept during migration — will be removed once frontend is updated)
app.include_router(documents.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")

# New project-scoped routes
app.include_router(projects.router, prefix="/api/v1")
app.include_router(project_documents.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}
