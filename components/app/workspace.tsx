"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3, FolderOpen, FolderPlus, Grid2X2, LayoutDashboard, List, LogOut, Menu as MenuIcon, Moon, Plus, Search,
  Settings, Share2, Star, Sun, Trash2, UploadCloud, Users, X,
} from "lucide-react";
import { api, errorMessage } from "./api";
import { AuthScreen } from "./auth";
import { BulkBar, Breadcrumbs, EmptyState, FileList, FolderTiles, type FileActions } from "./browser";
import { ConfirmDialog, MoveDialog, PreviewDialog, PromptDialog, ShareDialog } from "./dialogs";
import { canPreview, initials } from "./format";
import { Logo } from "./logo";
import { Overview } from "./overview";
import { SettingsView } from "./settings";
import type { FileItem, FolderItem, SessionUser, Stats, ViewId } from "./types";
import { UploadTray, useUploads } from "./uploads";

type Dialog =
  | { type: "share"; file: FileItem }
  | { type: "rename"; file: FileItem }
  | { type: "move"; files: FileItem[] }
  | { type: "trash"; files: FileItem[] }
  | { type: "destroy"; files: FileItem[] }
  | { type: "newFolder" }
  | { type: "renameFolder"; folder: FolderItem }
  | { type: "deleteFolder"; folder: FolderItem }
  | { type: "preview"; index: number }
  | null;

const NAV: { id: ViewId; label: string; icon: typeof Clock3; count?: keyof Stats["counts"] }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "files", label: "My files", icon: FolderOpen },
  { id: "recent", label: "Recent", icon: Clock3 },
  { id: "starred", label: "Starred", icon: Star, count: "starred" },
  { id: "shared", label: "Shared by me", icon: Share2, count: "shared" },
  { id: "shared-with-me", label: "Shared with me", icon: Users, count: "sharedWithMe" },
  { id: "trash", label: "Trash", icon: Trash2, count: "trashed" },
];

const TITLES: Record<string, string> = {
  files: "My files", recent: "Recent", starred: "Starred", shared: "Shared by me", "shared-with-me": "Shared with me", trash: "Trash",
};
const API_VIEW: Record<string, string> = { files: "all" };
const PAGE = 40;

