// These interfaces mirror the Pydantic schemas in backend/app/models/schemas.py.
// Field names are kept in snake_case to match the JSON the backend sends.

// --- Document ---

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  message: string;
}

export interface DocumentInfo {
  document_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  uploaded_at: string; // ISO datetime string — Python datetime serialises to string in JSON
}

export interface DocumentListResponse {
  documents: DocumentInfo[];
}

// --- Query ---

export interface QueryRequest {
  question: string;
  document_ids: string[];
  top_k?: number; // optional — backend defaults to 5
}

export interface SourceChunk {
  document_id: string;
  filename: string;
  page: number;
  text: string;
  score: number;
}

export interface QueryResponse {
  question: string;
  answer: string;
  sources: SourceChunk[];
  confidence: number;
  document_ids: string[];
}

// --- Comparison mode ---

export interface CompareRequest {
  question: string;
  document_id_a: string;
  document_id_b: string;
  top_k?: number;
}

export interface CompareResponse {
  question: string;
  answer_a: QueryResponse;
  answer_b: QueryResponse;
}

// --- What's missing mode ---

export interface MissingRequest {
  question: string;
  document_ids: string[];
}

export interface MissingResponse {
  question: string;
  answer: string;
  is_answerable: boolean;
  missing_aspects: string[];
}
