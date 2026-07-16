import { useEffect, useRef, useState } from "react";
import {
  Bot,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

async function getError(response) {
  try {
    const data = await response.json();
    return data.detail || "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function sessionLabel(sessionId) {
  return `Conversation ${sessionId.replace("session-", "#")}`;
}

export function Chat({ email, token, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messageRequest = useRef(0);
  const messageEnd = useRef(null);

  const authHeader = { Authorization: `Bearer ${token}` };
  const initials = email.slice(0, 2).toUpperCase();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) loadMessages(activeSession);
  }, [activeSession]);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const response = await fetch("/api/sessions", { headers: authHeader });
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) {
        setError(await getError(response));
        return;
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch {
      setError("Unable to load your conversations. Please refresh and try again.");
    }
  };

  const loadMessages = async (sessionId) => {
    const requestId = ++messageRequest.current;
    setError("");

    try {
      const response = await fetch(
        `/api/messages?session_id=${encodeURIComponent(sessionId)}`,
        { headers: authHeader },
      );
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) {
        setError(await getError(response));
        return;
      }
      const data = await response.json();
      if (requestId === messageRequest.current) {
        setMessages(data.messages || []);
      }
    } catch {
      setError("Unable to load this conversation. Please try again.");
    }
  };

  const newSession = async () => {
    setError("");
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ email }),
      });
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) {
        setError(await getError(response));
        return;
      }
      const data = await response.json();
      setSessions((current) => [data.session_id, ...current]);
      setMessages([]);
      setActiveSession(data.session_id);
      setSidebarOpen(false);
    } catch {
      setError("Unable to start a new conversation. Please try again.");
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !activeSession || loading) return;

    setInput("");
    setError("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ session_id: activeSession, message: text }),
      });
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) {
        setError(await getError(response));
        return;
      }
      const data = await response.json();
      if (data.reply) {
        setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("The assistant could not respond. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectSession = (sessionId) => {
    setActiveSession(sessionId);
    setSidebarOpen(false);
  };

  return (
    <div className="chat-layout">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`} aria-label="Conversations">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span className="brand-mark"><Bot /></span>
            <span>Honcho</span>
          </div>
          <button
            className="icon-button sidebar-close"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close conversations"
          >
            <X />
          </button>
        </div>

        <button className="new-session-button" type="button" onClick={newSession}>
          <Plus />
          <span>New conversation</span>
        </button>

        <div className="sidebar-section-title">Your conversations</div>
        <nav className="session-list" aria-label="Your conversations">
          {sessions.length ? sessions.map((sessionId) => (
            <button
              key={sessionId}
              className={`session-item ${sessionId === activeSession ? "active" : ""}`}
              type="button"
              aria-current={sessionId === activeSession ? "page" : undefined}
              onClick={() => selectSession(sessionId)}
            >
              <MessageCircle />
              <span>{sessionLabel(sessionId)}</span>
            </button>
          )) : (
            <p className="sidebar-empty">Your saved conversations will appear here.</p>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-avatar">{initials}</span>
            <span className="sidebar-user-copy">
              <strong>{email}</strong>
              <small>Personal memory</small>
            </span>
          </div>
          <button className="icon-button" type="button" onClick={onLogout} aria-label="Sign out" title="Sign out">
            <LogOut />
          </button>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close conversations" onClick={() => setSidebarOpen(false)} />}

      <main className="chat-area">
        <header className="chat-header">
          <button className="icon-button mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">
            <Menu />
          </button>
          <div className="chat-title">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <p>{activeSession ? sessionLabel(activeSession) : "Honcho Memory Chat"}</p>
              <span>Memory is active</span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {activeSession ? (
          <>
            <section className="conversation" aria-live="polite">
              <div className="conversation-inner">
                <div className="conversation-kicker"><Sparkles /> Context-aware conversation</div>
                {messages.map((message, index) => (
                  <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
                    <div className="message-avatar">
                      {message.role === "user" ? initials : <Bot />}
                    </div>
                    <div className="message-body">
                      <div className="message-meta">
                        <strong>{message.role === "user" ? "You" : "Honcho"}</strong>
                        {message.role === "assistant" && <span>Memory-aware</span>}
                      </div>
                      <div className="message-bubble">{message.content}</div>
                    </div>
                  </article>
                ))}
                {loading && (
                  <article className="message assistant" aria-label="Assistant is thinking">
                    <div className="message-avatar"><Bot /></div>
                    <div className="message-body">
                      <div className="message-meta"><strong>Honcho</strong><span>Thinking</span></div>
                      <div className="message-bubble typing-indicator"><i /><i /><i /></div>
                    </div>
                  </article>
                )}
                <div ref={messageEnd} />
              </div>
            </section>

            <div className="composer-wrap">
              <div className="composer-inner">
                {error && <p className="chat-error" role="alert">{error}</p>}
                <div className="composer">
                  <textarea
                    className="chat-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Message Honcho..."
                    aria-label="Message Honcho"
                    rows="1"
                    disabled={loading}
                  />
                  <button className="send-button" type="button" onClick={send} disabled={loading || !input.trim()} aria-label="Send message">
                    <SendHorizontal />
                  </button>
                </div>
                <p className="composer-hint">Enter to send <span>•</span> Shift + Enter for a new line</p>
              </div>
            </div>
          </>
        ) : (
          <section className="empty-state">
            <div className="empty-icon"><Sparkles /></div>
            <p className="eyebrow">Your memory workspace</p>
            <h1>Start a conversation worth remembering.</h1>
            <p>Honcho keeps the important context close, so every new chat starts with more understanding.</p>
            {error && <p className="chat-error" role="alert">{error}</p>}
            <button className="primary-action" type="button" onClick={newSession}>
              <Plus />
              New conversation
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