export default function Workspace() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<ViewId>("overview");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [recent, setRecent] = useState<FileItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [grid, setGrid] = useState(false);
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const notify = useCallback((message: string) => setToast(message), []);
  const fail = useCallback((error: unknown) => setToast(errorMessage(error)), []);

  const listView = view !== "overview" && view !== "settings";

  /* ---------- data loading ---------- */
  const loadPage = useCallback(async (reset: boolean, cursor?: string | null) => {
    if (!listView) return;
    const id = ++requestId.current;
    setLoading(true);
    const params = new URLSearchParams({ view: API_VIEW[view] ?? view, limit: String(PAGE) });
    if (view === "files") params.set("folder", folderId ?? "root");
    if (search) params.set("q", search);
    if (cursor) params.set("cursor", cursor);
    try {
      const data = await api<{ files: FileItem[]; nextCursor: string | null }>(`/api/files?${params}`);
      if (id !== requestId.current) return; // a newer request superseded this one
      setFiles((current) => (reset ? data.files : [...current, ...data.files]));
      setNextCursor(data.nextCursor);
    } catch (error) {
      if (id === requestId.current) fail(error);
    }
    if (id === requestId.current) setLoading(false);
  }, [view, folderId, search, listView, fail]);

  const loadMeta = useCallback(async () => {
    try {
      const [s, f, r] = await Promise.all([
        api<Stats>("/api/files/stats"),
        api<{ folders: FolderItem[] }>("/api/folders"),
        api<{ files: FileItem[] }>("/api/files?view=recent&limit=8"),
      ]);
      setStats(s); setFolders(f.folders); setRecent(r.files);
    } catch (error) { fail(error); }
  }, [fail]);

  const refresh = useCallback(async () => {
    await Promise.all([loadPage(true), loadMeta()]);
  }, [loadPage, loadMeta]);

  useEffect(() => {
    api<{ user: SessionUser }>("/api/auth/me").then((d) => setUser(d.user)).catch(() => undefined).finally(() => setBooting(false));
  }, []);

  // Fetching on mount / when filters change is the intended use of an effect here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { if (user) loadMeta(); }, [user, loadMeta]);
  useEffect(() => { if (user) { setSelected(new Set()); loadPage(true); } }, [user, loadPage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    // Read persisted preferences after hydration to avoid a server/client mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = localStorage.getItem("megham-theme");
    setDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    setGrid(localStorage.getItem("megham-grid") === "1");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("megham-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => { localStorage.setItem("megham-grid", grid ? "1" : "0"); }, [grid]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---------- uploads + drag and drop ---------- */
  const onUploaded = useCallback(() => { loadPage(true); loadMeta(); }, [loadPage, loadMeta]);
  const uploads = useUploads(onUploaded);
  const uploadTarget = view === "files" ? folderId : null;
  const startUpload = useCallback((list: File[]) => {
    if (list.length) uploads.add(list, uploadTarget);
  }, [uploads, uploadTarget]);

  useEffect(() => {
    if (!user) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth += 1; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; setDragging(false);
      startUpload([...(e.dataTransfer?.files ?? [])]);
    };
    window.addEventListener("dragenter", enter); window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over); window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter); window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over); window.removeEventListener("drop", drop);
    };
  }, [user, startUpload]);

  /* ---------- shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); document.querySelector<HTMLInputElement>("#global-search")?.focus(); }
      if (e.key === "Escape") { setMenuOpen(false); setSelected(new Set()); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- navigation ---------- */
  const go = useCallback((next: ViewId, folder: string | null = null) => {
    setView(next); setFolderId(folder); setMenuOpen(false); setSelected(new Set());
    if (next === "overview" || next === "settings") setQuery("");
  }, []);

  const path = useMemo(() => {
    const chain: FolderItem[] = [];
    let cursor = folderId;
    while (cursor && chain.length < 50) {
      const f = folders.find((x) => x.id === cursor);
      if (!f) break;
      chain.unshift(f); cursor = f.parent;
    }
    return chain;
  }, [folders, folderId]);

  const subfolders = useMemo(() => (view === "files" && !search ? folders.filter((f) => f.parent === folderId) : []), [view, search, folders, folderId]);

  /* ---------- file actions ---------- */
  const run = useCallback(async (job: () => Promise<unknown>, success?: string) => {
    try { await job(); if (success) notify(success); await refresh(); } catch (error) { fail(error); throw error; }
  }, [refresh, notify, fail]);

  const bulk = (ids: string[], action: string, extra: Record<string, unknown> = {}) =>
    api("/api/files/bulk", { body: { ids, action, ...extra } });

  const download = useCallback((file: FileItem) => {
    const a = document.createElement("a");
    a.href = `/api/files/${file.id}/download`; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
  }, []);

  const previewable = useMemo(() => files.filter((f) => canPreview(f.name) && !f.deletedAt), [files]);
  const actions: FileActions = {
    open: (file) => { const i = previewable.findIndex((f) => f.id === file.id); if (i >= 0) setDialog({ type: "preview", index: i }); else download(file); },
    download,
    star: (file) => run(() => api(`/api/files/${file.id}`, { method: "PATCH", body: { action: "star", value: !file.starred } })).catch(() => undefined),
    rename: (file) => setDialog({ type: "rename", file }),
    move: (list) => setDialog({ type: "move", files: list }),
    share: (file) => setDialog({ type: "share", file }),
    trash: (list) => setDialog({ type: "trash", files: list }),
    restore: (list) => run(() => bulk(list.map((f) => f.id), "restore"), list.length > 1 ? "Files restored" : "File restored").catch(() => undefined),
    destroy: (list) => setDialog({ type: "destroy", files: list }),
    moveIds: (ids, folder) => run(() => bulk(ids, "move", { folder }), "Moved").catch(() => undefined),
  };

  const selectedFiles = files.filter((f) => selected.has(f.id));
  const signOut = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => undefined); setUser(null); setFiles([]); setStats(null); setView("overview"); };

  /* ---------- render ---------- */
  if (booting) return <div className="boot"><Logo /><div className="boot-bar"><i /></div></div>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  const title = view === "files" ? (path.length ? path[path.length - 1].name : TITLES.files) : TITLES[view];
  const usedPercent = stats ? Math.min(100, (stats.usage.bytes / stats.usage.quota) * 100) : 0;

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="side-top"><Logo /><button className="icon-btn mobile-only" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <button className="new-btn" onClick={() => fileInput.current?.click()}><Plus size={18} />Upload</button>
        <nav aria-label="Primary">
          {NAV.map(({ id, label, icon: Icon, count }) => (
            <button key={id} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => go(id)}>
              <Icon size={18} /><span>{label}</span>{count && stats && stats.counts[count] > 0 && <b>{stats.counts[count]}</b>}
            </button>
          ))}
          <button className={view === "settings" ? "active" : ""} onClick={() => go("settings")}><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="side-storage">
          <div><span>Storage</span><b>{stats ? `${Math.round(usedPercent)}%` : ""}</b></div>
          <div className="meter"><i style={{ width: `${Math.max(usedPercent, stats?.usage.bytes ? 2 : 0)}%` }} /></div>
        </div>
        <div className="side-user">
          <span className="avatar">{initials(user.name)}</span>
          <div><strong>{user.name}</strong><small>{user.email}</small></div>
          <button className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
        </div>
      </aside>
      {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setMenuOpen(true)} aria-label="Open menu"><MenuIcon size={21} /></button>
          <label className="searchbox">
            <Search size={17} />
            <input id="global-search" type="search" placeholder="Search all your files" value={query}
              onChange={(e) => { setQuery(e.target.value); if (!listView) go("files"); }} aria-label="Search files" />
            <kbd>⌘K</kbd>
          </label>
          <button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
        </header>

        <main className="content" key={`${view}:${folderId ?? ""}`}>
          {view === "overview" && (
            <Overview user={user} stats={stats} recent={recent} onUpload={() => fileInput.current?.click()} onNewFolder={() => { go("files"); setDialog({ type: "newFolder" }); }}
              onNavigate={go} onOpen={(f) => (canPreview(f.name) ? setDialog({ type: "preview", index: -1 - recent.findIndex((r) => r.id === f.id) }) : download(f))} />
          )}
          {view === "settings" && <SettingsView user={user} dark={dark} setDark={setDark} stats={stats} notify={notify} onSignedOut={() => { setUser(null); setView("overview"); }} />}
          {listView && (
            <>
              <header className="page-head view-enter">
                <div>
                  <p className="eyebrow">{search ? "Search results" : "Workspace"}</p>
                  <h1>{search ? <>Results for “{search}”</> : title}</h1>
                </div>
                <div className="row-btns">
                  {view === "files" && !search && <button className="btn soft" onClick={() => setDialog({ type: "newFolder" })}><FolderPlus size={16} />New folder</button>}
                  {view === "trash" && files.length > 0 && <button className="btn soft" onClick={() => setDialog({ type: "destroy", files })}><Trash2 size={16} />Empty trash</button>}
                  <div className="segmented icon" role="group" aria-label="Layout">
                    <button className={!grid ? "on" : ""} onClick={() => setGrid(false)} aria-label="List layout"><List size={17} /></button>
                    <button className={grid ? "on" : ""} onClick={() => setGrid(true)} aria-label="Grid layout"><Grid2X2 size={17} /></button>
                  </div>
                </div>
              </header>
              {view === "files" && !search && <Breadcrumbs path={path} onOpen={(id) => go("files", id)} onDropIds={actions.moveIds} />}
              {view === "trash" && files.length > 0 && <p className="banner">Items in trash are deleted automatically after 30 days.</p>}
              <FolderTiles folders={subfolders} onOpen={(id) => go("files", id)} onDropIds={actions.moveIds}
                onRename={(folder) => setDialog({ type: "renameFolder", folder })} onDelete={(folder) => setDialog({ type: "deleteFolder", folder })} />
              {files.length === 0 && !loading ? (
                subfolders.length === 0 && <EmptyState view={view} query={search} onUpload={() => fileInput.current?.click()} onNewFolder={view === "files" ? () => setDialog({ type: "newFolder" }) : undefined} />
              ) : (
                <FileList files={files} view={view} selected={selected} setSelected={setSelected} actions={actions} grid={grid} />
              )}
              {loading && <div className="skeletons" aria-label="Loading files">{[0, 1, 2, 3].map((i) => <i key={i} />)}</div>}
              {nextCursor && !loading && <div className="load-more"><button className="btn soft" onClick={() => loadPage(false, nextCursor)}>Load more</button></div>}
            </>
          )}
        </main>
      </div>

      <BulkBar files={selectedFiles} view={view} actions={actions} clear={() => setSelected(new Set())} />
      <input ref={fileInput} type="file" multiple hidden onChange={(e) => { startUpload([...(e.target.files ?? [])]); e.target.value = ""; }} />
      <UploadTray jobs={uploads.jobs} dismiss={uploads.dismiss} />
      {dragging && <div className="drop-overlay"><div><UploadCloud size={46} /><h2>Drop to upload</h2><p>Files go to {uploadTarget ? `“${path[path.length - 1]?.name ?? "this folder"}”` : "My files"} · up to 25 MB each</p></div></div>}
      {toast && <div className="toast" role="status">{toast}</div>}

      {dialog?.type === "share" && <ShareDialog file={dialog.file} onClose={() => setDialog(null)} onChanged={() => { loadPage(true); loadMeta(); }} />}
      {dialog?.type === "rename" && <PromptDialog title="Rename file" label="Name" initial={dialog.file.name} confirmLabel="Save" onClose={() => setDialog(null)}
        onSubmit={(name) => run(() => api(`/api/files/${dialog.file.id}`, { method: "PATCH", body: { action: "rename", name } }), "Renamed")} />}
      {dialog?.type === "move" && <MoveDialog folders={folders} count={dialog.files.length} onClose={() => setDialog(null)}
        onMove={(folder) => run(() => bulk(dialog.files.map((f) => f.id), "move", { folder }), "Moved")} />}
      {dialog?.type === "trash" && <ConfirmDialog title={`Move ${dialog.files.length} item${dialog.files.length > 1 ? "s" : ""} to trash?`} message="You can restore them from Trash for 30 days." confirmLabel="Move to trash" onClose={() => setDialog(null)}
        onConfirm={() => run(() => bulk(dialog.files.map((f) => f.id), "trash"), "Moved to trash")} />}
      {dialog?.type === "destroy" && <ConfirmDialog danger title={`Permanently delete ${dialog.files.length} item${dialog.files.length > 1 ? "s" : ""}?`} message="This removes the files from storage and cannot be undone." confirmLabel="Delete forever" onClose={() => setDialog(null)}
        onConfirm={() => run(() => bulk(dialog.files.map((f) => f.id), "delete"), "Deleted permanently")} />}
      {dialog?.type === "newFolder" && <PromptDialog title="New folder" label="Folder name" confirmLabel="Create" onClose={() => setDialog(null)}
        onSubmit={(name) => run(() => api("/api/folders", { body: { name, parent: folderId ?? "root" } }), "Folder created")} />}
      {dialog?.type === "renameFolder" && <PromptDialog title="Rename folder" label="Folder name" initial={dialog.folder.name} confirmLabel="Save" onClose={() => setDialog(null)}
        onSubmit={(name) => run(() => api(`/api/folders/${dialog.folder.id}`, { method: "PATCH", body: { name } }), "Renamed")} />}
      {dialog?.type === "deleteFolder" && <ConfirmDialog title={`Delete “${dialog.folder.name}”?`} message="Files inside are kept and move up one level." confirmLabel="Delete folder" onClose={() => setDialog(null)}
        onConfirm={() => run(() => api(`/api/folders/${dialog.folder.id}`, { method: "DELETE" }), "Folder deleted")} />}
      {dialog?.type === "preview" && (() => {
        const list = dialog.index < 0 ? recent.filter((f) => canPreview(f.name)) : previewable;
        const idx = dialog.index < 0 ? Math.max(0, list.findIndex((f) => f.id === recent[-1 - dialog.index]?.id)) : dialog.index;
        return list[idx] ? <PreviewDialog files={list} index={idx} onIndex={(i) => setDialog({ type: "preview", index: dialog.index < 0 ? -1 - recent.findIndex((r) => r.id === list[i].id) : i })} onClose={() => setDialog(null)} onDownload={download} /> : null;
      })()}
    </div>
  );
}
