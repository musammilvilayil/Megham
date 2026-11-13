export type Kind = "image" | "pdf" | "doc" | "sheet" | "slides" | "video" | "audio" | "archive" | "code" | "other";

const MAP: Record<Kind, string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp", "heic"],
  pdf: ["pdf"],
  doc: ["doc", "docx", "txt", "rtf", "md", "odt", "pages"],
  sheet: ["xls", "xlsx", "csv", "ods", "numbers"],
  slides: ["ppt", "pptx", "key", "odp"],
  video: ["mp4", "mov", "webm", "mkv", "avi", "m4v"],
  audio: ["mp3", "wav", "ogg", "m4a", "flac", "aac"],
  archive: ["zip", "rar", "7z", "tar", "gz"],
  code: ["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "go", "rs", "java", "sh", "yml", "yaml", "sql"],
  other: [],
};

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function kindOf(name: string): Kind {
  const e = ext(name);
  return (Object.keys(MAP) as Kind[]).find((k) => MAP[k].includes(e)) ?? "other";
}

/** Types the server will render inline (kept in step with lib/files.ts). */
const PREVIEWABLE = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "pdf", "mp4", "webm", "mp3", "wav", "ogg"]);
export const canPreview = (name: string) => PREVIEWABLE.has(ext(name));
export const previewKind = (name: string): "image" | "pdf" | "video" | "audio" | null => {
  const e = ext(name);
  if (!PREVIEWABLE.has(e)) return null;
  if (e === "pdf") return "pdf";
  if (["mp4", "webm"].includes(e)) return "video";
  if (["mp3", "wav", "ogg"].includes(e)) return "audio";
  return "image";
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000], ["month", 2_592_000], ["week", 604_800], ["day", 86_400], ["hour", 3600], ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
