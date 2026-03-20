import { useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { ConfidenceBar, SourceCard } from "./shared";
import type { DocumentInfo } from "../types";

export function QueryView({ documents }: { documents: DocumentInfo[] }) {
  const [question, setQuestion] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { result, loading, error, run, reset } = useQuery();

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || selectedIds.size === 0) return;
    await run({ question: question.trim(), document_ids: [...selectedIds] });
  }

  function handleReset() {
    setQuestion("");
    setSelectedIds(new Set());
    reset();
  }

  const canSubmit = question.trim().length > 0 && selectedIds.size > 0 && !loading;

  if (documents.length === 0) {
    return (
      <EmptyState icon="🔍" title="No documents yet" sub="Upload a PDF on the Documents tab first." />
    );
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={s.pageTitle}>Query</h1>
        <p style={s.pageSubtitle}>Ask a question and get an answer from your documents.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset className="fieldset" style={{ marginBottom: "0.85rem" }}>
          <legend>Documents to search</legend>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "0.4rem" }}>
            {documents.map((doc) => (
              <label key={doc.document_id} className="check-label">
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.document_id)}
                  onChange={() => toggle(doc.document_id)}
                />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.filename}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                  {doc.page_count}p
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <textarea
          className="textarea"
          rows={3}
          placeholder="Ask a question about the selected documents…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ marginBottom: "0.75rem" }}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {loading ? <><span className="spinner" /> Thinking…</> : "Ask"}
          </button>
          {result && (
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              Clear
            </button>
          )}
        </div>
      </form>

      {error && <p className="error-text" style={{ marginTop: "0.75rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <p className="section-label">Confidence</p>
            <ConfidenceBar value={result.confidence} />
          </div>

          <div className="card">
            <p className="section-label" style={{ marginBottom: "0.6rem" }}>Answer</p>
            <p style={{ color: "var(--text)", lineHeight: 1.75, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
              {result.answer}
            </p>
          </div>

          {result.sources.length > 0 && (
            <div>
              <p className="section-label">Sources ({result.sources.length})</p>
              {result.sources.map((chunk, i) => <SourceCard key={i} chunk={chunk} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{icon}</div>
      <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>{title}</div>
      <div className="muted-text">{sub}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageTitle:    { fontSize: "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--text-muted)", fontSize: "0.875rem" },
};
