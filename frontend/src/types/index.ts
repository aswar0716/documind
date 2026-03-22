// All interfaces mirror the Pydantic schemas in backend/app/models/schemas.py

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  message_count: number;
}

export interface ProjectListResponse {
  projects: Project[];
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface DocumentInfo {
  id: string;
  project_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  uploaded_at: string;
}

export interface DocumentListResponse {
  documents: DocumentInfo[];
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface SourceChunk {
  document_id: string;
  filename: string;
  page: number;
  text: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: "user" | "assistant";
  content: string;
  document_ids: string[];
  sources: SourceChunk[];
  confidence: number | null;
  created_at: string;
}

export interface ChatMessagePair {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export interface MessageListResponse {
  messages: ChatMessage[];
  total: number;
}

export interface SendMessageRequest {
  question: string;
  document_ids: string[];
  top_k?: number;
}
