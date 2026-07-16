import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
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

export function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setConfirmPassword("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(await getError(response));
        return;
      }

      const data = await response.json();
      if (data.token) {
        onLogin(data.email || email, data.token);
      } else {
        setError("The server did not return a login token.");
      }
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordType = showPassword ? "text" : "password";

  return (
    <div className="auth-page">
      <ThemeToggle className="auth-theme-toggle" />
      <section className="auth-showcase" aria-label="Honcho Memory Chat overview">
        <div className="showcase-brand">
          <span className="brand-mark"><Bot /></span>
          <span>Honcho</span>
        </div>
        <div className="showcase-copy">
          <span className="eyebrow"><Sparkles /> Memory-first conversations</span>
          <h1>A conversation that remembers what matters.</h1>
          <p>
            Give every chat durable context, while keeping the experience focused,
            private, and effortless.
          </p>
        </div>
        <div className="showcase-note">
          <ShieldCheck />
          <span>Your conversations stay in your own memory workspace.</span>
        </div>
      </section>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <span className="mobile-brand-mark"><Bot /></span>
            <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create your workspace"}</p>
            <h2>{mode === "login" ? "Continue your conversations" : "Start remembering more"}</h2>
            <p>
              {mode === "login"
                ? "Sign in to pick up exactly where you left off."
                : "Create an account to give your assistant persistent memory."}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => changeMode("login")}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => changeMode("register")}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="auth-form">
            <label className="field-label" htmlFor="email">Email address</label>
            <div className="auth-field">
              <Mail className="auth-field-icon" aria-hidden="true" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="auth-input"
                required
              />
            </div>

            <label className="field-label" htmlFor="password">Password</label>
            <div className="auth-field">
              <LockKeyhole className="auth-field-icon" aria-hidden="true" />
              <input
                id="password"
                type={passwordType}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="auth-input auth-input-password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {mode === "register" && (
              <>
                <label className="field-label" htmlFor="confirm-password">Confirm password</label>
                <div className="auth-field">
                  <LockKeyhole className="auth-field-icon" aria-hidden="true" />
                  <input
                    id="confirm-password"
                    type={passwordType}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
              </>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" className="auth-button" disabled={loading}>
              <span>{loading ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}</span>
              {loading ? <span className="button-spinner" /> : <ArrowRight />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
