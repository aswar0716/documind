import { useState } from "react";
import { useMissing } from "../hooks/useQuery";
import type { DocumentInfo } from "../types";

export function MissingView({ documents }: { documents: DocumentInfo[] }) {
  const [question, setQuestion] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { result, loading, error, run, reset } = useMissing();

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const canSubmit = question.trim().length > 0 && selectedIds.size > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await run({ question: question.trim(), document_ids: Array.from(selectedIds) });
  }

  function handleReset() { setQuestion(""); setSelectedIds(new Set()); reset(); }

  if (documents.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔎</div>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>No documents yet</div>
        <div className="muted-text">Upload a PDF on the Documents tab first.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={s.pageTitle}>What's Missing?</h1>
        <p style={s.pageSubtitle}>Find out which aspects of a question your documents <em>don't</em> cover.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset className="fieldset" style={{ marginBottom: "0.85rem" }}>
          <legend>Documents to analyse</legend>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "0.4rem" }}>
            {documents.map((doc) => (
              <label key={doc.document_id} className="check-label">
                <input
                  type="checkbox"
                  style={{ accentColor: "var(--amber)" } as React.CSSProperties}
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
          placeholder="What do you want these documents to answer?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ marginBottom: "0.75rem" }}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-amber" disabled={!canSubmit}>
            {loading ? <><span className="spinner" style={{ borderTopColor: "#000" }} /> Analysing…</> : "Analyse Gaps"}
          </button>
          {result && <button type="button" className="btn btn-ghost" onClick={handleReset}>Clear</button>}
        </div>
      </form>

      {error && <p className="error-text" style={{ marginTop: "0.75rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Answerable badge */}
          <div>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: 8,
              padding: "0.35rem 0.85rem",
              fontSize: "0.83rem",
              fontWeight: 600,
              background: result.is_answerable ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: result.is_answerable ? "var(--green)" : "var(--red)",
              border: `1px solid ${result.is_answerable ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            }}>
              {result.is_answerable ? "✓ Answerable" : "✗ Not fully answerable"}
            </span>
          </div>

          {/* Summary */}
          {result.answer && (
            <div className="card">
              <p className="section-label" style={{ marginBottom: "0.5rem" }}>Summary</p>
              <p style={{ color: "var(--text)", fontSize: "0.9rem", lineHeight: 1.75 }}>{result.answer}</p>
            </div>
          )}

          {/* Gaps */}
          {result.missing_aspects.length > 0 && (
            <div className="card" style={{ borderColor: "rgba(245,158,11,0.25)" }}>
              <p className="section-label" style={{ color: "var(--amber)", marginBottom: "0.75rem" }}>
                Gaps identified ({result.missing_aspects.length})
              </p>
              <ul style={{ paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {result.missing_aspects.map((gap, i) => (
                  <li key={i} style={{ color: "var(--text)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.is_answerable && result.missing_aspects.length === 0 && (
            <p style={{ color: "var(--green)", fontSize: "0.875rem" }}>
              ✓ All aspects of the question are covered by the selected documents.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageTitle:    { fontSize: "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--text-muted)", fontSize: "0.875rem" },
};
