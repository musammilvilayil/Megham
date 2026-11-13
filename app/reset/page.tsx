"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, errorMessage } from "@/components/app/api";
import { Logo } from "@/components/app/logo";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <div className="center-card">
        <h1>Password updated</h1>
        <p className="muted">You’ve been signed out everywhere. Sign in with your new password.</p>
        <Link className="btn primary lg" href="/dashboard">Go to sign in</Link>
      </div>
    );
  }
  return (
    <form className="center-card stack" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError("");
      try { await api("/api/auth/reset", { body: { token, password } }); setDone(true); } catch (err) { setError(errorMessage(err)); }
      setBusy(false);
    }}>
      <h1>Choose a new password</h1>
      {!token && <p className="form-error">This link is missing its token. Request a new reset email.</p>}
      <label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /><small className="hint">At least 8 characters.</small></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn primary lg" disabled={busy || !token || password.length < 8}>{busy ? "Saving…" : "Update password"}</button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="center-page"><Logo /><Suspense><ResetForm /></Suspense></div>
  );
}
