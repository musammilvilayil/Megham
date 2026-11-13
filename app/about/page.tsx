import { Cloud, Heart, Lock, Zap } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export const metadata = { title: "About — MEGHAM" };

const VALUES = [
  { icon: Cloud, title: "Cloud first", text: "Open your workspace from any modern device, no install needed." },
  { icon: Lock, title: "Privacy by design", text: "Files are private by default and only ever served to people you choose." },
  { icon: Zap, title: "Fast where it counts", text: "Uploads go straight to storage, and big lists load a page at a time." },
  { icon: Heart, title: "Human friendly", text: "A clean experience without needless complexity." },
];

export default function AboutPage() {
  return (
    <div className="pub">
      <PublicHeader />
      <main>
        <section className="inner-hero">
          <p className="pill">About MEGHAM</p>
          <h1>A calmer home for <em>your digital life.</em></h1>
          <p className="lede">“Megham” means cloud. We built it to make keeping, finding and sharing files feel simple, personal and dependable.</p>
        </section>
        <section className="about-layout">
          <article className="prose">
            <h2>Made for everyday files</h2>
            <p>Work documents, photos, project assets and personal archives should be there when you need them — not buried in a complicated interface.</p>
            <p>MEGHAM pairs an uncluttered workspace with reliable cloud infrastructure, giving every person a private place to upload, organise and share.</p>
          </article>
          <div className="value-grid">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <article key={title}><span><Icon size={20} /></span><div><h3>{title}</h3><p>{text}</p></div></article>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
