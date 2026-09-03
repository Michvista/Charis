# Deploying Charis on the Free Tier (Vercel + Render)

This guide hosts the app with **Vercel** (frontend) and **Render** (backend,
styling service, job worker) using free plans. Postgres and Redis stay
**external** (e.g. Neon + Upstash) — no database runs inside Render.

```
Browser ──► Vercel (Next.js)  ──rewrites──►  Render: charis-backend (Django)
        │                                     Render: charis-styling (DolphJS)
        └─ /api/today-suggestion runs on Vercel (Groq)
   Render: charis-job-worker (BullMQ) ──► Upstash Redis
```

---

## 0. Prerequisites (free accounts)

| What        | Where                     | Notes |
| ----------- | ------------------------- | ----- |
| Postgres    | **Neon** (free tier)      | External, keep it |
| Redis       | **Upstash** or **Redis Cloud** free | BullMQ polls a lot — watch the free quota |
| GitHub      | your repo (`Michvista/Charis`) | |
| Vercel      | vercel.com                | Import the repo |
| Render      | render.com                | Import the repo |
| AI keys     | Google AI Studio (Gemini), Groq | |
| Images      | Cloudinary (free tier)    | |

---

## 1. Prepare the repo

1. Commit and push everything (including `render.yaml`, `frontend/vercel.json`,
   `backend/gunicorn.conf.py`, and the `job-worker` health endpoint).
2. Optional but useful: run the ingestion + migrations once locally so the first
   deploy is already primed.

---

## 2. Deploy the Django backend on Render

**Option A — Blueprint (automatic):**
1. In Render, **New → Blueprint** and select your GitHub repo.
2. Render reads `render.yaml` and creates `charis-backend`, `charis-styling`,
   and `charis-job-worker`.
3. In each service's **Environment** tab, fill the `sync: false` values.

**Option B — Manual web service (per service):**
1. **New → Web Service → Build and deploy from a Git repository** → choose the repo.
2. Set:
   - Name: `charis-backend`
   - Root Directory: `backend`
   - Environment: `Docker`
   - Start Command: `gunicorn config.wsgi:application -c gunicorn.conf.py`
3. Add these env vars:
   ```
   SECRET_KEY=<long random string>
   DEBUG=False
   ALLOWED_HOSTS=charis-backend.onrender.com,localhost,127.0.0.1
   DATABASE_URL=postgresql://...  # your Neon URL
   REDIS_URL=rediss://...         # your Upstash URL
   JWT_SECRET=<same secret on ALL services>
   INTERNAL_API_KEY=<shared secret>
   GEMINI_API_KEY=...
   GROQ_API_KEY=...
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   STYLING_SERVICE_URL=https://charis-styling.onrender.com
   STYLING_SERVICE_INTERNAL_TOKEN=<INTERNAL_API_KEY value>
   GEMINI_RAG_CORPUS=            # optional — leave blank
   ```

> Render free services sleep after ~15 min idle. First visit after sleep = cold start.

---

## 3. Deploy the styling service on Render

Manual service:
- Root Directory: `styling-service`
- Environment: `Docker`
- Start Command: `node app/server.js`
- Env:
  ```
  DATABASE_URL=<same Neon URL>
  DATABASE_SCHEMA=styling_service
  JWT_SECRET=<same as backend>
  INTERNAL_API_KEY=<same shared secret>
  ```
  Render injects `PORT` automatically; do **not** hardcode it.

---

## 4. Deploy the job worker on Render

Manual service (free tier has no background workers, so this runs as a web
service; it starts the BullMQ workers *and* a tiny HTTP health endpoint so
Render keeps it alive — added in `job-worker/src/index.ts`):
- Root Directory: `job-worker`
- Environment: `Docker`
- Start Command: `node dist/index.js`
- Env:
  ```
  REDIS_URL=<same Upstash URL>
  DJANGO_INTERNAL_URL=https://charis-backend.onrender.com
  STYLING_SERVICE_INTERNAL_URL=https://charis-styling.onrender.com
  STYLING_SERVICE_URL=https://charis-styling.onrender.com
  INTERNAL_API_KEY=<same shared secret>
  GEMINI_API_KEY=...
  UV_THREADPOOL_SIZE=128
  ```

> Because the free service sleeps, background jobs (image tagging, AI verdicts,
> combos) will not process while it is asleep. For always-on jobs you eventually
> need a paid worker or a cron that wakes it.

---

## 5. Deploy the frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory** → `frontend`.
3. Framework auto-detects **Next.js** (`frontend/vercel.json` is present).
4. Add these env vars in Vercel (Project Settings → Environment Variables):
   ```
   NEXT_PUBLIC_BACKEND_URL=https://charis-backend.onrender.com
   NEXT_PUBLIC_STYLING_URL=https://charis-styling.onrender.com
   GROQ_API_KEY=...
   ```
   `NEXT_PUBLIC_BACKEND_URL`/`NEXT_PUBLIC_STYLING_URL` drive the rewrites in
   `next.config.ts` (`/api/*` → Django, `/styling-api/*` → DolphJS) — this also
   removes CORS issues because the browser only talks to Vercel.
5. Deploy. Vercel also runs the `/api/today-suggestion` Groq route.

---

## 6. One-time setup after the backend deploys

Open the **Render shell** for `charis-backend` (or use a `Release Command`) and run:

```bash
python manage.py migrate
python manage.py ingest_style_knowledge
```

- `migrate` creates all tables (including `outfits_outfit`, `social_vote`, etc.).
- `ingest_style_knowledge` indexes the 9 files in `backend/knowledge/` into the
  Gemini File Search corpus and Postgres. Run `--force` once if you want to
  (re)build the corpus.

Then confirm:
- `https://charis-backend.onrender.com/api/auth/login/` responds.
- Log in through the Vercel URL, run an AI verdict, save an outfit, and ask the
  Style Advisor.

---

## 7. Free-tier caveats to expect

- **Cold starts / sleep**: every Render service sleeps after ~15 min idle and
  wakes on the next request (adds a few seconds).
- **Free hours**: Render free services have a limited number of runtime hours
  per month.
- **Worker sleep**: AI jobs stall while the worker dyno is asleep.
- **Upstash quota**: BullMQ polling can burn the free Redis quota; monitor it.
- **Vercel serverless timeout**: the Groq suggestion route and the `/api/*`
  rewrites run as serverless functions — keep them fast (they are).

---

## 8. Alternative: one VPS with Docker

If you ever want a single always-on host instead: provision a small VPS, install
Docker, `git clone`, copy `.env` (Neon + Upstash values), then:

```bash
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py ingest_style_knowledge
```

Add `postgres`/`redis` services to `docker-compose.yml` if you want them local,
and put Caddy or Nginx in front with TLS.