import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="pub-footer">
      <span>© {new Date().getFullYear()} MEGHAM</span>
      <div><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/dashboard">Sign in</Link></div>
    </footer>
  );
}
