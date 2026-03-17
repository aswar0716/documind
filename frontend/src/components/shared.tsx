import type { SourceChunk } from "../types";

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? "var(--green)" : value >= 0.4 ? "var(--amber)" : "var(--red)";
  const label = value >= 0.7 ? "High" : value >= 0.4 ? "Medium" : "Low";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ flex: 1 }}>
        <div style={{ height: 6, background: "var(--border2)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.5s ease" }} />
        </div>
      </div>
      <div style={{ fontSize: "0.78rem", color, fontWeight: 600, minWidth: 70, textAlign: "right" }}>
        {label} · {pct}%
      </div>
    </div>
  );
}

export function SourceCard({ chunk }: { chunk: SourceChunk }) {
  const scorePct = Math.round(chunk.score * 100);
  return (
    <div style={{
      background: "var(--surface2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "0.85rem 1rem",
      marginBottom: "0.5rem",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--blue)", background: "rgba(59,130,246,0.1)", borderRadius: 4, padding: "0.1rem 0.45rem" }}>
          {chunk.filename}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>p. {chunk.page}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          {scorePct}% match
        </span>
      </div>
      <p style={{ color: "var(--text-dim)", fontSize: "0.83rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {chunk.text}
      </p>
    </div>
  );
}
