# DocuMind — Multi-Document RAG Intelligence Platform

A full-stack AI platform that lets you upload multiple PDFs and ask natural language questions against them, with cited answers and source highlighting.

## Features

- **Multi-document Q&A** — upload PDFs, ask questions, get cited answers with source passages highlighted
- **Comparison mode** — answer the same question from two documents side by side
- **Confidence scoring** — per-answer confidence based on retrieval quality
- **"What's missing" mode** — surfaces what the documents don't answer

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| RAG pipeline | LangChain |
| Embeddings | HuggingFace (`sentence-transformers`) |
| Vector store | ChromaDB |
| LLM | Claude API (claude-sonnet-4-6) |
| Frontend | React + TypeScript (Vite) |
| MLOps | MLflow |

## Project Structure

```
documind/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entrypoint
│   │   ├── api/routes/      # Endpoint routers
│   │   ├── core/            # Config, RAG pipeline
│   │   ├── models/          # Pydantic schemas
│   │   └── services/        # Business logic
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/        # API client
│       ├── types/           # TypeScript types
│       └── hooks/
├── mlflow/                  # MLflow tracking config
└── docker-compose.yml
```

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See `backend/.env.example` for required variables.
