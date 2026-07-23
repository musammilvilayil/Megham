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
  | "Activity" | "Admin" | "Settings";

type FileItem = {
  id: number;
  name: string;
  type: "folder" | "pdf" | "doc" | "image" | "zip";
  size: string;
  modified: string;
  owner: string;
  starred?: boolean;
  shared?: boolean;
};

const initialFiles: FileItem[] = [
  { id: 1, name: "MEGHAM Product", type: "folder", size: "24 items", modified: "2 min ago", owner: "You", starred: true, shared: true },
  { id: 2, name: "Design resources", type: "folder", size: "18 items", modified: "Yesterday", owner: "You", shared: true },
  { id: 3, name: "Project proposal.pdf", type: "pdf", size: "8.4 MB", modified: "Today, 9:42 AM", owner: "You", starred: true },
  { id: 4, name: "Research notes.docx", type: "doc", size: "2.1 MB", modified: "Jul 21, 2026", owner: "Aishwarya", shared: true },
  { id: 5, name: "Launch artwork.png", type: "image", size: "12.8 MB", modified: "Jul 20, 2026", owner: "Nirmal", shared: true },
  { id: 6, name: "Source backup.zip", type: "zip", size: "1.6 GB", modified: "Jul 18, 2026", owner: "You" },
];

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
  { label: "Admin", icon: ShieldCheck },
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
  const [active, setActive] = useState<ViewName>("Dashboard");
  const [dark, setDark] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [grid, setGrid] = useState(false);
  const [files, setFiles] = useState(initialFiles);
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(false);

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
    let result = [...files];
    if (active === "Shared") result = result.filter((item) => item.shared);
    if (active === "Starred") result = result.filter((item) => item.starred);
    if (active === "Trash") result = [];
    if (query) result = result.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    return result;
  }, [active, files, query]);

  const selectView = (view: ViewName) => {
    setActive(view);
    setSidebar(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleStar = (id: number) => {
    setFiles((current) => current.map((item) => item.id === id ? { ...item, starred: !item.starred } : item));
    setToast("Starred files updated");
  };

  const completeUpload = () => {
    const next: FileItem = {
      id: Date.now(), name: "Portfolio-assets.zip", type: "zip", size: "46.2 MB",
      modified: "Just now", owner: "You",
    };
    setFiles((current) => [next, ...current]);
    setUploadOpen(false);
    setToast("Upload complete — Portfolio-assets.zip");
  };

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
          <div className="storage-mini-head"><span><HardDrive size={15} /> Storage</span><b>68%</b></div>
          <div className="meter"><span /></div>
          <p>102 GB of 150 GB used</p>
          <button onClick={() => setToast("Upgrade plans will be available soon")}>Upgrade storage</button>
        </div>
        <div className="profile">
          <div className="avatar">MM</div>
          <div><strong>Muhammad Musammil</strong><span>Personal workspace</span></div>
          <MoreHorizontal size={18} />
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
              <div className="notice unread"><div className="notice-icon sea"><Share2 size={16} /></div><p><b>Aishwarya</b> shared “Research notes” with you.<span>12 minutes ago</span></p></div>
              <div className="notice"><div className="notice-icon blue"><CloudUpload size={16} /></div><p>Your weekly backup is complete.<span>Yesterday</span></p></div>
              <button className="view-all">View all activity</button>
            </div>
          )}
        </header>

        <div className="content">
          {active === "Dashboard" ? (
            <Dashboard files={files} onUpload={() => setUploadOpen(true)} onNavigate={selectView} onStar={toggleStar} />
          ) : active === "Activity" ? (
            <ActivityView />
          ) : active === "Admin" ? (
            <AdminView />
          ) : active === "Settings" ? (
            <SettingsView dark={dark} setDark={setDark} toast={setToast} />
          ) : (
            <FilesView
              title={active} files={visibleFiles} query={query} grid={grid}
              setGrid={setGrid} onUpload={() => setUploadOpen(true)} onStar={toggleStar}
            />
          )}
        </div>
      </main>

      {uploadOpen && <UploadModal close={() => setUploadOpen(false)} complete={completeUpload} />}
      {toast && <div className="toast"><ShieldCheck size={18} />{toast}</div>}
    </div>
  );
}

function Dashboard({ files, onUpload, onNavigate, onStar }: {
  files: FileItem[]; onUpload: () => void; onNavigate: (view: ViewName) => void; onStar: (id: number) => void;
}) {
  return (
    <>
      <section className="page-heading dashboard-heading">
        <div><p className="eyebrow">Thursday, 23 July</p><h1>Good evening, Musammil.</h1><span>Everything important is right where you left it.</span></div>
        <button className="primary-button" onClick={onUpload}><Upload size={18} /> Upload files</button>
      </section>

      <section className="dashboard-grid">
        <article className="panel storage-card">
          <div className="section-head"><div><p className="eyebrow">Storage overview</p><h2>Your cloud, at a glance</h2></div><button className="plain-button">Manage</button></div>
          <div className="storage-content">
            <div className="storage-ring"><div><strong>68%</strong><span>used</span></div></div>
            <div className="storage-stats">
              <strong>102.4 GB <span>of 150 GB</span></strong>
              <div className="legend"><span><i className="dot blue" />Documents <b>38 GB</b></span><span><i className="dot sea" />Media <b>43 GB</b></span><span><i className="dot silver" />Other <b>21.4 GB</b></span></div>
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

function FilesView({ title, files, query, grid, setGrid, onUpload, onStar }: {
  title: ViewName; files: FileItem[]; query: string; grid: boolean; setGrid: (v: boolean) => void; onUpload: () => void; onStar: (id: number) => void;
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
        ) : <FileTable files={files} onStar={onStar} />}
      </section>
    </>
  );
}

