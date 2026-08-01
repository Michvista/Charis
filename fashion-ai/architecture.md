# Fashion AI — Architecture

This describes what goes in each empty file in the skeleton. No implementation here on purpose — fill these in yourself as you build each phase.

## Services
- **backend/** — Django. System of record: wardrobe, styling, trip planner, social, analytics, style advisor (RAG). Owns Postgres.
- **notification-service/** — DolphJS + Prisma. Isolated service for weather/reminder notifications. Owns its own small DB (or schema).
- **job-worker/** — Node + BullMQ. Processes async jobs enqueued by Django (image tagging, combo generation) so the API never blocks on slow AI calls.
- **frontend/** — React + Framer Motion + Recharts.
- **docker-compose.yml** — wires Postgres, Redis, backend, notification-service, job-worker, frontend together for local dev.

Data flow for a slow op (e.g. tagging a new wardrobe item):
`frontend → Django (creates WardrobeItem, status=pending) → enqueues job in Redis → job-worker picks it up → calls vision AI → calls back to Django API to update the item → frontend polls/gets notified`

---

## Models per context

### `backend/apps/wardrobe/models.py`
- **WardrobeItem** — `user`, `name`, `category` (top/bottom/shoes/outerwear/accessory), `primary_color`, `secondary_color`, `fabric`, `formality_level` (int scale, e.g. 1-5), `season` (multi: spring/summer/fall/winter), `image_url`, `times_worn`, `purchase_price`, `purchase_date`, `tagging_status` (pending/done/failed), `created_at`, `updated_at`
- **WearLog** — `wardrobe_item` (FK), `worn_date` — one row per time an item is worn; analytics aggregates from this, not from a counter, so you can do time-window queries later

### `backend/apps/styling/models.py`
- **Occasion** — `user`, `name`, `date`, `formality_required`, `weather_snapshot` (nullable)
- **Outfit** — `user`, `occasion` (FK, nullable), `name`, `compatibility_score`, `created_at`
- **OutfitItem** — through table: `outfit` (FK), `wardrobe_item` (FK), `role` (top/bottom/shoes/accessory)

`algorithms.py` — backtracking/constraint-satisfaction combo generator lives here, isolated from views so it's independently testable.
`services.py` — orchestration: calls algorithms.py, persists results, triggers the queue job if needed.

### `backend/apps/tripplanner/models.py`
- **Trip** — `user`, `name`, `start_date`, `end_date`, `destination`
- **TripEvent** — `trip` (FK), `name`, `date`, `formality_required`, `weather_expected`
- **PackingList** — `trip` (FK), `generated_at`
- **PackingListItem** — `packing_list` (FK), `wardrobe_item` (FK), `covers_event_ids` (JSON list)

`algorithms.py` — greedy set-cover approximation lives here.

### `backend/apps/social/models.py`
- **OutfitShare** — `outfit` (FK), `user`, `shared_at`, `visibility`
- **Comment** — `outfit_share` (FK), `user`, `text`, `created_at`
- **Vote** — `outfit_share` (FK), `user`, `value`

### `backend/apps/analytics/models.py`
- Mostly reads from `WearLog` + `WardrobeItem` — you may not need new models here at all initially. If you want cached/precomputed stats: **WardrobeStatSnapshot** — `user`, `period_start`, `period_end`, `stats_json`, `generated_at`.

`aggregations.py` — sliding-window/frequency-counting logic feeding the Recharts dashboard.

### `backend/apps/styleadvisor/models.py` (RAG — Complete the Look)
- **StyleKnowledgeChunk** — `source`, `content`, `tags` (if you keep a local copy alongside your Google file store reference)
- **ShoppingSuggestion** — `user`, `occasion` (FK, nullable), `suggested_item_description`, `reason`

`retriever.py` — query logic against your chosen retrieval store.

### `notification-service/prisma/schema.prisma`
- **NotificationPreference** — `userId`, `channel`, `quietHoursStart`, `quietHoursEnd`
- **NotificationLog** — `userId`, `type`, `payload`, `sentAt`, `dedupeKey` (this is your debounce key)
- **WeatherSnapshot** — `location`, `condition`, `capturedAt`

---

## Folder Tree
```
fashion-ai/
├── docker-compose.yml
├── .env.example
├── architecture.md
├── backend/                        # Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/                     # settings, urls, asgi, wsgi
│   ├── common/                     # queue_client.py, permissions.py
│   └── apps/
│       ├── wardrobe/
│       ├── styling/                # + algorithms.py, services.py
│       ├── tripplanner/            # + algorithms.py
│       ├── social/
│       ├── analytics/              # + aggregations.py
│       └── styleadvisor/           # + retriever.py
├── notification-service/           # DolphJS
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/
│       ├── modules/notifications/
│       └── jobs/notification.worker.ts
├── job-worker/                     # BullMQ
│   └── src/
│       ├── queues/
│       └── processors/
└── frontend/                       # React + Framer Motion + Recharts
    └── src/
        ├── api/
        ├── features/                # wardrobe, styling, tripplanner, social, analytics
        └── components/
```

---

## Phase 0 Checklist

**1. DolphJS spike (throwaway, outside this repo)**
- `npm install -g @dolphjs/cli`
- `dolph create-app spike-app`
- Build one fake CRUD route end to end, look at how `catchAsync` and middleware are structured
- Note friction: anything underdocumented, anything that breaks the CLI defaults
- Delete the spike once you've got a feel for the patterns — don't carry it into the real repo

**2. Repo skeleton**
- Already scaffolded (this zip). `git init`, first commit as-is before writing any code — gives you a clean "structure" commit to diff against later.

**3. Docker Compose skeleton**
- Fill in `docker-compose.yml` with services: `postgres`, `redis`, `backend`, `notification-service`, `job-worker`. Get Postgres + Redis up first and confirm both are reachable before wiring any app code to them.

**4. Decide RAG storage** (you leaned Google file store) — confirm that before `styleadvisor/retriever.py` exists for real, since it shapes how `StyleKnowledgeChunk` is used (cached locally vs. pure remote lookup).
