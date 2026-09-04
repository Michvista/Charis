# Charis

A wardrobe operating system. Digitize your closet once — get AI-powered outfit verdicts, generate combinations from your real wardrobe, plan trip packing lists, and track how you actually wear your clothes over time.

Built in public. Every phase documented on [YouTube](https://www.youtube.com/playlist?list=PLSv-9lHajHEs).

---

## What it does

**Styling verdict** — Upload outfit images, describe the occasion, and get a Gemini vision verdict on whether the outfit works, what is clashing, and how confident the AI is.

**Outfit generator** — Build full outfits from your existing wardrobe given an occasion and formality level. The styling service uses a backtracking constraint-satisfaction algorithm plus a weighted compatibility graph before the worker reranks the strongest candidates with Gemini vision.

**Trip packing list** — Add a trip with multiple events. The planner builds a formality- and season-aware capsule that assigns complementary pieces per event (dress/top/bottom/shoes/bag/outerwear) and tops it up with daywear for the days the trip spans.

**Social feed** — Share outfits before you leave the house. Friends vote and comment. Saved outfits are persisted server-side and embedded in the share payload, so the full look (slideshow + AI verdict) renders for every viewer — not just the poster.

**Analytics dashboard** — Cost-per-wear, wear frequency over time, color distribution, category breakdown. All computed from real wear logs, not manual counters.

**Complete the look** — RAG-powered suggestions for what to buy when your wardrobe is missing a piece for an occasion.

**Notifications worker** — BullMQ worker that deduplicates reminder notifications with Redis so the same alert is not sent twice inside the one-hour dedupe window.

---

## Architecture

Charis is split into four services:

| Service            | Framework            | Owns                                                           |
| ------------------ | -------------------- | -------------------------------------------------------------- |
| `backend/`         | Django + DRF         | Auth, Wardrobe, Trip Planner, Social, Analytics, Style Advisor |
| `styling-service/` | DolphJS (Spring OOP) | Occasions, Outfits, Verdict, Combo generation                  |
| `job-worker/`      | Node + BullMQ        | Async jobs: image tagging, verdict, combos, notifications      |
| `frontend/`        | Next.js (React)      | All UI                                                         |

Shared infrastructure: **Postgres** · **Redis**

### Why this split

Django owns the data backbone: wardrobe items, wear logs, trips, social records, analytics summaries, and the style-advisor output that needs to be persisted.

DolphJS owns the outfit intelligence layer: occasions, outfit verdicts, combo generation, and the internal endpoints the worker calls back into.

The job-worker exists because AI calls are slow. Neither Django nor DolphJS blocks on them. They enqueue work to Redis, the worker processes it asynchronously, and then patches the result back into the owning service.

```
frontend
  → POST /styling/verdict/  (DolphJS)
    → creates Outfit record (status: pending)
    → pushes job to Redis
    → returns { outfitId, status: "processing" }

frontend polls GET /styling/outfits/:id/status/

job-worker
  → picks up the job
  → calls AI (Groq / Gemini)
  → PATCH /styling/outfits/:id/complete  (internal)
  → DolphJS updates record

frontend poll resolves → renders verdict
```

The worker side also includes a notifications queue that deduplicates repeated reminders using a Redis key with a one-hour expiry.

---

## Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Core backend    | Python · Django · Django REST Framework |
| Styling service | TypeScript · DolphJS · TypeORM          |
| Async jobs      | Node · BullMQ · Redis                   |
| Frontend        | Next.js · React · TypeScript           |
| Animations      | Framer Motion                           |
| Charts          | Recharts                                |
| Database        | PostgreSQL                              |
| Image storage   | Cloudinary                              |
| AI              | Groq / Gemini Vision                    |
| RAG             | Gemini File Store + retrieved style chunks |
| Containers      | Docker · Docker Compose                 |

---

## DSA in the codebase

This project uses real algorithms for real product reasons — not leetcode exercises bolted on for the sake of it.

| Algorithm                         | Location                                                       | Why                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Backtracking + constraint pruning | `styling-service/src/components/combos/combos.algorithms.ts`   | Generates valid outfit combos from N wardrobe items without brute-forcing every permutation                             |
| Weighted graph scoring            | `styling-service/src/components/verdict/verdict.algorithms.ts` | Models color/formality compatibility as weighted edges; combo score = traversal over that graph                         |
| Greedy set-cover approximation    | `backend/apps/tripplanner/algorithms.py`                       | Builds a formality/season-aware capsule: complementary pieces per event plus daywear for the trip duration |
| Sliding window aggregation        | `backend/apps/analytics/aggregations.py`                       | Computes wear frequency within a time window without a full table scan                                                  |

---

## Project structure

```
charis/
├── docker-compose.yml
├── .env.example
├── architecture.md
├── backend/                        # Django
│   ├── config/                     # settings, urls, asgi, wsgi
│   ├── common/                     # queue client, permissions, pagination
│   └── apps/
│       ├── accounts/               # Custom User model
│       ├── wardrobe/               # WardrobeItem, WearLog, Season
│       ├── tripplanner/            # Trip, TripEvent, PackingList (+ algorithms.py)
│       ├── social/                 # OutfitShare, Comment, Vote
│       ├── analytics/              # Aggregations (no new models)
│       ├── styleadvisor/           # RAG: StyleKnowledgeChunk, ShoppingSuggestion
│       ├── knowledge/              # curated fashion knowledge (*.md, ingested via command)
│       └── outfits/                # Outfit (saved outfit snapshots, CRUD)
├── styling-service/                # DolphJS (Clean Architecture)
│   ├── src/
│   │   ├── server.ts               # bootstrap
│   │   ├── application/            # use-cases, dtos, mappers
│   │   ├── domain/                 # entities, value-objects, aggregates, repositories
│   │   ├── infrastructure/         # TypeORM database, BullMQ queue (redis.ts)
│   │   ├── presentation/http/      # controllers + components (routes)
│   │   └── shared/                 # auth guard, decorators, filters
├── job-worker/                     # BullMQ
│   └── src/
│       ├── index.ts                # starts all workers
│       ├── queues/                 # tagging · verdict · combo
│       ├── processors/             # one processor per queue
│       ├── notifications/          # deduplicated notification delivery
│       └── shared/                 # redis connection + worker options
└── frontend/                       # Next.js (App Router)
    └── src/
        ├── app/                    # pages: page, wardrobe, styling, outfits,
        │                           #       trips, social, analytics, advisor, settings
        ├── api/                    # client + per-service API modules
        ├── components/             # layout, ui, outfits (shared components)
        ├── lib/                    # types, auth + toast contexts
        └── data/                   # static data
```

---

## Design system

The frontend is styled with Tailwind CSS v4 using a bespoke editorial theme. The two typefaces and core palette are defined once in `frontend/src/app/globals.css` under `@theme`:

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

---

## Running locally

> Prerequisites: Docker, Node 18+, Python 3.11+

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/charis.git
cd charis

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start infrastructure (Postgres + Redis)
docker compose up postgres redis

# 4. Run Django backend
cd backend
python -m venv venv && source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# 5. Run DolphJS styling service
cd ../styling-service
npm install
npm run build
npm run dev:start

# 6. Run job worker
cd ../job-worker
npm install
npm run dev

# 7. Run frontend
cd ../frontend
npm install
npm run dev
```

---

## Environment variables

```env
# Postgres
POSTGRES_DB=charis
POSTGRES_USER=
POSTGRES_PASSWORD=
DATABASE_URL=postgresql://user:password@localhost:5432/charis

# Redis
REDIS_URL=redis://localhost:6379

# Django
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_DB_SCHEMA=django

# DolphJS styling service
JWT_SECRET=              # same secret as Django — verified on both sides
STYLING_SERVICE_URL=http://styling-service:3300
STYLING_SERVICE_PORT=3300
DATABASE_SCHEMA=styling_service
INTERNAL_API_KEY=        # shared secret between job-worker and services

# AI
GROQ_API_KEY=
GEMINI_API_KEY=
# Optional: server-side Gemini File Search Store resource name (e.g. fileSearchStores/abc123).
# When unset, the Style Advisor creates one store with display name "charis-style-knowledge" and reuses it.
GEMINI_RAG_STORE=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google File Store (RAG)
GOOGLE_APPLICATION_CREDENTIALS=
```

---

## Phases

- [x] Phase 0 — Setup, Docker, DolphJS spike
- [x] Phase 1 — Wardrobe context (Django)
- [x] Phase 2 — Styling engine + combo algorithm (DolphJS)
- [x] Phase 3 — Redis + BullMQ job queue
- [x] Phase 4 — Trip planner + greedy packing list
- [x] Phase 5 — Social context
- [x] Phase 6 — Analytics dashboard (Recharts)
- [x] Phase 7 — Complete the look (RAG)
- [x] Phase 8 — Frontend (React + Framer Motion)
- [x] Phase 9 — Deploy

---

## YouTube series

Building this fully in public — one video per completed phase.

[Charis playlist](https://www.youtube.com/playlist?list=PLSv-9lHajHEs)

---

## API docs

- [Backend API](backend/API.md)
- [Styling service API](styling-service/API.md)

---

## Author

Michelle — [@michvista09](https://twitter.com/Michvista09)
