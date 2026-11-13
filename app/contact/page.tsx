import { Mail, MapPin } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export const metadata = { title: "Contact — MEGHAM" };

export default function ContactPage() {
  return (
    <div className="pub">
      <PublicHeader />
      <main>
        <section className="inner-hero">
          <p className="pill">Contact</p>
          <h1>We’d love to <em>hear from you.</em></h1>
          <p className="lede">Questions, feedback or upload trouble? Include the file type and approximate size when reporting an upload issue.</p>
        </section>
        <section className="contact-layout">
          <div className="prose">
            <h2>Let’s talk</h2>
            <p>For support and general enquiries, email the MEGHAM team. We’ll get back to you as soon as we can.</p>
            <a className="contact-line" href="mailto:musammilvilayil@gmail.com"><Mail size={18} />musammilvilayil@gmail.com</a>
            <span className="contact-line"><MapPin size={18} />Kerala, India</span>
          </div>
          <form className="panel stack" action="mailto:musammilvilayil@gmail.com" method="get">
            <label className="field"><span>Your name</span><input name="subject" placeholder="Enter your name" required /></label>
            <label className="field"><span>Email address</span><input type="email" name="email" placeholder="you@example.com" required /></label>
            <label className="field"><span>Message</span><textarea name="body" rows={6} placeholder="How can we help?" required /></label>
            <button className="btn primary" type="submit">Open email to send</button>
            <small className="hint">This opens your default email app; your message isn’t stored on MEGHAM.</small>
          </form>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
