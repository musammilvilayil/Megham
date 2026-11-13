import Link from "next/link";
import { Logo } from "@/components/app/logo";

export default function PublicHeader() {
  return (
    <header className="pub-header">
      <Link href="/" aria-label="MEGHAM home"><Logo /></Link>
      <nav aria-label="Public navigation">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <Link className="btn primary" href="/dashboard">Open workspace</Link>
    </header>
  );
}
