"use client";

import { useState } from "react";
import { ArrowRight, CloudUpload, Link2, Lock } from "lucide-react";
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

  const heading = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your workspace" : "Reset your password";
  const switchTo = (next: Mode) => { setMode(next); setError(""); setNotice(""); };

  return (
    <div className="auth">
      <aside className="auth-art">
        <Logo light />
        <div className="auth-pitch">
          <h2>Everything you keep, <em>within reach.</em></h2>
          <ul>
            <li><CloudUpload size={18} /><span><b>Direct uploads</b> straight to the cloud, with live progress.</span></li>
            <li><Lock size={18} /><span><b>Private by default.</b> Files are served only to you and the people you choose.</span></li>
            <li><Link2 size={18} /><span><b>Share with expiry.</b> Links you can revoke any time.</span></li>
          </ul>
        </div>
        <small>© {new Date().getFullYear()} MEGHAM</small>
        <i className="blob b1" /><i className="blob b2" />
      </aside>
      <main className="auth-form">
        <form onSubmit={submit} noValidate>
          <div className="auth-logo-mobile"><Logo /></div>
          <h1>{heading}</h1>
          <p className="muted">{mode === "forgot" ? "Enter your email and we’ll send you a reset link." : mode === "signin" ? "Sign in to pick up where you left off." : "Free to start. Upload your first file in under a minute."}</p>
          {mode === "signup" && <label className="field"><span>Full name</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></label>}
          <label className="field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {mode !== "forgot" && (
            <label className="field"><span>Password{mode === "signin" && <button type="button" className="link-btn" onClick={() => switchTo("forgot")}>Forgot?</button>}</span>
              <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              {mode === "signup" && <small className="hint">At least 8 characters.</small>}</label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-ok" role="status">{notice}</p>}
          <button className="btn primary lg" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}<ArrowRight size={17} /></button>
          <p className="switch">
            {mode === "signin" ? <>New to MEGHAM? <button type="button" className="link-btn" onClick={() => switchTo("signup")}>Create an account</button></>
              : <>Back to <button type="button" className="link-btn" onClick={() => switchTo("signin")}>sign in</button></>}
          </p>
        </form>
      </main>
    </div>
  );
}
