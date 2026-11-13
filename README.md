# MEGHAM Cloud Workspace

MEGHAM is a private cloud file workspace built with Next.js 16, React 19, TypeScript, MongoDB and Cloudinary.

## Features

- **Accounts** — register, sign in, password reset by email, change password, sign out everywhere, delete account. Sign-in and reset endpoints are rate limited (MongoDB-backed, works on serverless).
- **Private storage** — uploads go straight from the browser to Cloudinary as `authenticated` assets. Files are only ever served through the app (`/api/files/:id/download`), never from a public URL. The server re-reads each upload's real size from Cloudinary before saving it, enforces the 25 MB file limit and a per-user quota (default 1 GB), and deletes anything that breaks the rules.
- **Folders & bulk actions** — nested folders, drag files between folders, multi-select to move, trash, restore or delete.
- **Sharing** — public links with optional expiry and one-click revoke, plus invite-by-email to other MEGHAM accounts (view/download only).
- **Preview** — images, PDF, video and audio preview in-app; other types download. Inline rendering is limited to a safe allow-list and every response is sandboxed.
- **Search & pagination** — server-side search across all folders, cursor-paged lists.
- **Trash** — 30-day retention; a daily cron job purges expired trash and orphaned uploads.
- **Design** — responsive light/dark UI, drag-and-drop upload with progress, keyboard shortcuts (⌘/Ctrl+K search).

Not implemented yet: file version history, and email verification at sign-up.

## Environment variables

Copy `.env.example` and set:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI`, `MONGODB_DB` | yes | Database |
| `JWT_SECRET` | yes | Signs session cookies (long random string; production refuses to start without it) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes | File storage |
| `CRON_SECRET` | recommended | Authorises `/api/cron/cleanup` (Vercel Cron sends it automatically) |
| `STORAGE_QUOTA_MB` | no | Per-user quota, default 1024 |
| `APP_URL` | no | Base URL used in password-reset emails |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Sends reset emails. Without a key the link is only written to the server log |

## Develop

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run typecheck
npm test        # API tests against an in-memory MongoDB
npm run build
```

CI (`.github/workflows/ci.yml`) runs all four on every push and pull request.

## Existing files

Files uploaded before the private-storage change are public Cloudinary assets (`deliveryType: "upload"`). They keep working, and are still served through the app, but their old Cloudinary URLs remain reachable until you re-upload them.

## API

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register`, `login`, `logout`, `forgot`, `reset`, `password` | Account flows |
| `DELETE /api/auth/sessions`, `DELETE /api/auth/account` | Sign out everywhere, delete account |
| `GET /api/files?view=&q=&folder=&cursor=&limit=` | List (views: `all`, `recent`, `starred`, `shared`, `shared-with-me`, `trash`) |
| `GET /api/files/stats` | Usage and counts |
| `POST /api/cloudinary/sign`, `POST /api/files/complete` | Direct upload handshake |
| `PATCH /api/files/:id`, `DELETE /api/files/:id` | star, rename, move, trash, restore; permanent delete (trash only) |
| `POST /api/files/bulk` | trash, restore, star, unstar, move, delete |
| `GET /api/files/:id/download[?inline=1\|thumb=1]` | Authenticated file delivery |
| `GET/POST/DELETE /api/files/:id/share` | Links and recipients |
| `GET /api/s/:token`, page `/s/:token` | Public shared file |
| `GET/POST /api/folders`, `PATCH/DELETE /api/folders/:id` | Folders |
| `GET /api/cron/cleanup` | Daily housekeeping (secret required) |
| `GET /api/health` | Deployment health check |

## Deployment

Connected to Vercel; `main` is production. `vercel.json` schedules the daily cleanup cron.
