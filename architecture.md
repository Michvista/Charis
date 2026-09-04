# Charis — Architecture

## Service Map

| Service | Framework | Language | Owns | Port |
|---|---|---|---|---|
| `backend/` | Django + DRF | Python | Auth, Wardrobe, Trip Planner, Social, Analytics, Style Advisor | 8000 |
| `styling-service/` | **DolphJS (Spring OOP)** | TypeScript | Occasions, Outfits, Verdict, Combo generation | 3300 |
| `job-worker/` | Node + BullMQ | TypeScript | Async jobs (tagging, combos, verdict, notifications) | — (worker only) |
| `frontend/` | Next.js (React App Router) | TypeScript | All UI, Framer Motion, Recharts | 3000 |

Shared infrastructure: **Postgres** (one DB, separate schemas per service) · **Redis** (job queue + cache)

---

## Why this split

Django owns the data backbone — wardrobe items, wear logs, trips, social shares. Everything that is a persistent record of the user's real world lives here.

DolphJS owns the intelligence layer — occasions, outfit verdicts, combo generation. This is where the interesting logic lives (backtracking algorithm, graph scoring, AI calls) and it's the showcase for the Spring OOP paradigm DolphJS is built around.

The job-worker exists purely because AI calls are slow. Neither Django nor DolphJS blocks on them — they enqueue a job, the worker picks it up, and calls back with the result.

Notifications are handled inside `job-worker/src/notifications/` — folded in rather than a separate service, keeping the Node service count reasonable.

---

## Data flow for a slow operation (e.g. outfit verdict)

```
frontend
  → POST /styling/verdict/ (DolphJS)
    → DolphJS validates, creates Outfit record (status: pending) in its own DB
    → pushes job to Redis verdict.queue
    → returns { outfitId, status: "processing" }

frontend polls GET /styling/outfits/:id/status/

job-worker
  → verdict.processor picks up the job
  → calls AI (Groq/Gemini) with item context
  → calls back PATCH /styling/outfits/:id/complete (internal DolphJS route)
  → DolphJS updates Outfit record with verdict + score

frontend poll resolves → renders result
```

---

## Architecture per folder

### `backend/` — DDD-influenced modular monolith
Each `apps/` subfolder is a bounded context. Nothing crosses context boundaries except through explicit service calls or the queue client. Django's ORM is used — no raw SQL unless aggregations demand it (analytics).

```
backend/
├── config/              # settings, urls, asgi, wsgi
├── common/              # shared across all apps
│   ├── queue_client.py  # pushes jobs to Redis (used by wardrobe → tagging)
│   ├── permissions.py   # shared DRF permission classes
│   └── pagination.py    # shared pagination config
└── apps/
    ├── accounts/        # User model (extend AbstractUser HERE, Day 3)
    ├── wardrobe/        # WardrobeItem, WearLog, Season
    │   └── services.py  # enqueue_tagging_job lives here
    ├── tripplanner/     # Trip, TripEvent, PackingList, PackingListItem
    │   └── algorithms.py  # greedy set-cover approximation
    ├── social/          # OutfitShare, Comment, Vote
    ├── analytics/       # no new models (reads WearLog + WardrobeItem)
    │   └── aggregations.py  # sliding window, frequency, cost-per-wear
    ├── styleadvisor/    # StyleKnowledgeChunk, ShoppingSuggestion
    │   ├── retriever.py # local fallback retrieval (File Search is the primary path in services)
    │   └── ingestion.py # idempotent ingest of backend/knowledge/*.md
    └── outfits/         # Outfit (saved outfit snapshots) — CRUD via /api/outfits/
        └── models.py    # JSON-snapshot items so social cards render for any viewer
```

`backend/knowledge/*.md` holds the curated fashion knowledge (dress codes, fabrics, color theory, seasonal dressing, occasions, coordination, footwear, accessories, fit). Ingest it with `python manage.py ingest_style_knowledge` (idempotent by `source_file` + content hash; `--force` re-uploads). Ingestion uploads each file into the persistent Gemini File Search Store (`GEMINI_RAG_STORE`); the Style Advisor supplies that store to Gemini as a `file_search` tool. If File Search is unavailable it falls back to local keyword/tag scoring — clearly logged.

### `styling-service/` — Clean Architecture (DolphJS Spring OOP)
DolphJS Spring mode = OOP controllers + TypeScript decorators. The codebase is layered into application (use-cases), domain (entities + domain services), infrastructure (database + queue), and presentation (HTTP controllers/components).

