import { useState } from "react";
import { useDocuments } from "./hooks/useDocuments";
import { DocumentManager } from "./components/DocumentManager";
import { QueryView } from "./components/QueryView";
import { CompareView } from "./components/CompareView";
import { MissingView } from "./components/MissingView";

type Tab = "documents" | "query" | "compare" | "missing";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "documents", label: "Documents",      icon: "📄" },
  { id: "query",     label: "Query",           icon: "🔍" },
  { id: "compare",   label: "Compare",         icon: "⚖️"  },
  { id: "missing",   label: "What's Missing?", icon: "🔎" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("documents");
  const docs = useDocuments();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={s.header}>
        <div style={s.brand}>
          {/* Gradient brand text */}
          <span style={s.logo}>DocuMind</span>
          <span style={s.tagline}>Multi-Document RAG Intelligence</span>
        </div>

        <nav style={s.nav}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.id === "documents" && docs.documents.length > 0 && (
                <span className="badge-count">{docs.documents.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main style={tab === "compare" ? s.mainWide : s.main}>
        {tab === "documents" && <DocumentManager docsHook={docs} />}
        {tab === "query"     && <QueryView     documents={docs.documents} />}
        {tab === "compare"   && <CompareView   documents={docs.documents} />}
        {tab === "missing"   && <MissingView   documents={docs.documents} />}
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    borderBottom: "1px solid var(--border)",
    backdropFilter: "blur(8px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "rgba(10,10,15,0.92)",
    minHeight: 52,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.5rem 0",
  },
  logo: {
    fontSize: "1.15rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  tagline: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    letterSpacing: "0.01em",
  },
  nav: {
    display: "flex",
    gap: "0.15rem",
  },
  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "2rem 1.25rem",
  },
  mainWide: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "2rem 1.25rem",
  },
};
