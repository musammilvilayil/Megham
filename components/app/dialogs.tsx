"use client";
/* eslint-disable @next/next/no-img-element -- previews are auth-gated streams, not optimisable static assets */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, Folder, FolderOpen, Link2, Trash2, UserPlus, X } from "lucide-react";
import { api, errorMessage } from "./api";
import { formatBytes, previewKind, timeAgo } from "./format";
import { FileGlyph } from "./glyph";
import type { FileItem, FolderItem, ShareState } from "./types";

export function Modal({ title, onClose, children, wide, labelledBy }: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean; labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, select, button.primary, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, a[href]")];
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? "modal-title"} ref={ref}>
        <header><h2 id={labelledBy ?? "modal-title"}>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        {children}
      </div>
    </div>
  );
}

export function PromptDialog({ title, label, initial = "", confirmLabel, onSubmit, onClose }: {
  title: string; label: string; initial?: string; confirmLabel: string;
  onSubmit: (value: string) => Promise<void>; onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form className="modal-body" onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        setBusy(true); setError("");
        try { await onSubmit(value.trim()); onClose(); } catch (err) { setError(errorMessage(err)); setBusy(false); }
      }}>
        <label className="field"><span>{label}</span><input value={value} onChange={(e) => setValue(e.target.value)} maxLength={255} autoFocus onFocus={(e) => e.target.select()} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || !value.trim()}>{confirmLabel}</button></footer>
      </form>
    </Modal>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose }: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-body">
        <p className="modal-text">{message}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? "danger" : "primary"}`} disabled={busy} onClick={async () => {
            setBusy(true);
            try { await onConfirm(); onClose(); } catch (err) { setError(errorMessage(err)); setBusy(false); }
          }}>{confirmLabel}</button>
        </footer>
      </div>
    </Modal>
  );
}

export function MoveDialog({ folders, count, onMove, onClose }: {
  folders: FolderItem[]; count: number; onMove: (folder: string | null) => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const children = (parent: string | null) => folders.filter((f) => f.parent === parent);
  const go = async (folder: string | null) => {
    setBusy(true);
    try { await onMove(folder); onClose(); } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };
  const branch = (parent: string | null, depth: number): ReactNode =>
    children(parent).map((f) => (
      <div key={f.id}>
        <button className="tree-row" style={{ paddingLeft: 14 + depth * 18 }} disabled={busy} onClick={() => go(f.id)}><Folder size={16} />{f.name}</button>
        {branch(f.id, depth + 1)}
      </div>
    ));
  return (
    <Modal title={`Move ${count} item${count > 1 ? "s" : ""} to…`} onClose={onClose}>
      <div className="modal-body">
        <div className="tree">
          <button className="tree-row" disabled={busy} onClick={() => go(null)}><FolderOpen size={16} />My files (top level)</button>
          {branch(null, 1)}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function ShareDialog({ file, onClose, onChanged }: { file: FileItem; onClose: () => void; onChanged: () => void }) {
  const [state, setState] = useState<ShareState | null>(null);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const base = `/api/files/${file.id}/share`;

  useEffect(() => { api<ShareState>(base).then(setState).catch((e) => setError(errorMessage(e))); }, [base]);

  const run = async (request: () => Promise<ShareState>) => {
    setBusy(true); setError("");
    try { setState(await request()); onChanged(); } catch (err) { setError(errorMessage(err)); }
    setBusy(false);
  };
  const linkUrl = (token: string) => `${window.location.origin}/s/${token}`;
  const copy = async (token: string) => {
    await navigator.clipboard?.writeText(linkUrl(token));
    setCopied(token); window.setTimeout(() => setCopied(""), 1800);
  };

  return (
    <Modal title={`Share “${file.name}”`} onClose={onClose} wide>
      <div className="modal-body share">
        {error && <p className="form-error" role="alert">{error}</p>}
        <section>
          <h3><UserPlus size={16} /> People</h3>
          <p className="muted">They need a MEGHAM account. Recipients can view and download, not edit.</p>
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (email) run(async () => { const r = await api<ShareState>(base, { body: { type: "user", email } }); setEmail(""); return r; }); }}>
            <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Recipient email" />
            <button className="btn primary" disabled={busy || !email}>Invite</button>
          </form>
          <ul className="rows">
            {state?.people.map((p) => (
              <li key={p.id}><div><strong>{p.name}</strong><small>{p.email}</small></div>
                <button className="btn ghost sm" disabled={busy} onClick={() => run(() => api<ShareState>(`${base}?user=${p.id}`, { method: "DELETE" }))}>Remove</button></li>
            ))}
            {state && state.people.length === 0 && <li className="empty-row">Not shared with anyone yet.</li>}
          </ul>
        </section>
        <section>
          <h3><Link2 size={16} /> Public links</h3>
          <p className="muted">Anyone with a link can download this file until it expires or you revoke it.</p>
          <div className="inline-form">
            <select value={days} onChange={(e) => setDays(e.target.value)} aria-label="Link expiry">
              <option value="1">Expires in 1 day</option><option value="7">Expires in 7 days</option>
              <option value="30">Expires in 30 days</option><option value="">Never expires</option>
            </select>
            <button className="btn primary" disabled={busy} onClick={() => run(() => api<ShareState>(base, { body: { type: "link", expiresInDays: days ? Number(days) : null } }))}>Create link</button>
          </div>
          <ul className="rows">
            {state?.links.map((l) => (
              <li key={l.id}>
                <div><strong>{l.expiresAt ? `Expires ${new Date(l.expiresAt).toLocaleDateString()}` : "No expiry"}</strong><small>{l.downloads} download{l.downloads === 1 ? "" : "s"} · created {timeAgo(l.createdAt)}</small></div>
                <div className="row-btns">
                  <button className="btn soft sm" onClick={() => copy(l.token)}><Copy size={14} />{copied === l.token ? "Copied" : "Copy link"}</button>
                  <button className="btn ghost sm" disabled={busy} onClick={() => run(() => api<ShareState>(`${base}?link=${l.id}`, { method: "DELETE" }))}>Revoke</button>
                </div>
              </li>
            ))}
            {state && state.links.length === 0 && <li className="empty-row">No active links.</li>}
          </ul>
        </section>
      </div>
    </Modal>
  );
}

export function PreviewDialog({ files, index, onIndex, onClose, onDownload }: {
  files: FileItem[]; index: number; onIndex: (i: number) => void; onClose: () => void; onDownload: (f: FileItem) => void;
}) {
  const file = files[index];
  const src = `/api/files/${file.id}/download?inline=1`;
  const kind = previewKind(file.name);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < files.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, files.length, onClose, onIndex]);
  return (
    <div className="preview" role="dialog" aria-modal="true" aria-label={`Preview of ${file.name}`}>
      <header>
        <div><strong>{file.name}</strong><small>{formatBytes(file.bytes)} · {timeAgo(file.createdAt)}</small></div>
        <div className="row-btns">
          <button className="btn soft sm" onClick={() => onDownload(file)}><Download size={15} />Download</button>
          <button className="icon-btn light" onClick={onClose} aria-label="Close preview"><X size={20} /></button>
        </div>
      </header>
      <div className="preview-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {index > 0 && <button className="nav-arrow left" onClick={() => onIndex(index - 1)} aria-label="Previous file"><ChevronLeft size={26} /></button>}
        {kind === "image" && <img key={file.id} src={src} alt={file.name} />}
        {kind === "pdf" && <iframe key={file.id} src={src} title={file.name} sandbox="allow-same-origin" />}
        {kind === "video" && <video key={file.id} src={src} controls autoPlay />}
        {kind === "audio" && <div className="audio-card"><FileGlyph name={file.name} size={44} /><audio key={file.id} src={src} controls autoPlay /></div>}
        {!kind && (
          <div className="no-preview"><FileGlyph name={file.name} size={44} /><h3>No preview available</h3><p>This file type can’t be previewed in the browser.</p>
            <button className="btn primary" onClick={() => onDownload(file)}><Download size={16} />Download</button></div>
        )}
        {index < files.length - 1 && <button className="nav-arrow right" onClick={() => onIndex(index + 1)} aria-label="Next file"><ChevronRight size={26} /></button>}
      </div>
    </div>
  );
}

export { Trash2 };
