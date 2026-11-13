"use client";
/* eslint-disable @next/next/no-img-element -- previews are auth-gated streams, not optimisable static assets */

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  ArchiveRestore, Check, ChevronRight, Download, Eye, Folder, FolderInput, FolderPlus, Home, MoreHorizontal,
  Pencil, Share2, Star, Trash2, Upload, Users, X,
} from "lucide-react";
import { canPreview, formatBytes, kindOf, timeAgo } from "./format";
import { FileGlyph } from "./glyph";
import type { FileItem, FolderItem, ViewId } from "./types";

export type FileActions = {
  open: (file: FileItem) => void;
  download: (file: FileItem) => void;
  star: (file: FileItem) => void;
  rename: (file: FileItem) => void;
  move: (files: FileItem[]) => void;
  share: (file: FileItem) => void;
  trash: (files: FileItem[]) => void;
  restore: (files: FileItem[]) => void;
  destroy: (files: FileItem[]) => void;
  moveIds: (ids: string[], folder: string | null) => void;
};

const DRAG_TYPE = "application/x-megham-files";

export function Menu({ items, label }: { items: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean; hidden?: boolean }[]; label: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setPos(null); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", close, true); };
  }, [pos]);
  const visible = items.filter((i) => !i.hidden);
  return (
    <div ref={ref} className="menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const up = r.bottom + visible.length * 40 + 16 > window.innerHeight;
        setPos(pos ? null : { x: Math.min(r.right, window.innerWidth - 12), y: up ? r.top : r.bottom, up });
      }}><MoreHorizontal size={18} /></button>
      {pos && (
        <div className="menu" role="menu" style={{ left: pos.x, top: pos.y, transform: `translate(-100%, ${pos.up ? "-100%" : "4px"})` }}>
          {visible.map((item) => (
            <button key={item.label} role="menuitem" className={item.danger ? "danger" : ""} onClick={() => { setPos(null); item.onClick(); }}>{item.icon}{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function rowMenu(file: FileItem, a: FileActions, trashed: boolean) {
  if (trashed) {
    return [
      { label: "Restore", icon: <ArchiveRestore size={16} />, onClick: () => a.restore([file]) },
      { label: "Delete forever", icon: <Trash2 size={16} />, onClick: () => a.destroy([file]), danger: true },
    ];
  }
  return [
    { label: "Preview", icon: <Eye size={16} />, onClick: () => a.open(file), hidden: !canPreview(file.name) },
    { label: "Download", icon: <Download size={16} />, onClick: () => a.download(file) },
    { label: "Share", icon: <Share2 size={16} />, onClick: () => a.share(file), hidden: !file.mine },
    { label: file.starred ? "Remove star" : "Add star", icon: <Star size={16} />, onClick: () => a.star(file), hidden: !file.mine },
    { label: "Rename", icon: <Pencil size={16} />, onClick: () => a.rename(file), hidden: !file.mine },
    { label: "Move to…", icon: <FolderInput size={16} />, onClick: () => a.move([file]), hidden: !file.mine },
    { label: "Move to trash", icon: <Trash2 size={16} />, onClick: () => a.trash([file]), danger: true, hidden: !file.mine },
  ];
}

function dragStart(e: DragEvent, file: FileItem, selected: Set<string>) {
  const ids = selected.has(file.id) ? [...selected] : [file.id];
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids));
  e.dataTransfer.effectAllowed = "move";
}

function dropProps(onDropIds: (ids: string[]) => void) {
  return {
    onDragOver: (e: DragEvent<HTMLElement>) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.currentTarget.classList.add("drop-over"); } },
    onDragLeave: (e: DragEvent<HTMLElement>) => e.currentTarget.classList.remove("drop-over"),
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.currentTarget.classList.remove("drop-over");
      const raw = e.dataTransfer.getData(DRAG_TYPE);
      if (!raw) return;
      e.preventDefault(); e.stopPropagation();
      try { onDropIds(JSON.parse(raw)); } catch { /* ignore malformed drag data */ }
    },
  };
}

export function Breadcrumbs({ path, onOpen, onDropIds }: { path: FolderItem[]; onOpen: (id: string | null) => void; onDropIds: (ids: string[], folder: string | null) => void }) {
  return (
    <nav className="crumbs" aria-label="Folder path">
      <button {...dropProps((ids) => onDropIds(ids, null))} onClick={() => onOpen(null)} className={path.length === 0 ? "current" : ""}><Home size={15} />My files</button>
      {path.map((f, i) => (
        <span key={f.id}><ChevronRight size={14} />
          <button {...dropProps((ids) => onDropIds(ids, f.id))} className={i === path.length - 1 ? "current" : ""} onClick={() => onOpen(f.id)}>{f.name}</button></span>
      ))}
    </nav>
  );
}

export function FolderTiles({ folders, onOpen, onRename, onDelete, onDropIds }: {
  folders: FolderItem[]; onOpen: (id: string) => void; onRename: (f: FolderItem) => void; onDelete: (f: FolderItem) => void;
  onDropIds: (ids: string[], folder: string | null) => void;
}) {
  if (!folders.length) return null;
  return (
    <div className="folder-row">
      {folders.map((f, i) => (
        <div key={f.id} style={{ "--i": i } as React.CSSProperties} className="folder-tile" tabIndex={0} {...dropProps((ids) => onDropIds(ids, f.id))}
          onClick={() => onOpen(f.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(f.id)}>
          <Folder size={20} /><span>{f.name}</span>
          <Menu label={`Folder actions for ${f.name}`} items={[
            { label: "Rename", icon: <Pencil size={16} />, onClick: () => onRename(f) },
            { label: "Delete folder", icon: <Trash2 size={16} />, onClick: () => onDelete(f), danger: true },
          ]} />
        </div>
      ))}
    </div>
  );
}

export function FileList({ files, view, selected, setSelected, actions, grid }: {
  files: FileItem[]; view: ViewId; selected: Set<string>; setSelected: (s: Set<string>) => void; actions: FileActions; grid: boolean;
}) {
  const trashed = view === "trash";
  const toggle = (id: string) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next); };
  const open = (f: FileItem) => (trashed ? undefined : canPreview(f.name) ? actions.open(f) : actions.download(f));
  const allSelected = files.length > 0 && files.every((f) => selected.has(f.id));

  if (grid) {
    return (
      <div className="grid-files">
        {files.map((f, i) => (
          <article key={f.id} style={{ "--i": Math.min(i, 14) } as React.CSSProperties} className={`card-file ${selected.has(f.id) ? "selected" : ""}`} draggable={f.mine && !trashed} onDragStart={(e) => dragStart(e, f, selected)} onClick={() => open(f)}>
            <button className="check" aria-label={`Select ${f.name}`} aria-pressed={selected.has(f.id)} onClick={(e) => { e.stopPropagation(); toggle(f.id); }}>{selected.has(f.id) && <Check size={14} />}</button>
            <div className="thumb">
              {kindOf(f.name) === "image" && f.resourceType === "image" && !trashed
                ? <img src={`/api/files/${f.id}/download?thumb=1`} alt="" loading="lazy" />
                : <FileGlyph name={f.name} size={30} box />}
              {f.starred && <Star className="starmark" size={16} fill="currentColor" />}
            </div>
            <div className="card-meta">
              <div><strong title={f.name}>{f.name}</strong><small>{formatBytes(f.bytes)} · {timeAgo(trashed && f.deletedAt ? f.deletedAt : f.createdAt)}</small></div>
              <Menu label={`Actions for ${f.name}`} items={rowMenu(f, actions, trashed)} />
            </div>
            {(f.shared || !f.mine) && <span className="chip"><Users size={12} />{f.mine ? "Shared" : "Shared with you"}</span>}
          </article>
        ))}
      </div>
    );
  }
  return (
    <div className="ftable" role="table">
      <div className="thead" role="row">
        <button className="check" aria-label="Select all" aria-pressed={allSelected} onClick={() => setSelected(allSelected ? new Set() : new Set(files.map((f) => f.id)))}>{allSelected && <Check size={14} />}</button>
        <span>Name</span><span className="hide-sm">{trashed ? "Deleted" : "Added"}</span><span className="hide-sm right">Size</span><span />
      </div>
      {files.map((f, i) => (
        <div key={f.id} role="row" style={{ "--i": Math.min(i, 14) } as React.CSSProperties} className={`trow ${selected.has(f.id) ? "selected" : ""}`} draggable={f.mine && !trashed} onDragStart={(e) => dragStart(e, f, selected)} onDoubleClick={() => open(f)}>
          <button className="check" aria-label={`Select ${f.name}`} aria-pressed={selected.has(f.id)} onClick={() => toggle(f.id)}>{selected.has(f.id) && <Check size={14} />}</button>
          <button className="name-cell" onClick={() => open(f)} disabled={trashed}>
            <FileGlyph name={f.name} size={18} box />
            <span className="name-text"><strong title={f.name}>{f.name}</strong>
              <small>{!f.mine ? "Shared with you" : f.shared ? "Shared" : "Only you"}</small></span>
            {f.starred && <Star size={14} fill="currentColor" className="starmark" />}
          </button>
          <span className="hide-sm muted">{timeAgo(trashed && f.deletedAt ? f.deletedAt : f.createdAt)}</span>
          <span className="hide-sm right muted">{formatBytes(f.bytes)}</span>
          <Menu label={`Actions for ${f.name}`} items={rowMenu(f, actions, trashed)} />
        </div>
      ))}
    </div>
  );
}

