import Link from "next/link";
import { ArrowRight, CloudUpload, Database, FolderOpen, ShieldCheck, Sparkles } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export default function HomePage() {
  return (
    <main className="public-shell">
      <PublicHeader />
      <section className="hero">
        <div className="hero-copy">
          <p className="public-eyebrow"><Sparkles size={14} /> Simple. Secure. Yours.</p>
          <h1>Your cloud, <span>thoughtfully organised.</span></h1>
          <p>Upload, find and manage your important files from one calm, secure workspace—wherever you are.</p>
          <div className="hero-actions">
            <Link className="hero-primary" href="/dashboard">Start uploading <ArrowRight size={17} /></Link>
            <Link className="hero-secondary" href="/about">Learn more</Link>
          </div>
          <div className="trust-line"><ShieldCheck size={17} /> Private accounts · Secure cloud storage · Fast access</div>
        </div>
        <div className="hero-visual" aria-label="MEGHAM file workspace preview">
          <div className="preview-bar"><span /><span /><span /><b>My files</b></div>
          <div className="preview-upload"><CloudUpload size={30} /><strong>Drop files to upload</strong><small>Direct, reliable cloud transfer</small></div>
          <div className="preview-files">
            <div><span className="file-tone blue"><FolderOpen size={19} /></span><b>Projects</b><small>12 files</small></div>
            <div><span className="file-tone sea"><Database size={19} /></span><b>Documents</b><small>8 files</small></div>
          </div>
        </div>
      </section>
      <section className="public-features">
        <article><CloudUpload /><h2>Upload without the wait</h2><p>Files travel directly to Cloudinary, avoiding server upload limits and unnecessary hops.</p></article>
        <article><ShieldCheck /><h2>Accounts stay private</h2><p>Secure registration, login and user-scoped folders keep every workspace separate.</p></article>
        <article><Database /><h2>Everything in one place</h2><p>MongoDB-backed metadata makes your latest uploads easy to find and manage.</p></article>
      </section>
      <PublicFooter />
    </main>
  );
}
