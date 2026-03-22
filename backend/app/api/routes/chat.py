import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_db
from app.models.schemas import (
    SendMessageRequest, ChatMessagePair, MessageListResponse,
)
from app.services import chat_service, project_service

router = APIRouter(tags=["chat"])


@router.post(
    "/projects/{project_id}/messages",
    response_model=ChatMessagePair,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    project_id: str,
    body: SendMessageRequest,
    db: sqlite3.Connection = Depends(get_db),
):
    if not project_service.get_project(project_id, db):
        raise HTTPException(status_code=404, detail="Project not found")
    return chat_service.send_message(
        project_id=project_id,
        question=body.question,
        document_ids=body.document_ids,
        top_k=body.top_k,
        db=db,
    )


@router.get("/projects/{project_id}/messages", response_model=MessageListResponse)
def list_messages(
    project_id: str,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: sqlite3.Connection = Depends(get_db),
):
    if not project_service.get_project(project_id, db):
        raise HTTPException(status_code=404, detail="Project not found")
    messages, total = chat_service.list_messages(project_id, limit, offset, db)
    return MessageListResponse(messages=messages, total=total)


@router.delete(
    "/projects/{project_id}/messages",
    status_code=status.HTTP_204_NO_CONTENT,
)
def clear_messages(project_id: str, db: sqlite3.Connection = Depends(get_db)):
    if not project_service.get_project(project_id, db):
        raise HTTPException(status_code=404, detail="Project not found")
    chat_service.clear_messages(project_id, db)