function FileCard({ item, onStar }: { item: FileItem; onStar: (id: number) => void }) {
  return (
    <article className="file-card">
      <div className={`file-symbol ${item.type}`}>{fileIcon(item.type)}</div>
      <button className={`star-button ${item.starred ? "starred" : ""}`} onClick={() => onStar(item.id)} aria-label="Star file"><Star size={16} fill={item.starred ? "currentColor" : "none"} /></button>
      <h3>{item.name}</h3><p>{item.type === "folder" ? item.size : `${item.type.toUpperCase()} · ${item.size}`}</p>
      <div className="card-foot"><span>{item.modified}</span>{item.shared && <span className="shared-pill"><Users size={12} /> Shared</span>}</div>
    </article>
  );
}

function FileTable({ files, onStar }: { files: FileItem[]; onStar: (id: number) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Owner</th><th>Modified</th><th>Size</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{files.map((item) => (
          <tr key={item.id}>
            <td><div className={`table-icon ${item.type}`}>{fileIcon(item.type)}</div><div><strong>{item.name}</strong><span>{item.shared ? "Shared workspace" : "Private"}</span></div></td>
            <td>{item.owner}</td><td>{item.modified}</td><td>{item.size}</td>
            <td className="row-actions"><button onClick={() => onStar(item.id)} className={item.starred ? "starred" : ""}><Star size={16} fill={item.starred ? "currentColor" : "none"} /></button><button><MoreHorizontal size={18} /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ActivityView() {
  const events = [
    { icon: Upload, color: "sea", title: "You uploaded Portfolio case study.pdf", detail: "My files / Portfolio", time: "12 minutes ago" },
    { icon: Share2, color: "blue", title: "Aishwarya shared Research notes.docx", detail: "Can edit · 3 collaborators", time: "1 hour ago" },
    { icon: Star, color: "amber", title: "You starred MEGHAM Product", detail: "Quick access updated", time: "Yesterday" },
    { icon: Trash2, color: "red", title: "You moved old-assets.zip to trash", detail: "Permanently deletes in 29 days", time: "Jul 21, 2026" },
  ];
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">Audit trail</p><h1>Activity</h1><span>A clear record of changes across your workspace.</span></div><button className="secondary-button"><FileText size={17} /> Export log</button></section>
      <section className="panel activity-card">
        <div className="section-head"><div><p className="eyebrow">This week</p><h2>Workspace events</h2></div><button className="plain-button">Filter <ChevronDown size={15} /></button></div>
        <div className="timeline">{events.map(({ icon: Icon, color, title, detail, time }) => (
          <div className="timeline-row" key={title}><div className={`timeline-icon ${color}`}><Icon size={17} /></div><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div>
        ))}</div>
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

function SettingsView({ dark, setDark, toast }: { dark: boolean; setDark: (v: boolean) => void; toast: (v: string) => void }) {
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [security, setSecurity] = useState(true);
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">Preferences</p><h1>Settings</h1><span>Shape MEGHAM around the way you work.</span></div><button className="primary-button" onClick={() => toast("Settings saved")}>Save changes</button></section>
      <section className="settings-layout">
        <div className="settings-nav panel"><button className="selected">General</button><button>Security</button><button>Notifications</button><button>Sharing</button><button>Billing</button></div>
        <div className="panel settings-panel">
          <div className="settings-group"><h2>Profile</h2><p>Information visible to people you collaborate with.</p><div className="profile-edit"><div className="avatar big">MM</div><div><strong>Muhammad Musammil A</strong><span>musammilvilayil@icloud.com</span></div><button className="secondary-button">Change photo</button></div></div>
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

function UploadModal({ close, complete }: { close: () => void; complete: () => void }) {
  const [progress, setProgress] = useState(0);
  const start = () => {
    setProgress(14);
    const timer = window.setInterval(() => setProgress((p) => {
      if (p >= 100) { window.clearInterval(timer); window.setTimeout(complete, 450); return 100; }
      return Math.min(100, p + 14);
    }), 120);
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Upload files">
      <div className="modal">
        <div className="modal-head"><div><p className="eyebrow">Add to MEGHAM</p><h2>Upload files</h2></div><button onClick={close}><X size={20} /></button></div>
        <button className="modal-drop" onClick={start}><div><CloudUpload size={30} /></div><strong>{progress ? "Portfolio-assets.zip" : "Choose files or drag them here"}</strong><span>{progress ? `${progress}% uploaded` : "Documents, images, video and archives up to 2 GB"}</span>{progress > 0 && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}</button>
        <div className="modal-actions"><button className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" onClick={start} disabled={progress > 0 && progress < 100}><Upload size={17} /> {progress ? "Uploading…" : "Select files"}</button></div>
      </div>
    </div>
  );
}
