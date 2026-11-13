import Link from "next/link";
import { ArrowRight, CloudUpload, FolderTree, Link2, Lock, Search, ShieldCheck } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

const FEATURES = [
  { icon: CloudUpload, title: "Upload without waiting", text: "Drag in a pile of files. They travel straight to cloud storage in parallel, with live progress for each one." },
  { icon: Lock, title: "Private by default", text: "Nothing is public until you say so. Files are served only to you and to people you invite, never from an open URL." },
  { icon: Link2, title: "Sharing you control", text: "Send a link that expires on its own, invite a teammate by email, and revoke access with one click." },
  { icon: FolderTree, title: "Folders that stay tidy", text: "Nest folders, drag files between them, and act on many files at once." },
  { icon: Search, title: "Find anything fast", text: "Search across every folder instantly, or jump with ⌘K. Preview images, PDFs, video and audio without downloading." },
  { icon: ShieldCheck, title: "Safe accounts", text: "Rate-limited sign-in, password reset by email, and one-tap sign-out on every device." },
];

export default function HomePage() {
  return (
    <div className="pub">
      <PublicHeader />
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="pill">Private cloud storage</p>
            <h1>Your files, <em>floating</em> exactly where you need them.</h1>
            <p className="lede">MEGHAM is a calm, fast workspace to store, organise and share everything you keep — with the privacy you’d expect from your own drive.</p>
            <div className="row-btns">
              <Link className="btn primary lg" href="/dashboard">Start for free <ArrowRight size={18} /></Link>
              <Link className="btn soft lg" href="/about">How it works</Link>
            </div>
            <p className="fine">Up to 25 MB per file · 1 GB included · No credit card</p>
          </div>
          <div className="landing-visual" aria-hidden>
            <div className="mock">
              <div className="mock-bar"><i /><i /><i /><span>My files</span></div>
              <div className="mock-folders"><span>Projects</span><span>Invoices</span><span>Photos</span></div>
              <div className="mock-row"><b className="g pdf" /><div><strong>Q4-report.pdf</strong><small>2.4 MB · just now</small></div><em>Shared</em></div>
              <div className="mock-row"><b className="g image" /><div><strong>launch-hero.png</strong><small>840 KB · 2 min ago</small></div></div>
              <div className="mock-row"><b className="g sheet" /><div><strong>budget-2027.xlsx</strong><small>318 KB · yesterday</small></div></div>
              <div className="mock-progress"><span>Uploading brand-kit.zip</span><i><u /></i></div>
            </div>
            <div className="float-card c1"><Link2 size={16} />Link expires in 7 days</div>
            <div className="float-card c2"><ShieldCheck size={16} />Private by default</div>
          </div>
        </section>

        <section className="features" aria-labelledby="features-h">
          <h2 id="features-h">Everything a drive should do, <em>and nothing it shouldn’t.</em></h2>
          <div className="feature-grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title}><span><Icon size={22} /></span><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <h2>Give your files a better home.</h2>
          <Link className="btn light lg" href="/dashboard">Create your workspace <ArrowRight size={18} /></Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
