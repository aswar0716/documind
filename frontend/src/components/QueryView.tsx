import { useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { ConfidenceBar, SourceCard } from "./shared";
import type { DocumentInfo } from "../types";

// ─── Main component ───────────────────────────────────────────────────────────

interface QueryViewProps {
  documents: DocumentInfo[];
}

export function QueryView({ documents }: QueryViewProps) {
  // question is a controlled input — React owns the value.
  // Every keystroke calls setQuestion, keeping state and UI in sync.
  const [question, setQuestion] = useState("");

  // selectedIds is a Set of document_id strings the user has checked.
  // Set gives O(1) has/add/delete without mutating array indices.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { result, loading, error, run, reset } = useQuery();

  function toggleDocument(id: string) {
    setSelectedIds((prev) => {
      // Sets are mutable, so we copy before modifying to avoid mutating state directly.
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    // Prevent the browser's default form submission (which would reload the page).
    e.preventDefault();
    if (!question.trim() || selectedIds.size === 0) return;
    await run({
      question: question.trim(),
      document_ids: [...selectedIds], // Set → Array for JSON serialisation
    });
  }

  function handleReset() {
    setQuestion("");
    setSelectedIds(new Set());
    reset();
  }

  const canSubmit = question.trim().length > 0 && selectedIds.size > 0 && !loading;

  if (documents.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.muted}>Upload at least one document before querying.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Query</h2>

      <form onSubmit={handleSubmit}>
        {/* Document selector */}
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Select documents to query</legend>
          {documents.map((doc) => (
            <label key={doc.document_id} style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={selectedIds.has(doc.document_id)}
                onChange={() => toggleDocument(doc.document_id)}
                style={{ marginRight: 8 }}
              />
              {doc.filename}
            </label>
          ))}
        </fieldset>

        {/* Question input */}
        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="Ask a question about the selected documents…"
          value={question}
          // onChange keeps React state in sync with every keystroke.
          // Without this, the textarea would be an uncontrolled input
          // and React couldn't read its value at submit time.
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" style={canSubmit ? styles.submitBtn : { ...styles.submitBtn, opacity: 0.5 }} disabled={!canSubmit}>
            {loading ? "Thinking…" : "Ask"}
          </button>
          {result && (
            <button type="button" style={styles.resetBtn} onClick={handleReset}>
              Clear
            </button>
          )}
        </div>
      </form>

      {error && <p style={styles.errorText}>{error}</p>}

      {/* Results */}
      {result && (
        <div style={styles.results}>
          <ConfidenceBar value={result.confidence} />

          <div style={styles.answerBox}>
            <p style={styles.answerText}>{result.answer}</p>
          </div>

          {result.sources.length > 0 && (
            <div>
              <p style={styles.sourcesHeading}>
                Sources ({result.sources.length})
              </p>
              {result.sources.map((chunk, i) => (
                <SourceCard key={i} chunk={chunk} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  fieldset: {
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    marginBottom: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  legend: {
    color: "#888",
    fontSize: "0.8rem",
    padding: "0 0.25rem",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    color: "#f0f0f0",
    fontSize: "0.9rem",
    cursor: "pointer",
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
    background: "#2563eb",
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
  answerBox: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "1rem",
  },
  answerText: {
    color: "#f0f0f0",
    lineHeight: 1.65,
    fontSize: "0.95rem",
    whiteSpace: "pre-wrap",
  },
  sourcesHeading: {
    color: "#888",
    fontSize: "0.8rem",
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  muted: {
    color: "#666",
    fontSize: "0.875rem",
  },
};
