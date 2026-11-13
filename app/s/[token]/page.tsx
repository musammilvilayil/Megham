/* eslint-disable @next/next/no-img-element -- previews are auth-gated streams, not optimisable static assets */
import type { Metadata } from "next";
import Link from "next/link";
import { Download, LinkIcon } from "lucide-react";
import { FileGlyph } from "@/components/app/glyph";
import { Logo } from "@/components/app/logo";
import { formatBytes, previewKind } from "@/components/app/format";
import { resolveShare } from "@/lib/shareLookup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared file — MEGHAM", robots: { index: false, follow: false } };

export default async function SharedFilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveShare(token).catch(() => null);

  if (!resolved) {
    return (
      <div className="center-page">
        <Logo />
        <div className="center-card">
          <span className="round-icon"><LinkIcon size={22} /></span>
          <h1>This link isn’t available</h1>
          <p className="muted">It may have expired or been revoked by the owner. Ask them to send a new one.</p>
          <Link className="btn soft" href="/">Go to MEGHAM</Link>
        </div>
      </div>
    );
  }

  const { file } = resolved;
  const kind = previewKind(file.name);
  const src = `/api/s/${token}`;
  return (
    <div className="center-page wide">
      <Logo />
      <div className="share-card">
        {kind === "image" && <img className="share-media" src={`${src}?inline=1`} alt={file.name} />}
        {kind === "video" && <video className="share-media" src={`${src}?inline=1`} controls />}
        {kind === "audio" && <audio className="share-audio" src={`${src}?inline=1`} controls />}
        {kind === "pdf" && <iframe className="share-media pdf" src={`${src}?inline=1`} title={file.name} sandbox="allow-same-origin" />}
        {!kind && <div className="share-glyph"><FileGlyph name={file.name} size={34} box /></div>}
        <div className="share-info">
          <div><h1>{file.name}</h1><p className="muted">{formatBytes(file.bytes)} · shared with you via MEGHAM</p></div>
          <a className="btn primary lg" href={src} download={file.name}><Download size={18} />Download</a>
        </div>
      </div>
      <p className="fine"><Link href="/">Store and share your own files with MEGHAM →</Link></p>
    </div>
  );
}
