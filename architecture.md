# Charis — Architecture

## Service Map

| Service | Framework | Language | Owns | Port |
|---|---|---|---|---|
| `backend/` | Django + DRF | Python | Auth, Wardrobe, Trip Planner, Social, Analytics, Style Advisor | 8000 |
| `styling-service/` | **DolphJS (Spring OOP)** | TypeScript | Occasions, Outfits, Verdict, Combo generation | 3000 |
| `job-worker/` | Node + BullMQ | TypeScript | Async jobs (tagging, combos, verdict, notifications) | — (worker only) |
| `frontend/` | React + Vite | TypeScript | All UI, Framer Motion, Recharts | 5173 |

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
    └── styleadvisor/    # StyleKnowledgeChunk, ShoppingSuggestion
        └── retriever.py # RAG query logic (Google File Store)
```

### `styling-service/` — MVC layered (DolphJS Spring OOP)
DolphJS Spring mode = OOP controllers + TypeScript decorators. Each component folder owns one domain concept.

```
styling-service/
├── dolph_config.yaml        # DolphJS app config (port, cors, db)
└── src/
    ├── server.ts            # app bootstrap
    ├── shared/              # cross-component utilities
    │   ├── guards/auth.guard.ts        # verifies JWT from Django auth
    │   ├── decorators/user.decorator.ts
    │   └── filters/exception.filter.ts
    └── components/          # DolphJS calls route modules "components"
        ├── occasions/       # Occasion CRUD
        ├── verdict/         # 2-item + occasion → AI verdict
        │   └── verdict.algorithms.ts  # graph-based compatibility scoring
        ├── outfits/         # saved outfits, status polling
        └── combos/          # outfit combo generation from wardrobe
            └── combos.algorithms.ts   # backtracking constraint solver
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
    └── notifications/       # notification logic (folded in, not a separate service)
        ├── notification.service.ts   # send + dedupe logic
        └── notification.worker.ts    # BullMQ worker for notification queue
```

### `frontend/` — Feature-based folder structure
Each feature folder is self-contained: its own page component (`index.tsx`), its own data-fetching hooks (`hooks.ts`), and it calls the relevant API file. Components that appear across features live in `components/`.

```
frontend/
└── src/
    ├── api/                    # axios functions, one file per backend service
    │   ├── client.ts           # base axios instance + interceptors
    │   ├── wardrobe.api.ts     # calls Django wardrobe endpoints
    │   ├── styling.api.ts      # calls DolphJS styling-service
    │   └── analytics.api.ts    # calls Django analytics endpoint
    ├── features/               # one folder per screen group
    │   ├── wardrobe/           # grid, item detail, upload
    │   ├── styling/            # verdict flow, combo generator
    │   ├── tripplanner/        # trips list, create trip, packing list
    │   ├── social/             # feed, share outfit
    │   └── analytics/          # Recharts dashboard
    └── components/
        ├── ui/                 # Button, Card, Input (reusable primitives)
        └── charts/             # 4 Recharts chart components
            ├── WearFrequencyChart.tsx
            ├── CategoryChart.tsx
            ├── ColorChart.tsx
            └── CostPerWearChart.tsx
```

---

## Cross-service communication rules

1. **No shared database between Django and DolphJS.** Both connect to the same Postgres instance but use separate schemas. No FK across schemas — store the other service's ID as a plain UUID string field.
2. **DolphJS verifies Django JWTs.** The auth guard in `styling-service/src/shared/guards/auth.guard.ts` decodes the JWT issued by Django — same secret, no separate login for the styling service.
3. **Job-worker communicates back via internal HTTP.** After processing a job, the worker calls an internal endpoint on either Django or DolphJS to update the record status. It does not write to the DB directly.
4. **Frontend talks to two backends.** `wardrobe.api.ts` → Django (port 8000). `styling.api.ts` → DolphJS (port 3000). The base URL per service lives in `.env` so switching in production is one variable change.

---

## Models at a glance

**Django (backend/):** User · WardrobeItem · WearLog · Season · Trip · TripEvent · PackingList · PackingListItem · OutfitShare · Comment · Vote · StyleKnowledgeChunk · ShoppingSuggestion

**DolphJS/TypeORM (styling-service/):** Occasion · Outfit · OutfitItem

**job-worker:** No models — stateless processor, reads/writes via API calls only
