import type {
  Project, ProjectListResponse,
  DocumentInfo, DocumentListResponse,
  ChatMessagePair, MessageListResponse, SendMessageRequest,
} from "../types";

const BASE = "/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE}/projects/`);
  const data = await handleResponse<ProjectListResponse>(res);
  return data.projects;
}

export async function createProject(name: string, description: string): Promise<Project> {
  const res = await fetch(`${BASE}/projects/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  return handleResponse<Project>(res);
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/${projectId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function updateProject(projectId: string, name: string): Promise<Project> {
  const res = await fetch(`${BASE}/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return handleResponse<Project>(res);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function listDocuments(projectId: string): Promise<DocumentInfo[]> {
  const res = await fetch(`${BASE}/projects/${projectId}/documents`);
  const data = await handleResponse<DocumentListResponse>(res);
  return data.documents;
}

export async function uploadDocument(projectId: string, file: File): Promise<DocumentInfo> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/projects/${projectId}/documents/upload`, {
    method: "POST",
    body: form,
  });
  return handleResponse<DocumentInfo>(res);
}

export async function deleteDocument(projectId: string, documentId: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/${projectId}/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function listMessages(projectId: string): Promise<MessageListResponse> {
  const res = await fetch(`${BASE}/projects/${projectId}/messages`);
  return handleResponse<MessageListResponse>(res);
}

export async function sendMessage(
  projectId: string,
  request: SendMessageRequest,
): Promise<ChatMessagePair> {
  const res = await fetch(`${BASE}/projects/${projectId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<ChatMessagePair>(res);
}

export async function clearMessages(projectId: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/${projectId}/messages`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
