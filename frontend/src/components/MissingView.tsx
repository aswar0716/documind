import { useState } from "react";
import { useMissing } from "../hooks/useQuery";
import type { DocumentInfo } from "../types";

interface MissingViewProps {
  documents: DocumentInfo[];
}

export function MissingView({ documents }: MissingViewProps) {
  const [question, setQuestion] = useState("");
  // Multi-select: a Set of chosen document IDs.
  // Set is ideal here — add/delete are O(1) and there are no duplicates.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { result, loading, error, run, reset } = useMissing();

  function toggleDoc(id: string) {
    setSelected((prev) => {
      // Sets are immutable in React state — always build a new Set.
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSubmit = question.trim().length > 0 && selected.size > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await run({ question: question.trim(), document_ids: Array.from(selected) });
  }

  function handleReset() {
    setQuestion("");
    setSelected(new Set());
    reset();
  }

  if (documents.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Upload at least one document to analyse gaps.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>What's Missing?</h2>
      <p style={styles.subtitle}>
        Ask a question and find out which aspects are <em>not</em> covered by the selected documents.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Checkbox list — lets the user pick any subset of documents */}
        <p style={styles.label}>Select documents</p>
        <div style={styles.checkboxList}>
          {documents.map((doc) => (
            <label key={doc.document_id} style={styles.checkboxRow}>
              {/* Wrapping input + span in a <label> means clicking the filename
                  also toggles the checkbox — no extra onClick needed. */}
              <input
                type="checkbox"
                checked={selected.has(doc.document_id)}
                onChange={() => toggleDoc(doc.document_id)}
                style={{ accentColor: "#7c3aed", cursor: "pointer" }}
              />
              <span style={styles.checkboxLabel}>{doc.filename}</span>
              <span style={styles.checkboxMeta}>
                {doc.page_count}p · {doc.chunk_count} chunks
              </span>
            </label>
          ))}
        </div>

        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="What question should the documents be able to answer?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit"
            style={canSubmit ? styles.submitBtn : { ...styles.submitBtn, opacity: 0.5 }}
            disabled={!canSubmit}
          >
            {loading ? "Analysing…" : "Analyse Gaps"}
          </button>
          {result && (
            <button type="button" style={styles.resetBtn} onClick={handleReset}>
              Clear
            </button>
          )}
        </div>
      </form>

      {error && <p style={styles.errorText}>{error}</p>}

      {result && (
        <div style={styles.results}>
          {/* Answerable badge — green if yes, red if no */}
          <div style={styles.badgeRow}>
            <span
              style={{
                ...styles.badge,
                background: result.is_answerable ? "#14532d" : "#450a0a",
                color: result.is_answerable ? "#4ade80" : "#f87171",
                border: `1px solid ${result.is_answerable ? "#166534" : "#7f1d1d"}`,
              }}
            >
              {result.is_answerable ? "Answerable" : "Not fully answerable"}
            </span>
          </div>

          {/* Summary sentence from the LLM */}
          <p style={styles.summary}>{result.answer}</p>

          {/* Gap list — only rendered when there are actual gaps */}
          {result.missing_aspects.length > 0 && (
            <div style={styles.gapBox}>
              <p style={styles.gapHeading}>Gaps identified</p>
              <ul style={styles.gapList}>
                {result.missing_aspects.map((aspect, i) => (
                  <li key={i} style={styles.gapItem}>
                    {aspect}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.missing_aspects.length === 0 && result.is_answerable && (
            <p style={styles.allCovered}>
              The selected documents fully cover this question — no gaps found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
    color: "#f0f0f0",
  },
  subtitle: {
    color: "#888",
    fontSize: "0.875rem",
    marginBottom: "1.25rem",
  },
  label: {
    fontSize: "0.8rem",
    color: "#888",
    marginBottom: "0.4rem",
  },
  checkboxList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginBottom: "0.75rem",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "0.75rem",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: "0.9rem",
    color: "#f0f0f0",
    flex: 1,
  },
  checkboxMeta: {
    fontSize: "0.75rem",
    color: "#555",
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
  results: {
    marginTop: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  badgeRow: {
    display: "flex",
  },
  badge: {
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "0.25rem 0.75rem",
    borderRadius: 999,
  },
  summary: {
    color: "#e2e8f0",
    lineHeight: 1.65,
    fontSize: "0.95rem",
  },
  gapBox: {
    background: "#1a0a0a",
    border: "1px solid #3b1515",
    borderRadius: 10,
    padding: "1rem",
  },
  gapHeading: {
    color: "#f87171",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.6rem",
    fontWeight: 600,
  },
  gapList: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  gapItem: {
    color: "#fca5a5",
    fontSize: "0.9rem",
    lineHeight: 1.5,
    paddingLeft: "1rem",
    position: "relative",
  },
  allCovered: {
    color: "#4ade80",
    fontSize: "0.9rem",
  },
  muted: {
    color: "#666",
    fontSize: "0.875rem",
  },
};
