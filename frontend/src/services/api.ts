import type {
  DocumentUploadResponse,
  DocumentListResponse,
  QueryRequest,
  QueryResponse,
  CompareRequest,
  CompareResponse,
  MissingRequest,
  MissingResponse,
} from "../types";

// Empty base URL: in dev, Vite's proxy forwards /api/* to localhost:8000.
// In Docker, Nginx's proxy forwards /api/* to the backend container.
const BASE_URL = "/api";

// Shared helper: throw a descriptive error if the response is not 2xx.
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

// --- Documents ---

export async function listDocuments(): Promise<DocumentListResponse> {
  const response = await fetch(`${BASE_URL}/documents/`);
  return handleResponse<DocumentListResponse>(response);
}

export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
  const form = new FormData();
  form.append("file", file); // "file" must match the FastAPI parameter name
  const response = await fetch(`${BASE_URL}/documents/upload`, {
    method: "POST",
    body: form,
    // Do NOT set Content-Type manually — the browser sets it automatically with
    // the correct multipart boundary when body is FormData.
  });
  return handleResponse<DocumentUploadResponse>(response);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
}

// --- Query ---

export async function queryDocuments(request: QueryRequest): Promise<QueryResponse> {
  const response = await fetch(`${BASE_URL}/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<QueryResponse>(response);
}

export async function compareDocuments(request: CompareRequest): Promise<CompareResponse> {
  const response = await fetch(`${BASE_URL}/query/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<CompareResponse>(response);
}

export async function whatIsMissing(request: MissingRequest): Promise<MissingResponse> {
  const response = await fetch(`${BASE_URL}/query/missing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<MissingResponse>(response);
}
