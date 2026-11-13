"use client";

import { ArrowUpRight, CloudUpload, FolderPlus, HardDrive, Share2, Star, Trash2 } from "lucide-react";
import { formatBytes, kindOf, timeAgo } from "./format";
import { FileGlyph } from "./glyph";
import type { FileItem, SessionUser, Stats, ViewId } from "./types";

const KIND_LABEL: Record<string, string> = { image: "Images", video: "Video", raw: "Documents & other" };

export function Overview({ user, stats, recent, onUpload, onNewFolder, onNavigate, onOpen }: {
  user: SessionUser; stats: Stats | null; recent: FileItem[];
  onUpload: () => void; onNewFolder: () => void; onNavigate: (v: ViewId) => void; onOpen: (f: FileItem) => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const percent = stats ? Math.min(100, (stats.usage.bytes / stats.usage.quota) * 100) : 0;
  const total = stats?.kinds.reduce((s, k) => s + k.bytes, 0) || 1;

  return (
    <div className="overview">
      <header className="hero-head">
        <div><p className="eyebrow">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
          <h1>{greeting}, {user.name.split(" ")[0]}</h1></div>
        <div className="row-btns">
          <button className="btn soft" onClick={onNewFolder}><FolderPlus size={16} />New folder</button>
          <button className="btn primary" onClick={onUpload}><CloudUpload size={16} />Upload</button>
        </div>
      </header>

      <div className="stat-grid">
        <section className="panel storage-panel">
          <div className="panel-head"><span><HardDrive size={16} />Storage</span><button className="link-btn" onClick={() => onNavigate("settings")}>Manage <ArrowUpRight size={13} /></button></div>
          <div className="storage-figure"><strong>{stats ? formatBytes(stats.usage.bytes) : "—"}</strong><span>of {stats ? formatBytes(stats.usage.quota) : "—"}</span></div>
          <div className="meter big" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used"><i style={{ width: `${Math.max(percent, stats?.usage.bytes ? 1.5 : 0)}%` }} /></div>
          <div className="kind-bar">{stats?.kinds.map((k) => <i key={k.type} className={`k-${k.type}`} style={{ width: `${(k.bytes / total) * 100}%` }} title={`${KIND_LABEL[k.type] ?? k.type}: ${formatBytes(k.bytes)}`} />)}</div>
          <ul className="legend">{stats?.kinds.map((k) => <li key={k.type}><i className={`k-${k.type}`} />{KIND_LABEL[k.type] ?? k.type}<b>{formatBytes(k.bytes)}</b></li>)}</ul>
        </section>

        <button className="tile" onClick={() => onNavigate("starred")}><Star size={20} /><strong>{stats?.counts.starred ?? 0}</strong><span>Starred</span></button>
        <button className="tile" onClick={() => onNavigate("shared")}><Share2 size={20} /><strong>{(stats?.counts.shared ?? 0)}</strong><span>Shared by you</span></button>
        <button className="tile" onClick={() => onNavigate("trash")}><Trash2 size={20} /><strong>{stats?.counts.trashed ?? 0}</strong><span>In trash</span></button>
      </div>

      <section className="panel">
        <div className="panel-head"><span>Recently added</span><button className="link-btn" onClick={() => onNavigate("recent")}>View all <ArrowUpRight size={13} /></button></div>
        {recent.length === 0 ? (
          <div className="empty compact"><h2>Your workspace is ready</h2><p>Upload your first file — drag it anywhere onto this page.</p><button className="btn primary" onClick={onUpload}><CloudUpload size={16} />Upload files</button></div>
        ) : (
          <ul className="recent-list">
            {recent.map((f) => (
              <li key={f.id}><button onClick={() => onOpen(f)}>
                <FileGlyph name={f.name} size={18} box /><span className="name-text"><strong>{f.name}</strong><small>{kindOf(f.name).toUpperCase()} · {formatBytes(f.bytes)}</small></span>
                <time>{timeAgo(f.createdAt)}</time></button></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
