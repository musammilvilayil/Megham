import { Mail, MapPin, MessageCircle } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export default function ContactPage() {
  return (
    <main className="public-shell">
      <PublicHeader />
      <section className="inner-hero contact-heading">
        <p className="public-eyebrow">Contact us</p>
        <h1>We would love to hear from you.</h1>
        <p>Questions, feedback or upload trouble? Send us a message and include the file type and approximate size when reporting an upload issue.</p>
      </section>
      <section className="contact-card">
        <div className="contact-copy">
          <span className="contact-icon"><MessageCircle /></span>
          <h2>Let&apos;s talk</h2>
          <p>For support and general enquiries, email the MEGHAM team. We will get back to you as soon as possible.</p>
          <a href="mailto:musammilvilayil@gmail.com"><Mail size={18} /> musammilvilayil@gmail.com</a>
          <span><MapPin size={18} /> Kerala, India</span>
        </div>
        <form className="contact-form" action="mailto:musammilvilayil@gmail.com" method="get">
          <label>Your name<input name="subject" placeholder="Enter your name" required /></label>
          <label>Email address<input type="email" name="email" placeholder="you@example.com" required /></label>
          <label>Message<textarea name="body" rows={6} placeholder="How can we help?" required /></label>
          <button type="submit">Open email to send</button>
          <small>This opens your default email app; your message is not stored on MEGHAM.</small>
        </form>
      </section>
      <PublicFooter />
    </main>
  );
}
