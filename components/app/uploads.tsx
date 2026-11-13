"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, X } from "lucide-react";
import { api, errorMessage } from "./api";
import { formatBytes } from "./format";
import type { FileItem } from "./types";

export const MAX_BYTES = 25 * 1024 * 1024;

export type UploadJob = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

type Signed = { cloudName: string; apiKey: string; timestamp: number; folder: string; type: string; signature: string };

function sendToCloudinary(file: File, signed: Signed, onProgress: (pct: number) => void) {
  return new Promise<{ public_id: string; resource_type: string }>((resolve, reject) => {
    const form = new FormData();
    form.set("file", file);
    form.set("api_key", signed.apiKey);
    form.set("timestamp", String(signed.timestamp));
    form.set("folder", signed.folder);
    form.set("type", signed.type);
    form.set("signature", signed.signature);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data?.error?.message ?? "Upload was rejected."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}

/** Queue of direct-to-Cloudinary uploads, three at a time, with per-file progress. */
export function useUploads(onUploaded: (file: FileItem) => void) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const running = useRef(0);
  const queue = useRef<{ job: UploadJob; file: File; folder: string | null }[]>([]);
  const uploaded = useRef(onUploaded);
  useEffect(() => { uploaded.current = onUploaded; });

  const patch = useCallback((id: string, change: Partial<UploadJob>) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...change } : job)));
  }, []);

  const pump = useCallback(function pump() {
    while (running.current < 3 && queue.current.length) {
      const next = queue.current.shift()!;
      running.current += 1;
      (async () => {
        const { job, file, folder } = next;
        patch(job.id, { status: "uploading", progress: 1 });
        try {
          const signed = await api<Signed>("/api/cloudinary/sign", { body: { bytes: file.size } });
          const sent = await sendToCloudinary(file, signed, (progress) => patch(job.id, { progress }));
          const { file: saved } = await api<{ file: FileItem }>("/api/files/complete", {
            body: { name: file.name, publicId: sent.public_id, resourceType: sent.resource_type, folder },
          });
          patch(job.id, { status: "done", progress: 100 });
          uploaded.current(saved);
        } catch (error) {
          patch(job.id, { status: "error", error: errorMessage(error) });
        } finally {
          running.current -= 1;
          pump();
        }
      })();
    }
  }, [patch]);

  const add = useCallback(
    (files: File[], folder: string | null) => {
      const created: UploadJob[] = files.map((file) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const tooBig = file.size > MAX_BYTES || file.size === 0;
        return {
          id, name: file.name, size: file.size, progress: 0,
          status: tooBig ? "error" : "queued",
          error: tooBig ? (file.size === 0 ? "File is empty." : "Larger than the 25 MB limit.") : undefined,
        };
      });
      setJobs((current) => [...created, ...current]);
      created.forEach((job, index) => {
        if (job.status === "queued") queue.current.push({ job, file: files[index], folder });
      });
      pump();
    },
    [pump],
  );

  const dismiss = useCallback(() => setJobs((current) => current.filter((j) => j.status === "uploading" || j.status === "queued")), []);
  return { jobs, add, dismiss };
}

export function UploadTray({ jobs, dismiss }: { jobs: UploadJob[]; dismiss: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!jobs.length) return null;
  const active = jobs.filter((j) => j.status === "uploading" || j.status === "queued").length;
  return (
    <aside className="tray" aria-live="polite">
      <header>
        <strong>{active ? `Uploading ${active} file${active > 1 ? "s" : ""}…` : "Uploads finished"}</strong>
        <button onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Expand" : "Collapse"} className={collapsed ? "flip" : ""}><ChevronDown size={18} /></button>
        <button onClick={dismiss} aria-label="Clear finished uploads"><X size={18} /></button>
      </header>
      {!collapsed && (
        <ul>
          {jobs.slice(0, 20).map((job) => (
            <li key={job.id} className={job.status}>
              <div className="tray-text"><span title={job.name}>{job.name}</span><small>{job.status === "error" ? job.error : formatBytes(job.size)}</small></div>
              {job.status === "uploading" || job.status === "queued" ? (
                <div className="tray-progress" role="progressbar" aria-valuenow={job.progress}><i style={{ width: `${job.progress}%` }} />{job.status === "queued" && <Loader2 size={14} className="spin" />}</div>
              ) : job.status === "done" ? <CheckCircle2 size={18} className="ok" /> : <AlertCircle size={18} className="bad" />}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
