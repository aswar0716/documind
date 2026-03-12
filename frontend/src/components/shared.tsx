// Shared sub-components used by both QueryView and CompareView.

import type { SourceChunk } from "../types";

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "#22c55e" : value >= 0.4 ? "#eab308" : "#ef4444";
  return (
    <div>
      <div style={{ fontSize: "0.85rem", color: "#aaa", marginBottom: "0.35rem" }}>
        Confidence: <strong>{pct}%</strong>
      </div>
      <div style={{ height: 8, background: "#2a2a2a", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 4,
            transition: "width 0.4s ease",
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

export function SourceCard({ chunk }: { chunk: SourceChunk }) {
  const scorePct = Math.round(chunk.score * 100);
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 8,
        padding: "0.75rem",
        marginBottom: "0.5rem",
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ color: "#60a5fa", fontSize: "0.8rem", fontWeight: 500 }}>
          {chunk.filename}
        </span>
        <span style={{ color: "#888", fontSize: "0.8rem" }}>p. {chunk.page}</span>
        <span style={{ color: "#888", fontSize: "0.8rem" }}>relevance {scorePct}%</span>
      </div>
      <p style={{ color: "#ccc", fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {chunk.text}
      </p>
    </div>
  );
}
