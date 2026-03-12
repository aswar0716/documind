import { useState } from "react";
import { useDocuments } from "./hooks/useDocuments";
import { DocumentManager } from "./components/DocumentManager";
import { QueryView } from "./components/QueryView";
import { CompareView } from "./components/CompareView";

// The tabs the user can switch between.
// Using a union type means TypeScript will catch any typo in tab names.
type Tab = "documents" | "query" | "compare";

const TABS: { id: Tab; label: string }[] = [
  { id: "documents", label: "Documents" },
  { id: "query", label: "Query" },
  { id: "compare", label: "Compare" },
];

function App() {
  const [tab, setTab] = useState<Tab>("documents");

  // useDocuments is lifted to App so both DocumentManager and QueryView share
  // the same document list without fetching it twice.
  const docs = useDocuments();

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f" }}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>DocuMind</span>
          <span style={{ color: "#555", fontSize: "0.85rem" }}>
            Multi-Document RAG Intelligence Platform
          </span>
        </div>
        <nav style={styles.nav}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? { ...styles.tabBtn, ...styles.tabActive } : styles.tabBtn}
            >
              {t.label}
              {/* Show document count badge on the Documents tab */}
              {t.id === "documents" && docs.documents.length > 0 && (
                <span style={styles.badge}>{docs.documents.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === "documents" && <DocumentManager docsHook={docs} />}
        {tab === "query" && <QueryView documents={docs.documents} />}
        {tab === "compare" && <CompareView documents={docs.documents} />}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 2rem",
    borderBottom: "1px solid #1e1e1e",
    color: "#f0f0f0",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  nav: {
    display: "flex",
    gap: "0.25rem",
  },
  tabBtn: {
    background: "transparent",
    color: "#888",
    border: "none",
    borderRadius: 6,
    padding: "0.4rem 0.9rem",
    fontSize: "0.9rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  tabActive: {
    background: "#1e1e1e",
    color: "#f0f0f0",
  },
  badge: {
    background: "#2563eb",
    color: "#fff",
    borderRadius: 10,
    padding: "0 6px",
    fontSize: "0.7rem",
    lineHeight: "1.4",
  },
};

export default App;
