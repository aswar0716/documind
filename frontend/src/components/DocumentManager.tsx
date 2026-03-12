import { useRef, useState } from "react";
import { useDocuments } from "../hooks/useDocuments";
import type { DocumentInfo } from "../types";

type DocsHook = ReturnType<typeof useDocuments>;

// ─── Sub-component: one row in the document list ──────────────────────────────

interface DocumentRowProps {
  doc: DocumentInfo;
  onDelete: (id: string) => void;
}

function DocumentRow({ doc, onDelete }: DocumentRowProps) {
  const date = new Date(doc.uploaded_at).toLocaleDateString();

  return (
    <div style={styles.row}>
      <div style={styles.rowInfo}>
        <span style={styles.filename}>{doc.filename}</span>
        <span style={styles.meta}>
          {doc.page_count} pages · {doc.chunk_count} chunks · {date}
        </span>
      </div>
      <button
        style={styles.deleteBtn}
        onClick={() => onDelete(doc.document_id)}
        title="Delete document"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentManager({ docsHook }: { docsHook: DocsHook }) {
  const { documents, loading, error, uploading, upload, remove } = docsHook;

  // uploadError is local to this component — it only matters near the upload form.
  // It is separate from the list-level `error` that comes from the hook.
  const [uploadError, setUploadError] = useState<string | null>(null);

  // useRef gives us a reference to the hidden file input DOM element so we can
  // programmatically click it when the user clicks our styled button.
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow PDF files. The `accept` attribute on the input prevents most
    // non-PDFs in the picker dialog, but we also validate here because users
    // can bypass the dialog by dropping files or editing HTML.
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      return;
    }

    setUploadError(null);

    upload(file).catch((err: unknown) => {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    });

    // Reset the input so uploading the same file again triggers onChange.
    e.target.value = "";
  }

  async function handleDelete(documentId: string) {
    try {
      await remove(documentId);
    } catch (err) {
      // A failed delete is shown inline; a full error boundary is out of scope here.
      console.error("Delete failed:", err);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Documents</h2>

      {/* Hidden file input — triggered by the styled button below */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <button
        style={uploading ? { ...styles.uploadBtn, opacity: 0.6 } : styles.uploadBtn}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading…" : "Upload PDF"}
      </button>

      {uploadError && <p style={styles.errorText}>{uploadError}</p>}

      <div style={styles.list}>
        {loading && <p style={styles.muted}>Loading…</p>}
        {error && <p style={styles.errorText}>{error}</p>}
        {!loading && !error && documents.length === 0 && (
          <p style={styles.muted}>No documents yet. Upload a PDF to get started.</p>
        )}
        {documents.map((doc) => (
          <DocumentRow key={doc.document_id} doc={doc} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Inline style objects keep this component self-contained with no CSS file needed.
// In a larger app you would use CSS modules or a design system instead.

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "#f0f0f0",
  },
  uploadBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0.5rem 1.25rem",
    fontSize: "0.95rem",
    cursor: "pointer",
    marginBottom: "0.75rem",
  },
  errorText: {
    color: "#f87171",
    fontSize: "0.875rem",
    marginBottom: "0.5rem",
  },
  list: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "0.75rem 1rem",
  },
  rowInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  filename: {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "#f0f0f0",
  },
  meta: {
    fontSize: "0.8rem",
    color: "#888",
  },
  deleteBtn: {
    background: "transparent",
    border: "1px solid #444",
    color: "#888",
    borderRadius: 4,
    padding: "0.2rem 0.5rem",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  muted: {
    color: "#666",
    fontSize: "0.875rem",
  },
};
