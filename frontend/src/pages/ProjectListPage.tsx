import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, deleteProject } from "../services/api";
import type { Project } from "../types";

interface Props {
  projects: Project[];
  onRefresh: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ProjectListPage({ projects, onRefresh }: Props) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const p = await createProject(name.trim(), desc.trim());
      onRefresh();
      navigate(`/projects/${p.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Delete this project and all its documents and chat history?")) return;
    try {
      await deleteProject(id);
      onRefresh();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="page-enter" style={s.container}>
      {/* Header */}
      <div style={s.hero}>
        <h1 style={s.heroTitle}>DocuMind</h1>
        <p style={s.heroSub}>
          Research workspace for your documents. Create a project, upload PDFs, and have a conversation.
        </p>
      </div>

      {/* Project grid */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>
            {projects.length > 0 ? `Projects (${projects.length})` : "No projects yet"}
          </span>
          <button className="btn btn-primary" onClick={() => { setCreating(true); setName(""); setDesc(""); }}>
            + New Project
          </button>
        </div>

        {projects.length === 0 && !creating && (
          <div style={s.empty}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗂️</div>
            <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Start your first project</div>
            <div className="muted-text">Group related PDFs into a project and chat with them.</div>
          </div>
        )}

        <div style={s.grid}>
          {projects.map((p) => (
            <div
              key={p.id}
              className="project-card"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div style={s.cardIcon}>📁</div>
              <div style={s.cardBody}>
                <div style={s.cardName}>{p.name}</div>
                {p.description && (
                  <div style={s.cardDesc}>{p.description}</div>
                )}
                <div style={s.cardMeta}>
                  <span>{p.document_count} doc{p.document_count !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{p.message_count} message{p.message_count !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{timeAgo(p.updated_at)}</span>
                </div>
              </div>
              <button
                className="card-delete-btn"
                onClick={(e) => handleDelete(e, p.id)}
                title="Delete project"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create project form */}
      {creating && (
        <div style={s.modalOverlay} onClick={() => setCreating(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>New Project</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={s.label}>Project name *</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Quantum Computing Research"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={s.label}>Description (optional)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="What are you researching?"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              {error && <p className="error-text" style={{ marginBottom: "0.75rem" }}>{error}</p>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn btn-primary" disabled={!name.trim() || loading}>
                  {loading ? <><span className="spinner" /> Creating…</> : "Create Project"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" },
  hero: { textAlign: "center", marginBottom: "3rem" },
  heroTitle: {
    fontSize: "2.5rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: "0.75rem",
  },
  heroSub: { color: "var(--text-muted)", fontSize: "1rem", maxWidth: 480, margin: "0 auto" },
  section: { marginBottom: "2rem" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" },
  sectionTitle: { fontWeight: 600, fontSize: "0.95rem", color: "var(--text)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" },
  empty: { textAlign: "center", padding: "4rem 1rem", color: "var(--text-dim)" },
  cardIcon: { fontSize: "1.75rem", flexShrink: 0, marginTop: 2 },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: 600, fontSize: "0.95rem", color: "var(--text)", marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardDesc: { fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardMeta: { display: "flex", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" },
  label: { display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 500 },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "var(--surface)", border: "1px solid var(--border2)",
    borderRadius: 14, padding: "1.75rem", width: "100%", maxWidth: 440,
  },
  modalTitle: { fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.25rem", color: "var(--text)" },
};
