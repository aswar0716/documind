import { useState } from "react";
import { useCompare } from "../hooks/useQuery";
import { ConfidenceBar, SourceCard } from "./shared";
import type { DocumentInfo, QueryResponse } from "../types";

// ─── Sub-component: one column of the comparison ─────────────────────────────

function CompareColumn({
  label,
  result,
}: {
  label: string;
  result: QueryResponse;
}) {
  return (
    <div style={styles.column}>
      <p style={styles.columnLabel}>{label}</p>
      <p style={styles.filename}>{result.document_ids[0]}</p>

      <ConfidenceBar value={result.confidence} />

      <div style={styles.answerBox}>
        <p style={styles.answerText}>{result.answer}</p>
      </div>

      {result.sources.length > 0 && (
        <div>
          <p style={styles.sourcesHeading}>Sources ({result.sources.length})</p>
          {result.sources.map((chunk, i) => (
            <SourceCard key={i} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CompareViewProps {
  documents: DocumentInfo[];
}

export function CompareView({ documents }: CompareViewProps) {
  // Each side has its own selected document ID.
  // Initialise to empty string — the <select> will show "— pick —" placeholder.
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [question, setQuestion] = useState("");

  const { result, loading, error, run, reset } = useCompare();

  // Validation: both sides must be chosen, must be different, question must exist.
  const sameDoc = idA !== "" && idA === idB;
  const canSubmit =
    question.trim().length > 0 &&
    idA !== "" &&
    idB !== "" &&
    !sameDoc &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await run({ question: question.trim(), document_id_a: idA, document_id_b: idB });
  }

  function handleReset() {
    setQuestion("");
    setIdA("");
    setIdB("");
    reset();
  }

  // Map document_id → filename so CompareColumn can show a readable name.
  const idToName = Object.fromEntries(
    documents.map((d) => [d.document_id, d.filename])
  );

  if (documents.length < 2) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Upload at least two documents to use comparison mode.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Compare</h2>

      <form onSubmit={handleSubmit}>
        {/* Document selectors — two <select> dropdowns side by side */}
        <div style={styles.selectors}>
          <div style={styles.selectorGroup}>
            <label style={styles.label}>Document A</label>
            {/* A <select> is a controlled input just like <input> and <textarea>.
                value={idA} + onChange keeps React state in sync with the selection. */}
            <select
              style={styles.select}
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
            >
              <option value="">— pick —</option>
              {documents.map((doc) => (
                <option key={doc.document_id} value={doc.document_id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.selectorGroup}>
            <label style={styles.label}>Document B</label>
            <select
              style={styles.select}
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
            >
              <option value="">— pick —</option>
              {documents.map((doc) => (
                <option key={doc.document_id} value={doc.document_id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Warn immediately if the user picks the same document for both sides */}
        {sameDoc && (
          <p style={styles.warnText}>Choose two different documents.</p>
        )}

        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="Ask the same question against both documents…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit"
            style={canSubmit ? styles.submitBtn : { ...styles.submitBtn, opacity: 0.5 }}
            disabled={!canSubmit}
          >
            {loading ? "Comparing…" : "Compare"}
          </button>
          {result && (
            <button type="button" style={styles.resetBtn} onClick={handleReset}>
              Clear
            </button>
          )}
        </div>
      </form>

      {error && <p style={styles.errorText}>{error}</p>}

      {/* Side-by-side results — CSS grid with two equal columns.
          On narrow screens (< 700px) it would overflow; a responsive
          breakpoint could be added with a media query, but is out of scope here. */}
      {result && (
        <div style={styles.grid}>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "#f0f0f0",
  },
  selectors: {
    display: "flex",
    gap: "1rem",
    marginBottom: "0.75rem",
    flexWrap: "wrap",
  },
  selectorGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    flex: 1,
    minWidth: 200,
  },
  label: {
    fontSize: "0.8rem",
    color: "#888",
  },
  select: {
    background: "#1a1a1a",
    color: "#f0f0f0",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    padding: "0.5rem 0.75rem",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  warnText: {
    color: "#eab308",
    fontSize: "0.85rem",
    marginBottom: "0.5rem",
  },
  textarea: {
    width: "100%",
    background: "#1a1a1a",
    color: "#f0f0f0",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "0.75rem",
    fontSize: "0.95rem",
    resize: "vertical",
    marginBottom: "0.75rem",
    fontFamily: "inherit",
  },
  submitBtn: {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0.5rem 1.25rem",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  resetBtn: {
    background: "transparent",
    color: "#888",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "0.5rem 1rem",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  errorText: {
    color: "#f87171",
    fontSize: "0.875rem",
    marginTop: "0.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginTop: "1.5rem",
  },
  column: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  columnLabel: {
    fontSize: "0.75rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  filename: {
    fontSize: "0.9rem",
    color: "#60a5fa",
    fontWeight: 500,
    marginTop: -4,
  },
  answerBox: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: 8,
    padding: "0.75rem",
  },
  answerText: {
    color: "#f0f0f0",
    lineHeight: 1.65,
    fontSize: "0.9rem",
    whiteSpace: "pre-wrap",
  },
  sourcesHeading: {
    color: "#888",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.4rem",
  },
  muted: {
    color: "#666",
    fontSize: "0.875rem",
  },
};
