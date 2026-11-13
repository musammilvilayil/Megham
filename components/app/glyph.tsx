import { Archive, Code2, File, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation } from "lucide-react";
import { kindOf, type Kind } from "./format";

const ICONS: Record<Kind, typeof File> = {
  image: FileImage, pdf: FileText, doc: FileText, sheet: FileSpreadsheet, slides: Presentation,
  video: FileVideo, audio: FileAudio, archive: Archive, code: Code2, other: File,
};

/** Coloured square icon whose hue comes from the file kind (see .glyph.<kind> in CSS). */
export function FileGlyph({ name, size = 20, box = false }: { name: string; size?: number; box?: boolean }) {
  const kind = kindOf(name);
  const Icon = ICONS[kind];
  return box
    ? <span className={`glyph ${kind}`} style={{ width: size * 1.9, height: size * 1.9 }}><Icon size={size} strokeWidth={1.8} /></span>
    : <span className={`glyph-bare ${kind}`}><Icon size={size} strokeWidth={1.8} /></span>;
}
