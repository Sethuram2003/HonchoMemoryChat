import React, { useState, useEffect, useRef } from "react";

const API = "/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");

  const logout = () => {
    setUser(null);
    setView("landing");
  };

  if (!user) {
    return (
      <Auth onLogin={(email) => { setUser(email); setView("chat"); }} />
    );
  }
  return <Chat email={user} onLogout={logout} />;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const endpoint = mode === "login" ? "/api/login" : "/api/register";
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const data = await resp.json();
      setError(data.detail || "Something went wrong");
      return;
    }
    onLogin(email);
  };

  return (
    <div style={styles.authWrap}>
      <div style={styles.authBox}>
        <h2>Honcho Memory Chat</h2>
        <div style={styles.tabs}>
          <button
            style={mode === "login" ? styles.tabActive : styles.tab}
            onClick={() => setMode("login")}
          >Login</button>
          <button
            style={mode === "register" ? styles.tabActive : styles.tab}
            onClick={() => setMode("register")}
          >New User</button>
        </div>
        <form onSubmit={submit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button}>
            {mode === "login" ? "Login" : "Create Account"}
          </button>
          {error && <p style={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

function Chat({ email, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const msgEnd = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) loadMessages();
  }, [activeSession]);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    const resp = await fetch(`/api/sessions?email=${encodeURIComponent(email)}`);
    const data = await resp.json();
    setSessions(data.sessions || []);
  };

  const loadMessages = async () => {
    const resp = await fetch(
      `/api/messages?email=${encodeURIComponent(email)}&session_id=${activeSession}`
    );
    const data = await resp.json();
    setMessages(data.messages || []);
  };

  const newSession = async () => {
    const resp = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await resp.json();
    setSessions([data.session_id, ...sessions]);
    setActiveSession(data.session_id);
    setMessages([]);
  };

  const send = async () => {
    if (!input.trim() || !activeSession) return;
    const text = input;
    setInput("");
    setMessages([...messages, { role: "user", content: text }]);
    setLoading(true);
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, session_id: activeSession, message: text }),
    });
    const data = await resp.json();
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  return (
    <div style={styles.chatWrap}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span>{email}</span>
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>
        <button onClick={newSession} style={styles.newSessionBtn}>+ New Session</button>
        <div style={styles.sessionList}>
          {sessions.map((s) => (
            <div
              key={s}
              onClick={() => { setActiveSession(s); }}
              style={s === activeSession ? styles.sessionActive : styles.sessionItem}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
      <div style={styles.chatArea}>
        {activeSession ? (
          <>
            <div style={styles.msgArea}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={m.role === "user" ? styles.msgUser : styles.msgAssistant}
                >
                  <div style={styles.msgBubble}>{m.content}</div>
                </div>
              ))}
              {loading && (
                <div style={styles.msgAssistant}>
                  <div style={styles.msgBubble}>Thinking...</div>
                </div>
              )}
              <div ref={msgEnd} />
            </div>
            <div style={styles.inputArea}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                style={styles.chatInput}
              />
              <button onClick={send} style={styles.sendBtn}>Send</button>
            </div>
          </>
        ) : (
          <div style={styles.noSession}>
            <p>Select or create a session to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  authWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#1a1a2e",
  },
  authBox: {
    background: "#16213e",
    padding: "40px",
    borderRadius: "12px",
    width: "360px",
    textAlign: "center",
    color: "#fff",
  },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: {
    flex: 1, padding: "8px", border: "none", background: "transparent",
    color: "#888", cursor: "pointer", borderRadius: "6px", fontSize: "14px",
  },
  tabActive: {
    flex: 1, padding: "8px", border: "none", background: "#0f3460",
    color: "#fff", cursor: "pointer", borderRadius: "6px", fontSize: "14px",
  },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    padding: "10px", borderRadius: "6px", border: "1px solid #333",
    background: "#0d1b2a", color: "#fff", fontSize: "14px",
  },
  button: {
    padding: "10px", borderRadius: "6px", border: "none",
    background: "#0f3460", color: "#fff", cursor: "pointer", fontSize: "14px",
  },
  error: { color: "#e94560", fontSize: "13px" },
  chatWrap: { display: "flex", height: "100vh", background: "#1a1a2e", color: "#fff" },
  sidebar: {
    width: "250px", background: "#16213e", display: "flex",
    flexDirection: "column", borderRight: "1px solid #333",
  },
  sidebarHeader: {
    padding: "16px", borderBottom: "1px solid #333",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: "13px",
  },
  logoutBtn: {
    background: "#e94560", border: "none", color: "#fff",
    padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px",
  },
  newSessionBtn: {
    margin: "12px", padding: "10px", background: "#0f3460",
    border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer",
  },
  sessionList: { flex: 1, overflow: "auto" },
  sessionItem: {
    padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #0d1b2a",
    fontSize: "13px",
  },
  sessionActive: {
    padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #0d1b2a",
    background: "#0f3460", fontSize: "13px",
  },
  chatArea: { flex: 1, display: "flex", flexDirection: "column" },
  noSession: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    color: "#888",
  },
  msgArea: { flex: 1, overflow: "auto", padding: "20px" },
  msgUser: {
    display: "flex", justifyContent: "flex-end", marginBottom: "12px",
  },
  msgAssistant: {
    display: "flex", justifyContent: "flex-start", marginBottom: "12px",
  },
  msgBubble: {
    maxWidth: "70%", padding: "10px 14px", borderRadius: "12px",
    background: "#0f3460", fontSize: "14px", lineHeight: "1.4",
  },
  inputArea: {
    display: "flex", padding: "16px", borderTop: "1px solid #333",
  },
  chatInput: {
    flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid #333",
    background: "#0d1b2a", color: "#fff", fontSize: "14px",
  },
  sendBtn: {
    marginLeft: "12px", padding: "12px 20px", borderRadius: "6px",
    border: "none", background: "#0f3460", color: "#fff", cursor: "pointer",
  },
};