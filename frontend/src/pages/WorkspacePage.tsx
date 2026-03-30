import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfidenceBar, SourceCard } from "../components/shared";
import {
  listDocuments, uploadDocument, deleteDocument,
  listMessages, sendMessage, clearMessages,
} from "../services/api";
import type { DocumentInfo, ChatMessage, Project } from "../types";

interface Props {
  projects: Project[];
  onRefresh: () => void;
}

export function WorkspacePage({ projects, onRefresh }: Props) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === projectId);

  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [question, setQuestion] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load documents and messages on mount
  useEffect(() => {
    if (!projectId) return;
    listDocuments(projectId).then((docs) => {
      setDocuments(docs);
      // Default: select all documents
      setSelectedDocIds(new Set(docs.map((d) => d.id)));
    });
    listMessages(projectId).then((res) => setMessages(res.messages));
  }, [projectId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  function toggleDoc(id: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files supported.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const doc = await uploadDocument(projectId, file);
      setDocuments((prev) => [...prev, doc]);
      setSelectedDocIds((prev) => new Set([...prev, doc.id]));
      onRefresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!projectId) return;
    await deleteDocument(projectId, docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setSelectedDocIds((prev) => { const n = new Set(prev); n.delete(docId); return n; });
    onRefresh();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !projectId || sending) return;
    setSendError("");
    setSending(true);

    // Optimistic user message bubble
    const tempId = "temp-" + Date.now();
    const tempMsg: ChatMessage = {
      id: tempId, project_id: projectId, role: "user",
      content: question.trim(), document_ids: [...selectedDocIds],
      sources: [], confidence: null, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    const q = question.trim();
    setQuestion("");

    try {
      const pair = await sendMessage(projectId, {
        question: q,
        document_ids: selectedDocIds.size > 0 ? [...selectedDocIds] : [],
      });
      // Replace temp message with real ones
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        pair.user_message,
        pair.assistant_message,
      ]);
      onRefresh();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError(err instanceof Error ? err.message : "Failed to send");
      setQuestion(q); // restore
    } finally {
      setSending(false);
    }
  }

  async function handleClearChat() {
    if (!projectId || !confirm("Clear all chat history for this project?")) return;
    await clearMessages(projectId);
    setMessages([]);
    onRefresh();
  }

  if (!project) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--text-muted)" }}>Project not found.</p>
        <button className="btn btn-ghost" style={{ marginTop: "1rem" }} onClick={() => navigate("/")}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={s.workspace}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <button className="btn btn-ghost" style={s.backBtn} onClick={() => navigate("/")}>
          ← Back
        </button>

        <div style={s.projectName}>{project.name}</div>
        {project.description && (
          <div style={s.projectDesc}>{project.description}</div>
        )}

        <div style={{ margin: "1.25rem 0 0.5rem" }}>
          <p className="section-label">Documents ({documents.length})</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleUpload}
        />

        <button
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", marginBottom: "0.5rem" }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <><span className="spinner" /> Uploading…</> : "+ Upload PDF"}
        </button>

        {uploadError && <p className="error-text" style={{ marginBottom: "0.5rem" }}>{uploadError}</p>}

        <div style={s.docList}>
          {documents.length === 0 && (
            <p className="muted-text" style={{ fontSize: "0.8rem", padding: "0.5rem 0" }}>
              No documents yet.
            </p>
          )}
          {documents.map((doc) => (
            <label key={doc.id} style={s.docItem}>
              <input
                type="checkbox"
                checked={selectedDocIds.has(doc.id)}
                onChange={() => toggleDoc(doc.id)}
                style={{ accentColor: "var(--blue)", flexShrink: 0 }}
              />
              <span style={s.docName} title={doc.filename}>{doc.filename}</span>
              <button
                className="doc-row-delete"
                onClick={() => handleDeleteDoc(doc.id)}
                title="Remove"
                style={{ flexShrink: 0, padding: "0.1rem 0.35rem" }}
              >
                ✕
              </button>
            </label>
          ))}
        </div>

        {messages.length > 0 && (
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginTop: "auto", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)", fontSize: "0.8rem" }}
            onClick={handleClearChat}
          >
            Clear chat
          </button>
        )}
      </aside>

      {/* Chat panel */}
      <div style={s.chatPanel}>
        {/* Source filter pill */}
        {documents.length > 0 && (
          <div style={s.sourceBar}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "0.5rem" }}>Searching:</span>
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                style={{
                  ...s.sourcePill,
                  background: selectedDocIds.has(doc.id) ? "rgba(59,130,246,0.15)" : "transparent",
                  color: selectedDocIds.has(doc.id) ? "var(--blue)" : "var(--text-muted)",
                  borderColor: selectedDocIds.has(doc.id) ? "rgba(59,130,246,0.4)" : "var(--border)",
                }}
              >
                {doc.filename.replace(".pdf", "")}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div style={s.messages}>
          {messages.length === 0 && (
            <div style={s.emptyChat}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💬</div>
              <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>
                {documents.length === 0 ? "Upload a PDF to start" : "Ask anything"}
              </div>
              <div className="muted-text" style={{ fontSize: "0.85rem" }}>
                {documents.length === 0
                  ? "Upload documents using the sidebar, then ask questions."
                  : `${documents.length} document${documents.length > 1 ? "s" : ""} ready. Ask your first question.`}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} documents={documents} />
          ))}

          {sending && (
            <div style={s.thinkingBubble}>
              <span className="spinner" /> Thinking…
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={s.inputArea}>
          {sendError && <p className="error-text" style={{ marginBottom: "0.5rem" }}>{sendError}</p>}
          <div style={s.inputRow}>
            <textarea
              ref={textareaRef}
              className="textarea"
              style={{ flex: 1, minHeight: 52, maxHeight: 160, resize: "none", marginBottom: 0, overflow: "hidden" }}
              placeholder={
                documents.length === 0
                  ? "Upload a PDF first…"
                  : selectedDocIds.size === 0
                  ? "Select at least one document…"
                  : "Ask a question…"
              }
              value={question}
              disabled={documents.length === 0}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: "flex-end", height: 42, paddingLeft: "1.25rem", paddingRight: "1.25rem" }}
              disabled={!question.trim() || sending || documents.length === 0 || selectedDocIds.size === 0}
            >
              {sending ? <span className="spinner" /> : "Send"}
            </button>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, documents }: { message: ChatMessage; documents: DocumentInfo[] }) {
  const [showSources, setShowSources] = useState(false);
  const idToName = Object.fromEntries(documents.map((d) => [d.id, d.filename]));

  if (message.role === "user") {
    return (
      <div style={mb.userRow}>
        <div style={mb.userBubble}>{message.content}</div>
        {message.document_ids.length > 0 && (
          <div style={mb.docPills}>
            {message.document_ids.map((id) => (
              <span key={id} style={mb.pill}>{(idToName[id] ?? id).replace(".pdf", "")}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={mb.assistantRow} className="page-enter">
      <div style={mb.assistantBubble}>
        {message.confidence !== null && message.confidence !== undefined && (
          <div style={{ marginBottom: "0.75rem" }}>
            <ConfidenceBar value={message.confidence} />
          </div>
        )}
        <p style={{ lineHeight: 1.75, whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{message.content}</p>

        {message.sources.length > 0 && (
          <div style={{ marginTop: "0.85rem" }}>
            <button
              style={mb.sourcesToggle}
              onClick={() => setShowSources((v) => !v)}
            >
              {showSources ? "▾" : "▸"} {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
            </button>
            {showSources && (
              <div style={{ marginTop: "0.5rem" }}>
                {message.sources.map((chunk, i) => <SourceCard key={i} chunk={chunk} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  workspace: {
    display: "flex",
    height: "calc(100vh - 0px)",
    overflow: "hidden",
  },
  sidebar: {
    width: 260,
    flexShrink: 0,
    borderRight: "1px solid var(--border)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    overflowY: "auto",
    background: "var(--surface)",
  },
  backBtn: { alignSelf: "flex-start", fontSize: "0.8rem", padding: "0.3rem 0.6rem", marginBottom: "0.5rem" },
  projectName: { fontWeight: 700, fontSize: "1rem", color: "var(--text)", lineHeight: 1.3 },
  projectDesc: { fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" },
  docList: { display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1 },
  docItem: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    fontSize: "0.8rem", cursor: "pointer", padding: "0.35rem 0.5rem",
    borderRadius: 6, color: "var(--text)",
    transition: "background 0.1s",
  },
  docName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chatPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sourceBar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.4rem",
    padding: "0.6rem 1.25rem",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
  },
  sourcePill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "0.15rem 0.65rem",
    fontSize: "0.75rem",
    cursor: "pointer",
    transition: "all 0.15s",
    background: "transparent",
    fontFamily: "inherit",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  emptyChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "4rem 1rem",
    color: "var(--text-dim)",
    margin: "auto",
  },
  thinkingBubble: {
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
    padding: "0.5rem 0",
  },
  inputArea: {
    padding: "1rem 1.25rem",
    borderTop: "1px solid var(--border)",
    background: "var(--surface)",
  },
  inputRow: { display: "flex", gap: "0.5rem", alignItems: "flex-end" },
};

const mb: Record<string, React.CSSProperties> = {
  userRow: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" },
  userBubble: {
    background: "var(--blue)",
    color: "#fff",
    borderRadius: "14px 14px 4px 14px",
    padding: "0.65rem 1rem",
    maxWidth: "70%",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  docPills: { display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "flex-end" },
  pill: {
    fontSize: "0.7rem",
    background: "rgba(59,130,246,0.12)",
    color: "var(--blue)",
    borderRadius: 4,
    padding: "0.1rem 0.4rem",
  },
  assistantRow: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  assistantBubble: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "4px 14px 14px 14px",
    padding: "0.85rem 1rem",
    maxWidth: "85%",
    color: "var(--text)",
  },
  sourcesToggle: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
};
