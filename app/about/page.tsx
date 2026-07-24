import { Cloud, Database, Heart, ShieldCheck } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export default function AboutPage() {
  return (
    <main className="public-shell">
      <PublicHeader />
      <section className="inner-hero">
        <p className="public-eyebrow">About MEGHAM</p>
        <h1>A calmer home for your digital life.</h1>
        <p>MEGHAM means cloud. We built it to make storing and finding files feel simple, personal and dependable.</p>
      </section>
      <section className="about-grid">
        <article className="about-story">
          <h2>Made for everyday files</h2>
          <p>Work documents, photos, project assets and personal archives should be available when you need them—not buried in a complicated interface.</p>
          <p>MEGHAM combines an uncluttered workspace with reliable cloud infrastructure, giving each user a private place to upload and organise their files.</p>
        </article>
        <div className="value-list">
          <article><span><Cloud /></span><div><h3>Cloud first</h3><p>Access your workspace from any modern device.</p></div></article>
          <article><span><ShieldCheck /></span><div><h3>Privacy by design</h3><p>Authenticated, user-scoped file records and storage.</p></div></article>
          <article><span><Database /></span><div><h3>Built to grow</h3><p>MongoDB and Cloudinary provide a dependable foundation.</p></div></article>
          <article><span><Heart /></span><div><h3>Human friendly</h3><p>A clean experience without needless complexity.</p></div></article>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