export function BulkBar({ files, view, actions, clear }: { files: FileItem[]; view: ViewId; actions: FileActions; clear: () => void }) {
  if (!files.length) return null;
  const mine = files.filter((f) => f.mine);
  return (
    <div className="bulkbar" role="toolbar" aria-label="Bulk actions">
      <button className="icon-btn light" onClick={clear} aria-label="Clear selection"><X size={18} /></button>
      <strong>{files.length} selected</strong>
      <span className="grow" />
      {view === "trash" ? (
        <>
          <button className="btn ghost-light sm" onClick={() => actions.restore(files)}><ArchiveRestore size={15} />Restore</button>
          <button className="btn danger sm" onClick={() => actions.destroy(files)}><Trash2 size={15} />Delete forever</button>
        </>
      ) : mine.length > 0 && (
        <>
          <button className="btn ghost-light sm" onClick={() => actions.move(mine)}><FolderInput size={15} />Move</button>
          <button className="btn danger sm" onClick={() => actions.trash(mine)}><Trash2 size={15} />Trash</button>
        </>
      )}
    </div>
  );
}

export function EmptyState({ view, query, onUpload, onNewFolder }: { view: ViewId; query: string; onUpload: () => void; onNewFolder?: () => void }) {
  const copy: Record<string, [string, string]> = {
    files: ["This folder is empty", "Drop files anywhere on this page, or choose them from your device."],
    recent: ["Nothing uploaded yet", "Your newest files will show up here."],
    starred: ["No starred files", "Star the files you reach for most and they’ll live here."],
    shared: ["You haven’t shared anything", "Share a file with a link or a teammate from its ⋯ menu."],
    "shared-with-me": ["Nothing shared with you", "Files other people share with your account appear here."],
    trash: ["Trash is empty", "Files you delete stay here for 30 days before they’re removed for good."],
  };
  const [title, text] = query ? [`No results for “${query}”`, "Try a different name."] : (copy[view] ?? copy.files);
  return (
    <div className="empty">
      <h2>{title}</h2><p>{text}</p>
      {!query && (view === "files" || view === "recent") && (
        <div className="row-btns"><button className="btn primary" onClick={onUpload}><Upload size={16} />Upload files</button>
          {onNewFolder && <button className="btn soft" onClick={onNewFolder}><FolderPlus size={16} />New folder</button>}</div>
      )}
    </div>
  );
}
