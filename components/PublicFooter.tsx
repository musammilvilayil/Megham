import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>© {new Date().getFullYear()} MEGHAM. Your files, thoughtfully organised.</span>
      <div><Link href="/about">About</Link><Link href="/contact">Contact</Link></div>
    </footer>
  );
}
