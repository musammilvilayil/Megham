"use client";

import { useState } from "react";
import { LogOut, Moon, ShieldAlert, Sun } from "lucide-react";
import { api, errorMessage } from "./api";
import { formatBytes, initials } from "./format";
import { ConfirmDialog } from "./dialogs";
import type { SessionUser, Stats } from "./types";

export function SettingsView({ user, dark, setDark, stats, notify, onSignedOut }: {
  user: SessionUser; dark: boolean; setDark: (v: boolean) => void; stats: Stats | null;
  notify: (message: string) => void; onSignedOut: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"everywhere" | "delete" | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const percent = stats ? Math.min(100, (stats.usage.bytes / stats.usage.quota) * 100) : 0;

  return (
    <div className="settings">
      <header className="page-head"><div><p className="eyebrow">Account</p><h1>Settings</h1></div></header>

      <section className="panel">
        <h2>Profile</h2>
        <div className="profile-row"><span className="avatar lg">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
      </section>

      <section className="panel">
        <h2>Appearance</h2>
        <div className="segmented" role="group" aria-label="Theme">
          <button className={!dark ? "on" : ""} onClick={() => setDark(false)}><Sun size={16} />Light</button>
          <button className={dark ? "on" : ""} onClick={() => setDark(true)}><Moon size={16} />Dark</button>
        </div>
      </section>

      <section className="panel">
        <h2>Storage</h2>
        <div className="meter big" style={{ marginBottom: 12 }}><i style={{ width: `${Math.max(percent, stats?.usage.bytes ? 1.5 : 0)}%` }} /></div>
        <p className="muted">{stats ? `${formatBytes(stats.usage.bytes)} of ${formatBytes(stats.usage.quota)} used across ${stats.usage.count} file${stats.usage.count === 1 ? "" : "s"} (trash included).` : "Loading…"}</p>
      </section>

      <section className="panel">
        <h2>Password</h2>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setError("");
          try {
            await api("/api/auth/password", { body: { currentPassword: current, newPassword: next } });
            setCurrent(""); setNext(""); notify("Password updated. Other devices were signed out.");
          } catch (err) { setError(errorMessage(err)); }
          setBusy(false);
        }}>
          <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>
          <label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required /><small className="hint">At least 8 characters. Changing it signs out your other devices.</small></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div><button className="btn primary" disabled={busy || !current || next.length < 8}>Update password</button></div>
        </form>
        <hr />
        <div className="line-item"><div><strong>Sign out everywhere</strong><small>Ends every session on every device, including this one.</small></div>
          <button className="btn soft" onClick={() => setConfirm("everywhere")}><LogOut size={16} />Sign out all</button></div>
      </section>

      <section className="panel danger-zone">
        <h2><ShieldAlert size={18} />Delete account</h2>
        <p className="muted">Permanently removes your account, every file, folder and share link. This can’t be undone.</p>
        <label className="field"><span>Confirm with your password</span><input type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} /></label>
        <div><button className="btn danger" disabled={!deletePassword} onClick={() => setConfirm("delete")}>Delete my account</button></div>
      </section>

      {confirm === "everywhere" && (
        <ConfirmDialog title="Sign out everywhere?" message="You’ll be signed out on all devices and will need to sign in again." confirmLabel="Sign out all"
          onClose={() => setConfirm(null)} onConfirm={async () => { await api("/api/auth/sessions", { method: "DELETE" }); onSignedOut(); }} />
      )}
      {confirm === "delete" && (
        <ConfirmDialog danger title="Delete your account?" message="All of your files will be permanently erased from storage. This cannot be reversed." confirmLabel="Delete everything"
          onClose={() => setConfirm(null)} onConfirm={async () => { await api("/api/auth/account", { method: "DELETE", body: { password: deletePassword } }); onSignedOut(); }} />
      )}
    </div>
  );
}
