# MEGHAM Cloud Workspace

MEGHAM is a full-stack cloud file workspace built with Next.js, React, TypeScript, MongoDB and Cloudinary.

## Working features

- Account registration, login and logout with bcrypt password hashing and signed HTTP-only session cookies
- User-scoped file metadata in MongoDB
- Direct signed uploads to Cloudinary with a 25 MB application limit
- List and grid file views with global search
- Persistent starred files
- Shared-status filtering
- Rename files
- Soft-delete trash with restore
- Permanent deletion from both Cloudinary and MongoDB
- Real uploaded-storage totals and recent-file activity
- Light/dark theme persistence
- Responsive desktop and mobile navigation
- Public landing, About and Contact pages

## Tech stack

- Next.js 16 / React 19 / TypeScript
- MongoDB + Mongoose
- Cloudinary
- bcryptjs + jose
- Tailwind CSS 4

## Environment variables

Copy `.env.example` and configure:

```env
MONGODB_URI=
MONGODB_DB=megham
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Use a long, random `JWT_SECRET` in production. Production startup intentionally rejects a missing JWT secret.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production verification

```bash
npm run build
npm run lint
```

## Core API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/files`
- `POST /api/cloudinary/sign`
- `POST /api/files/complete`
- `PATCH /api/files/:id` — star, share, rename, trash, restore
- `DELETE /api/files/:id` — permanent deletion after trashing

## Deployment

The repository is connected to Vercel. Feature branches create preview deployments and `main` is the production branch.
