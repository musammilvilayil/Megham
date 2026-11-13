export type FileItem = {
  id: string;
  name: string;
  bytes: number;
  resourceType: string;
  format: string | null;
  folder: string | null;
  starred: boolean;
  shared: boolean;
  sharedWithCount: number;
  deletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  mine: boolean;
};

export type FolderItem = { id: string; name: string; parent: string | null };
export type SessionUser = { id: string; name: string; email: string };

export type Stats = {
  usage: { bytes: number; count: number; quota: number };
  kinds: { type: string; bytes: number; count: number }[];
  counts: { active: number; starred: number; shared: number; trashed: number; sharedWithMe: number };
};

export type ViewId =
  | "overview" | "files" | "recent" | "starred" | "shared" | "shared-with-me" | "trash" | "settings";

export type ShareState = {
  links: { id: string; token: string; expiresAt: string | null; downloads: number; createdAt: string }[];
  people: { id: string; name: string; email: string }[];
};
