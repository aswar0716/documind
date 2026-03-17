import { useState } from "react";
import { useCompare } from "../hooks/useQuery";
import { ConfidenceBar, SourceCard } from "./shared";
import type { DocumentInfo, QueryResponse } from "../types";

function CompareColumn({ label, result }: { label: string; result: QueryResponse }) {
  return (
    <div style={s.column}>
      <p style={s.colLabel}>{label}</p>
      <p style={s.colFilename}>{result.document_ids[0]}</p>
      <ConfidenceBar value={result.confidence} />
      <div className="card" style={{ marginTop: "0.25rem" }}>
        <p style={{ color: "var(--text)", fontSize: "0.875rem", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
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
  );
}

export function CompareView({ documents }: { documents: DocumentInfo[] }) {
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [question, setQuestion] = useState("");
  const { result, loading, error, run, reset } = useCompare();

  const sameDoc = idA !== "" && idA === idB;
  const canSubmit = question.trim().length > 0 && idA !== "" && idB !== "" && !sameDoc && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await run({ question: question.trim(), document_id_a: idA, document_id_b: idB });
  }

  function handleReset() { setQuestion(""); setIdA(""); setIdB(""); reset(); }

  const idToName = Object.fromEntries(documents.map((d) => [d.document_id, d.filename]));

  if (documents.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚖️</div>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>Need two documents</div>
        <div className="muted-text">Upload at least two PDFs to use comparison mode.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={s.pageTitle}>Compare</h1>
        <p style={s.pageSubtitle}>Ask the same question against two documents and see the answers side by side.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
          {[{ label: "Document A", val: idA, set: setIdA }, { label: "Document B", val: idB, set: setIdB }].map(({ label, val, set }) => (
            <div key={label}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 500 }}>{label}</p>
              <select className="select" value={val} onChange={(e) => set(e.target.value)}>
                <option value="">— select —</option>
                {documents.map((doc) => (
                  <option key={doc.document_id} value={doc.document_id}>{doc.filename}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {sameDoc && <p className="error-text" style={{ marginBottom: "0.6rem" }}>⚠ Choose two different documents.</p>}

        <textarea
          className="textarea"
          rows={3}
          placeholder="Ask the same question against both documents…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ marginBottom: "0.75rem" }}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-purple" disabled={!canSubmit}>
            {loading ? <><span className="spinner" /> Comparing…</> : "Compare"}
          </button>
          {result && <button type="button" className="btn btn-ghost" onClick={handleReset}>Clear</button>}
        </div>
      </form>

      {error && <p className="error-text" style={{ marginTop: "0.75rem" }}>{error}</p>}

      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.75rem" }}>
          <CompareColumn
            label="Document A"
            result={{ ...result.answer_a, document_ids: [idToName[idA] ?? idA] }}
          />
          <CompareColumn
            label="Document B"
            result={{ ...result.answer_b, document_ids: [idToName[idB] ?? idB] }}
          />
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageTitle:    { fontSize: "1.4rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--text-muted)", fontSize: "0.875rem" },
  column: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "1.1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  colLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
  colFilename: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--blue)",
    marginTop: -6,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
