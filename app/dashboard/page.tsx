"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArchiveRestore, Bell, ChevronDown, ChevronRight, CircleHelp,
  Clock3, Cloud, CloudUpload, File, FileArchive, FileImage, FileText,
  Folder, FolderOpen, Grid2X2, HardDrive, LayoutDashboard, Link2, List,
  Menu, MessageSquareWarning, Moon, MoreHorizontal, Plus, Search, Settings,
  Share2, ShieldCheck, Star, Sun, Trash2, Upload, Users, X,
} from "lucide-react";

type ViewName =
  | "Dashboard" | "My files" | "Shared" | "Recent" | "Starred" | "Trash"
  | "Activity" | "Settings";

type FileItem = {
  id: string;
  name: string;
  type: "folder" | "pdf" | "doc" | "image" | "zip";
  size: string;
  bytes: number;
  url: string;
  modified: string;
  owner: string;
  starred?: boolean;
  shared?: boolean;
  deletedAt?: string | null;
};

type SessionUser = { _id?: string; id?: string; name: string; email: string };

const fileType = (name: string): FileItem["type"] => {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (["doc", "docx", "txt"].includes(extension ?? "")) return "doc";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension ?? "")) return "image";
  return "zip";
};

const readableSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const navPrimary: { label: ViewName; icon: typeof Cloud }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "My files", icon: FolderOpen },
  { label: "Shared", icon: Users },
  { label: "Recent", icon: Clock3 },
  { label: "Starred", icon: Star },
  { label: "Trash", icon: Trash2 },
];

const navManage: { label: ViewName; icon: typeof Cloud }[] = [
  { label: "Activity", icon: Activity },
  { label: "Settings", icon: Settings },
];

