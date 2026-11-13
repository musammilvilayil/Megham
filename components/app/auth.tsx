"use client";

import { useState } from "react";
import { api, errorMessage } from "./api";
import type { SessionUser } from "./types";
import { Logo } from "./logo";

type Mode = "signin" | "signup" | "forgot";

export function AuthScreen({ onAuthenticated, initialMode = "signin" }: { onAuthenticated: (user: SessionUser) => void; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "forgot") {
        await api("/api/auth/forgot", { body: { email } });
        setNotice("If an account exists for that address, a reset link is on its way. It stays valid for one hour.");
      } else {
        const data = await api<{ user: SessionUser }>(mode === "signin" ? "/api/auth/login" : "/api/auth/register", {
          body: mode === "signin" ? { email, password } : { name, email, password },
        });
        onAuthenticated(data.user);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  };

  const heading = mode === "signin" ? "Sign in" : mode === "signup" ? "Create an account" : "Reset password";
  const switchTo = (next: Mode) => { setMode(next); setError(""); setNotice(""); };

  return (
    <div className="auth">
      <div className="auth-wrap">
        <Logo />
        <form onSubmit={submit} noValidate>
          <h1>{heading}</h1>
          {mode === "forgot" && <p className="muted">Enter your email and we’ll send you a link to choose a new password.</p>}
          {mode === "signup" && <label className="field"><span>Name</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></label>}
          <label className="field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {mode !== "forgot" && (
            <label className="field"><span>Password{mode === "signin" && <button type="button" className="link-btn" onClick={() => switchTo("forgot")}>Forgot password?</button>}</span>
              <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              {mode === "signup" && <small className="hint">At least 8 characters.</small>}</label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-ok" role="status">{notice}</p>}
          <button className="btn primary lg" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
          <p className="switch">
            {mode === "signin" ? <>No account? <button type="button" className="link-btn" onClick={() => switchTo("signup")}>Create one</button></>
              : <>Have an account? <button type="button" className="link-btn" onClick={() => switchTo("signin")}>Sign in</button></>}
          </p>
        </form>
      </div>
    </div>
  );
}
