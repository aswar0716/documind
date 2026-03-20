import { useRef, useState } from "react";
import { useDocuments } from "../hooks/useDocuments";
import type { DocumentInfo } from "../types";

type DocsHook = ReturnType<typeof useDocuments>;

function DocumentRow({ doc, onDelete }: { doc: DocumentInfo; onDelete: (id: string) => void }) {
  const date = new Date(doc.uploaded_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="doc-row">
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
        <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>📄</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.filename}
          </div>
          <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: 2 }}>
            {doc.page_count} pages · {doc.chunk_count} chunks · {date}
          </div>
        </div>
      </div>
      <button className="doc-row-delete" onClick={() => onDelete(doc.document_id)} title="Delete">
        ✕
      </button>
    </div>
  );
}

export function DocumentManager({ docsHook }: { docsHook: DocsHook }) {
  const { documents, loading, error, uploading, upload, remove } = docsHook;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      return;
    }
    setUploadError(null);
    upload(file).catch((err: unknown) => {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    });
    e.target.value = "";
  }

  async function handleDelete(id: string) {
    try { await remove(id); }
    catch (err) { console.error("Delete failed:", err); }
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={s.pageTitle}>Documents</h1>
        <p style={s.pageSubtitle}>Upload PDF files to make them queryable.</p>
      </div>

      {/* Upload zone */}
      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileChange} />

      <div
        className="upload-zone"
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={uploading ? { opacity: 0.6, cursor: "wait" } : {}}
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          {uploading ? <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /> : "⬆️"}
        </div>
        <div style={{ fontWeight: 500, color: "var(--text)", marginBottom: "0.25rem" }}>
          {uploading ? "Uploading…" : "Click to upload a PDF"}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Max {50} MB · PDF only
        </div>
      </div>

      {uploadError && <p className="error-text" style={{ marginTop: "0.5rem" }}>{uploadError}</p>}

      {/* Document list */}
      <div style={{ marginTop: "1.5rem" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
            <span className="spinner" /> Loading…
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && documents.length === 0 && (
          <div style={s.emptyState}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🗂️</div>
            <div style={{ fontWeight: 500, marginBottom: "0.3rem" }}>No documents yet</div>
            <div className="muted-text">Upload a PDF above to get started.</div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {documents.map((doc) => (
            <DocumentRow key={doc.document_id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: "0.25rem",
  },
  pageSubtitle: {
    color: "var(--text-muted)",
    fontSize: "0.875rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1rem",
    color: "var(--text-dim)",
  },
};
