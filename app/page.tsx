import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import Reveal from "@/components/Reveal";

const FEATURES = [
  ["Private by default", "Files are served only to you and the people you invite. There is no public URL unless you create a share link."],
  ["Share with a link or by email", "Links can expire and can be revoked at any time. Invited people can view and download, not edit."],
  ["Folders and bulk actions", "Nest folders, drag files between them, and move or trash many files at once."],
  ["Search and preview", "Search every folder from one box. Open images, PDFs, video and audio without downloading them."],
  ["Direct uploads", "Files upload straight to storage in parallel, up to 25 MB each, with progress for every file."],
  ["Account controls", "Password reset by email, sign out of every device, and delete your account and all files."],
];

export default function HomePage() {
  return (
    <div className="pub">
      <PublicHeader />
      <main>
        <section className="landing-hero">
          <div className="sky" aria-hidden><i className="cloud c1" /><i className="cloud c2" /><i className="cloud c3" /></div>
          <div className="landing-copy">
            <h1 className="rise" style={{ "--d": 60 } as React.CSSProperties}>Private file storage you can share from.</h1>
            <p className="lede rise" style={{ "--d": 180 } as React.CSSProperties}>Upload files, keep them in folders, and share them with a link or with other people. 1 GB included.</p>
            <div className="row-btns rise" style={{ "--d": 300 } as React.CSSProperties}>
              <Link className="btn primary lg" href="/dashboard">Create an account</Link>
              <Link className="btn soft lg" href="/dashboard">Sign in</Link>
            </div>
          </div>
          <div className="landing-visual rise" style={{ "--d": 420 } as React.CSSProperties} aria-hidden>
            <div className="mock-bar"><span>My files</span></div>
            <div className="mock-row" style={{ "--i": 0 } as React.CSSProperties}><span>Q4-report.pdf</span><span>2.4 MB</span><span className="tag on">Shared</span></div>
            <div className="mock-row" style={{ "--i": 1 } as React.CSSProperties}><span>launch-hero.png</span><span>840 KB</span><span className="tag">Only you</span></div>
            <div className="mock-row" style={{ "--i": 2 } as React.CSSProperties}><span>budget-2027.xlsx</span><span>318 KB</span><span className="tag">Only you</span></div>
            <div className="mock-row mock-upload" style={{ "--i": 3 } as React.CSSProperties}><span>brand-kit.zip</span><span className="bar"><i /></span><span>Uploading…</span></div>
          </div>
        </section>
        <section className="features" aria-labelledby="features-h">
          <Reveal><h2 id="features-h">What it does</h2></Reveal>
          <div className="feature-list">
            {FEATURES.map(([title, text], i) => (<Reveal as="article" key={title} delay={(i % 2) * 90}><h3>{title}</h3><p>{text}</p></Reveal>))}
          </div>
        </section>
        <section className="cta-line">
          <h2>Ready to move your files over?</h2>
          <Link className="btn primary" href="/dashboard">Get started</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
