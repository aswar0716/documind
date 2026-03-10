import { DocumentManager } from "./components/DocumentManager";

function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f" }}>
      <header style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>DocuMind</span>
        <span style={{ color: "#666", fontSize: "0.85rem" }}>
          Multi-Document RAG Intelligence Platform
        </span>
      </header>
      <main>
        <DocumentManager />
      </main>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  padding: "1rem 2rem",
  borderBottom: "1px solid #1e1e1e",
  color: "#f0f0f0",
};

export default App;