const fileIcon = (type: FileItem["type"]) => {
  if (type === "folder") return <Folder size={20} />;
  if (type === "pdf" || type === "doc") return <FileText size={20} />;
  if (type === "image") return <FileImage size={20} />;
  if (type === "zip") return <FileArchive size={20} />;
  return <File size={20} />;
};

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [active, setActive] = useState<ViewName>("Dashboard");
  const [dark, setDark] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [grid, setGrid] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(false);

  const loadFiles = async () => {
    const response = await fetch("/api/files");
    if (!response.ok) return;
    const data = await response.json();
    setFiles(data.files.map((item: {
      _id: string; name: string; bytes: number; url: string; createdAt: string;
      starred?: boolean; shared?: boolean; deletedAt?: string | null;
    }) => ({
      id: item._id,
      name: item.name,
      type: fileType(item.name),
      size: readableSize(item.bytes),
      bytes: item.bytes,
      url: item.url,
      modified: new Date(item.createdAt).toLocaleString(),
      owner: "You",
      starred: item.starred,
      shared: item.shared,
      deletedAt: item.deletedAt ?? null,
    })));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        setUser(data.user);
        await loadFiles();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("megham-theme");
    const enabled = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const timer = window.setTimeout(() => setDark(enabled), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("megham-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("#global-search")?.focus();
      }
      if (event.key === "Escape") {
        setUploadOpen(false);
        setNotifications(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleFiles = useMemo(() => {
    let result = active === "Trash"
      ? files.filter((item) => item.deletedAt)
      : files.filter((item) => !item.deletedAt);
    if (active === "Shared") result = result.filter((item) => item.shared);
    if (active === "Starred") result = result.filter((item) => item.starred);
    if (query) result = result.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    return result;
  }, [active, files, query]);

  const activeFiles = useMemo(() => files.filter((item) => !item.deletedAt), [files]);
  const usedBytes = useMemo(() => activeFiles.reduce((sum, item) => sum + item.bytes, 0), [activeFiles]);
  const usedLabel = usedBytes < 1024 * 1024 * 1024
    ? `${(usedBytes / 1024 / 1024).toFixed(1)} MB`
    : `${(usedBytes / 1024 / 1024 / 1024).toFixed(2)} GB`;

  const selectView = (view: ViewName) => {
    setActive(view);
    setSidebar(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mutateFile = async (id: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/files/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not update file.");
    setFiles((current) => current.map((item) => item.id === id ? {
      ...item,
      name: data.file.name,
      starred: data.file.starred,
      shared: data.file.shared,
      deletedAt: data.file.deletedAt ?? null,
    } : item));
  };

  const toggleStar = async (id: string) => {
    const current = files.find((item) => item.id === id);
    if (!current) return;
    try {
      await mutateFile(id, { action: "star", value: !current.starred });
      setToast(current.starred ? "Removed from starred" : "Added to starred");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not update starred file.");
    }
  };

  const moveToTrash = async (id: string) => {
    try {
      await mutateFile(id, { action: "trash" });
      setToast("File moved to trash");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not move file to trash.");
    }
  };

  const restoreFile = async (id: string) => {
    try {
      await mutateFile(id, { action: "restore" });
      setToast("File restored");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not restore file.");
    }
  };

  const toggleShare = async (id: string) => {
    const current = files.find((item) => item.id === id);
    if (!current) return;
    try {
      await mutateFile(id, { action: "share", value: !current.shared });
      setToast(current.shared ? "Sharing disabled" : "File marked as shared");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not update sharing.");
    }
  };

  const renameFile = async (id: string, currentName: string) => {
    const nextName = window.prompt("Rename file", currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    try {
      await mutateFile(id, { action: "rename", name: nextName });
      setToast("File renamed");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not rename file.");
    }
  };

  const deleteForever = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete file.");
      setFiles((current) => current.filter((item) => item.id !== id));
      setToast("File permanently deleted");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not delete file.");
    }
  };

  const completeUpload = (uploaded: {
    _id: string; name: string; bytes: number; url: string;
  }) => {
    setFiles((current) => [{
      id: uploaded._id,
      name: uploaded.name,
      type: fileType(uploaded.name),
      size: readableSize(uploaded.bytes),
      bytes: uploaded.bytes,
      url: uploaded.url,
      modified: "Just now",
      owner: "You",
      starred: false,
      shared: false,
      deletedAt: null,
    }, ...current]);
    setUploadOpen(false);
    setToast(`Upload complete — ${uploaded.name}`);
  };

  if (authLoading) return <div className="auth-shell"><div className="auth-card"><Cloud size={34} /><h1>MEGHAM</h1><p>Opening your workspace…</p></div></div>;
  if (!user) return <AuthScreen onAuthenticated={(nextUser) => {
    setUser(nextUser);
    loadFiles();
  }} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Cloud size={22} strokeWidth={2.4} /></div>
          <div><strong>MEGHAM</strong><span>Cloud workspace</span></div>
          <button className="mobile-close" onClick={() => setSidebar(false)} aria-label="Close menu"><X /></button>
        </div>

        <button className="new-button" onClick={() => setUploadOpen(true)}>
          <Plus size={18} /> New <ChevronDown size={16} />
        </button>

        <nav className="navigation" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navPrimary.map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? "active" : ""} onClick={() => selectView(label)}>
              <Icon size={18} /><span>{label}</span>{label === "Shared" && <b>4</b>}
            </button>
          ))}
          <span className="nav-label nav-space">Manage</span>
          {navManage.map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? "active" : ""} onClick={() => selectView(label)}>
              <Icon size={18} /><span>{label}</span>{label === "Activity" && <i />}
            </button>
          ))}
        </nav>

        <div className="storage-mini">
          <div className="storage-mini-head"><span><HardDrive size={15} /> Storage</span><b>{activeFiles.length}</b></div>
          <div className="meter"><span style={{ width: `${Math.min(100, Math.max(2, (usedBytes / (150 * 1024 ** 3)) * 100))}%` }} /></div>
          <p>{usedLabel} uploaded</p>
          <button onClick={() => setToast("Upgrade plans will be available soon")}>Upgrade storage</button>
        </div>
        <div className="profile">
          <div className="avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
          <button aria-label="Sign out" onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            setUser(null);
            setFiles([]);
          }}><MoreHorizontal size={18} /></button>
        </div>
      </aside>

      {sidebar && <button className="scrim" onClick={() => setSidebar(false)} aria-label="Close navigation" />}

      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebar(true)} aria-label="Open navigation"><Menu /></button>
          <label className="search">
            <Search size={18} />
            <input id="global-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files, folders and people" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="icon-button notification-button" onClick={() => setNotifications((value) => !value)} aria-label="Notifications">
              <Bell size={19} /><span />
            </button>
            <button className="help-button"><CircleHelp size={18} /><span>Help</span></button>
          </div>
          {notifications && (
            <div className="notification-panel">
              <div className="panel-title"><strong>Notifications</strong><button onClick={() => setNotifications(false)}><X size={17} /></button></div>
              {activeFiles[0] ? (
                <div className="notice unread"><div className="notice-icon blue"><CloudUpload size={16} /></div><p><b>Latest upload</b> — {activeFiles[0].name}<span>{activeFiles[0].modified}</span></p></div>
              ) : (
                <div className="notice"><div className="notice-icon sea"><ShieldCheck size={16} /></div><p>Your workspace is ready.<span>Upload a file to get started.</span></p></div>
              )}
              <button className="view-all" onClick={() => { setNotifications(false); selectView("Activity"); }}>View activity</button>
            </div>
          )}
        </header>

        <div className="content">
          {active === "Dashboard" ? (
            <Dashboard files={activeFiles} onUpload={() => setUploadOpen(true)} onNavigate={selectView} onStar={toggleStar} />
          ) : active === "Activity" ? (
            <ActivityView files={activeFiles} />
          ) : active === "Settings" ? (
            <SettingsView user={user} dark={dark} setDark={setDark} toast={setToast} />
          ) : (
            <FilesView
              title={active} files={visibleFiles} query={query} grid={grid}
              setGrid={setGrid} onUpload={() => setUploadOpen(true)} onStar={toggleStar}
              onTrash={moveToTrash} onRestore={restoreFile} onDelete={deleteForever}
              onShare={toggleShare} onRename={renameFile}
            />
          )}
        </div>
      </main>

      {uploadOpen && <UploadModal close={() => setUploadOpen(false)} complete={completeUpload} error={setToast} />}
      {toast && <div className="toast"><ShieldCheck size={18} />{toast}</div>}
    </div>
  );
}