```
styling-service/
├── dolph_config.yaml        # DolphJS app config (port, cors, db)
└── src/
    ├── server.ts            # app bootstrap
    ├── application/         # use-cases, dtos, mappers per bounded context
    │   ├── occasion/        # Occasion use-cases
    │   └── outfit/          # Outfit use-cases
    ├── domain/              # entities, value-objects, aggregates, repositories
    │   ├── occasion/
    │   ├── outfit/
    │   ├── verdict/         # verdict.algorithms.ts (graph compatibility scoring)
    │   └── combos/          # combos.algorithms.ts (backtracking constraint solver)
    ├── infrastructure/      # TypeORM database layer + BullMQ queue (redis.ts)
    ├── presentation/http/   # controllers + components (routes)
    │   └── components/      # occasion.component.ts · styling.component.ts
    └── shared/              # auth guard, decorators, exception filters
```

### `job-worker/` — Queue/Processor pattern
No named architecture. Queues define what jobs exist. Processors define how to handle them. One-to-one mapping: one queue file → one processor file.

```
job-worker/
└── src/
    ├── index.ts             # starts all workers
    ├── queues/              # BullMQ Queue definitions
    │   ├── tagging.queue.ts     # wardrobe image tagging jobs
    │   ├── verdict.queue.ts     # AI verdict jobs
    │   └── combo.queue.ts       # combo generation jobs
    ├── processors/          # BullMQ Worker handlers
    │   ├── tagging.processor.ts
    │   ├── verdict.processor.ts
    │   └── combo.processor.ts
    ├── notifications/       # notification logic (folded in, not a separate service)
    │   ├── notification.service.ts   # send + dedupe logic
    │   └── notification.worker.ts    # BullMQ worker for notification queue
    └── shared/              # redis.ts (connection) + worker-options.ts
```

### `frontend/` — Next.js App Router, page-per-route
Pages live in `src/app/<route>/page.tsx`. Shared UI lives in `src/components/`, API modules in `src/api/`, and contexts/types in `src/lib/`. Outfit/verdict snapshot cards are shared between Styling, Outfits and Social via `components/outfits/`.

```
frontend/
└── src/
    ├── app/                 # pages (page, wardrobe, styling, outfits, trips,
    │                        #      social, analytics, advisor, settings)
    ├── api/                 # client.ts + per-service API modules
    ├── components/          # layout/ (Shell, AuthGuard) · ui/ · outfits/
    ├── lib/                 # types, AuthContext, ToastContext
    └── data/                # static data
```

---

## Cross-service communication rules

1. **No shared database between Django and DolphJS.** Both connect to the same Postgres instance but use separate schemas. No FK across schemas — store the other service's ID as a plain UUID string field.
2. **DolphJS verifies Django JWTs.** The auth guard in `styling-service/src/shared/guards/auth.guard.ts` decodes the JWT issued by Django — same secret, no separate login for the styling service.
3. **Job-worker communicates back via internal HTTP.** After processing a job, the worker calls an internal endpoint on either Django or DolphJS to update the record status. It does not write to the DB directly.
4. **Frontend talks to two backends.** `wardrobe.api.ts` → Django (port 8000). `styling.api.ts` → DolphJS (port 3000). The base URL per service lives in `.env` so switching in production is one variable change.

---

## Models at a glance

**Django (backend/):** User · WardrobeItem · WearLog · Season · Trip · TripEvent · PackingList · PackingListItem · OutfitShare · Comment · Vote · StyleKnowledgeChunk · ShoppingSuggestion · Outfit

**DolphJS/TypeORM (styling-service/):** Occasion · Outfit · OutfitItem

**job-worker:** No models — stateless processor, reads/writes via API calls only

---

## Design system

The frontend is styled with Tailwind CSS v4 using a bespoke editorial theme. Both typefaces and the core palette are defined once in `frontend/src/app/globals.css` under `@theme`:

| Token            | Value                                    |
| ---------------- | ---------------------------------------- |
| Serif (headings) | **Playfair Display** (`--font-serif`)    |
| Sans (UI text)   | **Hanken Grotesk** (`--font-sans`)       |
| Background       | `#fff8f5` (warm ivory)                   |
| Surface          | `#ffffff` / `#fbf2ed` / `#f5ece7`        |
| Primary          | `#380208` (deep wine)                    |
| Primary dark     | `#54161b`                                |
| On-surface text  | `#1e1b18`                                |
| Muted text       | `#544342` / `#867272`                    |
| Outline          | `#d9c1c0` (blush)                        |
