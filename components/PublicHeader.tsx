import Link from "next/link";
import { Cloud } from "lucide-react";

export default function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-brand" href="/" aria-label="MEGHAM home">
        <span className="brand-mark"><Cloud size={21} strokeWidth={2.4} /></span>
        <span><strong>MEGHAM</strong><small>Cloud workspace</small></span>
      </Link>
      <nav className="public-nav" aria-label="Public navigation">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <Link className="public-cta" href="/dashboard">Open workspace</Link>
    </header>
  );
}