function Dashboard({ files, onUpload, onNavigate, onStar }: {
  files: FileItem[]; onUpload: () => void; onNavigate: (view: ViewName) => void; onStar: (id: string) => void;
}) {
  const usedBytes = files.reduce((sum, item) => sum + item.bytes, 0);
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const usedLabel = usedBytes < 1024 * 1024 * 1024
    ? `${(usedBytes / 1024 / 1024).toFixed(1)} MB`
    : `${(usedBytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  const percent = Math.min(100, Math.round((usedBytes / (150 * 1024 ** 3)) * 100));

  return (
    <>
      <section className="page-heading dashboard-heading">
        <div><p className="eyebrow">{todayLabel}</p><h1>{greeting}.</h1><span>Everything important is right where you left it.</span></div>
        <button className="primary-button" onClick={onUpload}><Upload size={18} /> Upload files</button>
      </section>

      <section className="dashboard-grid">
        <article className="panel storage-card">
          <div className="section-head"><div><p className="eyebrow">Storage overview</p><h2>Your cloud, at a glance</h2></div><button className="plain-button">Manage</button></div>
          <div className="storage-content">
            <div className="storage-ring" style={{ background: `conic-gradient(var(--sea) 0 ${percent}%, var(--surface-3) ${percent}% 100%)` }}><div><strong>{percent}%</strong><span>used</span></div></div>
            <div className="storage-stats">
              <strong>{usedLabel} <span>uploaded</span></strong>
              <div className="legend"><span><i className="dot blue" />Documents <b>{files.filter((item) => ["pdf", "doc"].includes(item.type)).length}</b></span><span><i className="dot sea" />Media <b>{files.filter((item) => item.type === "image").length}</b></span><span><i className="dot silver" />Other <b>{files.filter((item) => !["pdf", "doc", "image"].includes(item.type)).length}</b></span></div>
            </div>
          </div>
        </article>

        <article className="panel upload-card" onClick={onUpload}>
          <div className="upload-icon"><CloudUpload size={28} /></div>
          <h2>Drop files here to upload</h2>
          <p>or browse from your device</p>
          <span>Maximum file size 2 GB</span>
        </article>
      </section>

      <section className="section-block">
        <div className="section-head"><div><p className="eyebrow">Quick access</p><h2>Pick up where you left off</h2></div><button className="plain-button" onClick={() => onNavigate("My files")}>View all <ChevronRight size={16} /></button></div>
        <div className="quick-grid">
          {files.slice(0, 4).map((item) => <FileCard key={item.id} item={item} onStar={onStar} />)}
        </div>
      </section>

      <section className="panel recent-panel">
        <div className="section-head"><div><p className="eyebrow">Recent activity</p><h2>Recently opened</h2></div><button className="plain-button" onClick={() => onNavigate("Recent")}>See everything <ChevronRight size={16} /></button></div>
        <FileTable files={files.slice(0, 5)} onStar={onStar} />
      </section>
    </>
  );
}

function FilesView({ title, files, query, grid, setGrid, onUpload, onStar, onTrash, onRestore, onDelete, onShare, onRename }: {
  title: ViewName; files: FileItem[]; query: string; grid: boolean; setGrid: (v: boolean) => void; onUpload: () => void; onStar: (id: string) => void;
  onTrash: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void;
  onShare: (id: string) => void; onRename: (id: string, currentName: string) => void;
}) {
  const empty = title === "Trash" || files.length === 0;
  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">MEGHAM workspace</p><h1>{title}</h1><span>{query ? `Results matching “${query}”` : title === "Shared" ? "Files shared by you and with you." : "Organise, preview and share your work."}</span></div>
        <button className="primary-button" onClick={onUpload}><Plus size={18} /> Add new</button>
      </section>
      <section className="panel file-browser">
        <div className="browser-toolbar">
          <div className="crumb"><Cloud size={17} /><ChevronRight size={14} /><b>{title}</b></div>
          <div className="view-switch">
            <button className={!grid ? "selected" : ""} onClick={() => setGrid(false)} aria-label="List view"><List size={18} /></button>
            <button className={grid ? "selected" : ""} onClick={() => setGrid(true)} aria-label="Grid view"><Grid2X2 size={18} /></button>
          </div>
        </div>
        {empty ? (
          <div className="empty-state">
            <div><ArchiveRestore size={30} /></div><h2>{title === "Trash" ? "Your trash is empty" : "No files found"}</h2>
            <p>{title === "Trash" ? "Deleted files will stay here for 30 days before being removed permanently." : "Try a different search or upload something new."}</p>
            {title !== "Trash" && <button className="primary-button" onClick={onUpload}><Upload size={17} /> Upload files</button>}
          </div>
        ) : grid ? (
          <div className="file-grid">{files.map((item) => <FileCard key={item.id} item={item} onStar={onStar} />)}</div>
        ) : <FileTable files={files} onStar={onStar} onTrash={onTrash} onRestore={onRestore} onDelete={onDelete} onShare={onShare} onRename={onRename} />}
      </section>
    </>
  );
}

function FileCard({ item, onStar }: { item: FileItem; onStar: (id: string) => void }) {
  return (
    <article className="file-card">
      <div className={`file-symbol ${item.type}`}>{fileIcon(item.type)}</div>
      <button className={`star-button ${item.starred ? "starred" : ""}`} onClick={() => onStar(item.id)} aria-label="Star file"><Star size={16} fill={item.starred ? "currentColor" : "none"} /></button>
      <h3>{item.name}</h3><p>{item.type === "folder" ? item.size : `${item.type.toUpperCase()} · ${item.size}`}</p>
      <div className="card-foot"><span>{item.modified}</span>{item.shared && <span className="shared-pill"><Users size={12} /> Shared</span>}</div>
    </article>
  );
}

function FileTable({ files, onStar, onTrash, onRestore, onDelete, onShare, onRename }: {
  files: FileItem[]; onStar: (id: string) => void;
  onTrash?: (id: string) => void; onRestore?: (id: string) => void; onDelete?: (id: string) => void;
  onShare?: (id: string) => void; onRename?: (id: string, currentName: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Owner</th><th>Modified</th><th>Size</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{files.map((item) => (
          <tr key={item.id}>
            <td><div className={`table-icon ${item.type}`}>{fileIcon(item.type)}</div><div><a href={item.url} target="_blank" rel="noreferrer"><strong>{item.name}</strong></a><span>{item.shared ? "Shared workspace" : "Private"}</span></div></td>
            <td>{item.owner}</td><td>{item.modified}</td><td>{item.size}</td>
            <td className="row-actions">
              <button onClick={() => onStar(item.id)} className={item.starred ? "starred" : ""} aria-label="Toggle starred"><Star size={16} fill={item.starred ? "currentColor" : "none"} /></button>
              {item.deletedAt ? (
                <>
                  <button onClick={() => onRestore?.(item.id)} aria-label="Restore file"><ArchiveRestore size={17} /></button>
                  <button onClick={() => onDelete?.(item.id)} aria-label="Delete permanently"><Trash2 size={17} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => onShare?.(item.id)} aria-label="Toggle sharing"><Share2 size={17} /></button>
                  <button onClick={() => onRename?.(item.id, item.name)} aria-label="Rename file"><MoreHorizontal size={18} /></button>
                  <button onClick={() => onTrash?.(item.id)} aria-label="Move to trash"><Trash2 size={17} /></button>
                </>
              )}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ActivityView({ files }: { files: FileItem[] }) {
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">Workspace history</p><h1>Activity</h1><span>Your latest stored files and their current state.</span></div></section>
      <section className="panel activity-card">
        <div className="section-head"><div><p className="eyebrow">Latest</p><h2>Recent uploads</h2></div></div>
        {files.length ? (
          <div className="timeline">{files.slice(0, 20).map((item) => (
            <div className="timeline-row" key={item.id}><div className="timeline-icon sea"><Upload size={17} /></div><div><strong>{item.name}</strong><p>{item.shared ? "Shared · " : "Private · "}{item.size}</p></div><time>{item.modified}</time></div>
          ))}</div>
        ) : (
          <div className="empty-state"><div><CloudUpload size={30} /></div><h2>No activity yet</h2><p>Upload your first file and it will appear here.</p></div>
        )}
      </section>
    </>
  );
}

function AdminView() {
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">Administration</p><h1>Workspace control</h1><span>Manage members, reports and platform health.</span></div><button className="primary-button"><Users size={17} /> Invite member</button></section>
      <div className="metric-grid">
        {[["24","Active members","+3 this month"],["1.82 TB","Team storage","61% allocated"],["99.98%","Service health","All systems normal"],["3","Open reports","Needs review"]].map(([value,label,note],i) => <article className="panel metric" key={label}><span className={`metric-dot m${i}`} /><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}
      </div>
      <section className="admin-grid">
        <article className="panel member-panel"><div className="section-head"><div><p className="eyebrow">People</p><h2>Recent members</h2></div><button className="plain-button">Manage all</button></div>
          {["Aishwarya Nair","Nirmal Kumar","Arun Dev"].map((name,i) => <div className="member-row" key={name}><div className={`avatar tone${i}`}>{name.split(" ").map(x=>x[0]).join("")}</div><div><strong>{name}</strong><span>{i===0?"Editor":"Member"} · Active now</span></div><button><MoreHorizontal size={18} /></button></div>)}
        </article>
        <article className="panel moderation-panel"><div className="section-head"><div><p className="eyebrow">Moderation</p><h2>Reports to review</h2></div><span className="count-badge">3 open</span></div>
          <div className="report"><MessageSquareWarning size={20} /><div><strong>Public link reported</strong><p>Project archive · 24 minutes ago</p></div><ChevronRight size={17} /></div>
          <div className="report"><Link2 size={20} /><div><strong>Expired sharing policy</strong><p>Client assets · Yesterday</p></div><ChevronRight size={17} /></div>
        </article>
      </section>
    </>
  );
}

function SettingsView({ user, dark, setDark, toast }: { user: SessionUser; dark: boolean; setDark: (v: boolean) => void; toast: (v: string) => void }) {
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [security, setSecurity] = useState(true);
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">Preferences</p><h1>Settings</h1><span>Shape MEGHAM around the way you work.</span></div><button className="primary-button" onClick={() => toast("Settings saved")}>Save changes</button></section>
      <section className="settings-layout">
        <div className="settings-nav panel"><button className="selected">General</button><button>Security</button><button>Notifications</button><button>Sharing</button><button>Billing</button></div>
        <div className="panel settings-panel">
          <div className="settings-group"><h2>Profile</h2><p>Your account information.</p><div className="profile-edit"><div className="avatar big">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.email}</span></div></div></div>
          <div className="settings-group"><h2>Appearance</h2><p>Choose how MEGHAM looks on this device.</p><div className="theme-options"><button className={!dark ? "selected" : ""} onClick={() => setDark(false)}><Sun /><span><b>Light</b><small>Bright spatial workspace</small></span></button><button className={dark ? "selected" : ""} onClick={() => setDark(true)}><Moon /><span><b>Dark</b><small>Easy on the eyes</small></span></button></div></div>
          <div className="settings-group"><h2>Notifications</h2><Toggle label="Product and storage updates" value={emailUpdates} setValue={setEmailUpdates} /><Toggle label="Security alerts" value={security} setValue={setSecurity} /></div>
        </div>
      </section>
    </>
  );
}

function Toggle({ label, value, setValue }: { label: string; value: boolean; setValue: (v: boolean) => void }) {
  return <div className="toggle-row"><span>{label}</span><button className={`toggle ${value ? "on" : ""}`} onClick={() => setValue(!value)} aria-pressed={value}><i /></button></div>;
}

function UploadModal({ close, complete, error }: {
  close: () => void;
  complete: (file: { _id: string; name: string; bytes: number; url: string }) => void;
  error: (message: string) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<File | null>(null);
  const start = async () => {
    if (!selected) return;
    setProgress(10);
    try {
      const signatureResponse = await fetch("/api/cloudinary/sign", {
        method: "POST",
      });
      const signatureData = await signatureResponse.json();
      if (!signatureResponse.ok) throw new Error(signatureData.error ?? "Upload setup failed.");

      setProgress(25);
      const cloudinaryBody = new FormData();
      cloudinaryBody.append("file", selected);
      cloudinaryBody.append("api_key", signatureData.apiKey);
      cloudinaryBody.append("timestamp", String(signatureData.timestamp));
      cloudinaryBody.append("signature", signatureData.signature);
      cloudinaryBody.append("folder", signatureData.folder);

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/auto/upload`,
        { method: "POST", body: cloudinaryBody },
      );
      const uploaded = await cloudinaryResponse.json();
      if (!cloudinaryResponse.ok) {
        throw new Error(uploaded.error?.message ?? "Cloudinary upload failed.");
      }

      setProgress(80);
      const saveResponse = await fetch("/api/files/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          publicId: uploaded.public_id,
          url: uploaded.secure_url,
          resourceType: uploaded.resource_type,
          format: uploaded.format,
          bytes: uploaded.bytes,
        }),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? "Could not save file details.");

      setProgress(100);
      window.setTimeout(() => complete(saved.file), 250);
    } catch (uploadError) {
      setProgress(0);
      error(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    }
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Upload files">
      <div className="modal">
        <div className="modal-head"><div><p className="eyebrow">Add to MEGHAM</p><h2>Upload files</h2></div><button onClick={close}><X size={20} /></button></div>
        <label className="modal-drop"><input type="file" hidden onChange={(event) => setSelected(event.target.files?.[0] ?? null)} /><div><CloudUpload size={30} /></div><strong>{selected?.name ?? "Choose a file"}</strong><span>{progress ? `${progress}% uploaded` : "Documents, images, video and archives up to 25 MB"}</span>{progress > 0 && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}</label>
        <div className="modal-actions"><button className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" onClick={start} disabled={!selected || progress > 0}><Upload size={17} /> {progress ? "Uploading…" : "Upload file"}</button></div>
      </div>
    </div>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: SessionUser) => void }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error ?? "Please try again.");
    onAuthenticated(data.user);
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark"><Cloud size={25} /></div>
        <p className="eyebrow">MEGHAM CLOUD</p>
        <h1>{register ? "Create your workspace" : "Welcome back"}</h1>
        <p>{register ? "Register to upload and manage your files securely." : "Sign in to access your cloud files."}</p>
        <form onSubmit={submit}>
          {register && <label>Full name<input name="name" required maxLength={80} autoComplete="name" /></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required minLength={8} autoComplete={register ? "new-password" : "current-password"} /></label>
          {message && <div className="auth-error">{message}</div>}
          <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
        </form>
        <button className="auth-switch" onClick={() => { setRegister(!register); setMessage(""); }}>
          {register ? "Already registered? Sign in" : "New to MEGHAM? Create account"}
        </button>
      </section>
    </main>
  );
}
