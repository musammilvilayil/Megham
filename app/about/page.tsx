import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export const metadata = { title: "About — MEGHAM" };

const VALUES = [
  ["Works anywhere", "Open your files from any modern browser. Nothing to install."],
  ["Private by default", "Files are never public unless you share them, and links can be revoked."],
  ["Straightforward", "Large lists load a page at a time, and uploads go straight to storage."],
];

export default function AboutPage() {
  return (
    <div className="pub">
      <PublicHeader />
      <main>
        <section className="inner-hero">
          <h1>About MEGHAM</h1>
          <p className="lede">“Megham” means cloud. It is a simple place to keep, find and share your files.</p>
        </section>
        <section className="about-layout">
          <article className="prose">
            <h2>Made for everyday files</h2>
            <p>Work documents, photos, project assets and personal archives should be there when you need them, without a complicated interface in the way.</p>
            <p>MEGHAM pairs a plain workspace with reliable cloud storage, so each person has a private place to upload, organise and share.</p>
          </article>
          <div className="value-grid">
            {VALUES.map(([title, text]) => (<article key={title}><h3>{title}</h3><p>{text}</p></article>))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
