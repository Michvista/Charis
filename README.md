# Charis

Charis is a modular fashion intelligence platform built as a multi-service prototype. It combines a Django backend for user, wardrobe, trip, social, and analytics data with a separate DolphJS styling microservice for outfit intelligence, plus a Node-based queue worker for async AI and notification jobs.

## Why Charis

This project is designed to showcase:
- a **clean service boundary** between data persistence and intelligence
- a **modern web frontend** using React, Vite, Framer Motion, and Recharts
- a **realistic async architecture** with Redis/BullMQ job queues
- an **AI-driven styling layer** that can evolve independently of the core app

## Service Map

| Service | Framework | Language | Owns | Port |
|---|---|---|---|---|
| `backend/` | Django + DRF | Python | Auth, Wardrobe, Trip Planner, Social, Analytics, Style Advisor | 8000 |
| `styling-service/` | DolphJS + Prisma | TypeScript | Occasions, Outfits, Verdict, Combo generation | 3000 |
| `job-worker/` | Node + BullMQ | TypeScript | Async jobs (tagging, combos, verdict, notifications) | — |
| `frontend/` | React + Vite | TypeScript | UI, motion, dashboards, user flows | 5173 |

## Architecture Overview

The project is intentionally split into bounded contexts:

- `backend/`: Django owns all core domain data and API surfaces for wardrobe, trips, social, analytics, and knowledge retrieval.
- `styling-service/`: DolphJS owns the intelligence layer and Prisma models for occasions, outfit generation, and verdict scoring.
- `job-worker/`: Node workers process slow or AI-heavy tasks asynchronously and update services through internal API callbacks.
- `frontend/`: React UI consumes both Django and DolphJS APIs to provide a seamless experience.

## Key Cross-Service Rules

1. No shared database between Django and DolphJS. They may use the same Postgres instance, but use separate schemas and exchange IDs as plain UUID strings.
2. DolphJS validates Django JWTs so authentication is shared without duplicating login logic.
3. `job-worker` writes back only through HTTP API callbacks, never by direct DB access.
4. Frontend uses separate service targets: Django for data core, DolphJS for styling intelligence.

## Example Data Flow: Outfit Verdict

1. Frontend calls `POST /styling/verdict/` on the DolphJS service.
2. DolphJS validates the request and creates an `Outfit` record with `status: pending`.
3. The request returns `{ outfitId, status: "processing" }`.
4. A verdict job is queued in Redis.
5. `job-worker` picks the job, calls the AI provider, and then PATCHes the DolphJS callback endpoint to complete the outfit.
6. Frontend polls `GET /styling/outfits/:id/status/` until the verdict is ready.

## Project Flow and Phase Planning

This repository is well-suited for a phased build and content plan.

### Development Rhythm

- **DSA practice**: 20–30 minutes per day, separate from the project.
  - Keep your algorithm practice outside the codebase.
  - Use it to sharpen reasoning and problem-solving, not to directly implement project features.
- **YouTube content**: one video per completed phase, not per code change.
  - Build a clear episode arc around completed milestones.
  - This creates stronger storytelling and avoids fragmenting progress into too many micro-episodes.

### Suggested Phase Structure

1. **Phase 1 — Core data and wardrobe model**
   - Django user/auth
   - Wardrobe CRUD and image tagging pipeline
   - Basic frontend wardrobe experience
2. **Phase 2 — Styling intelligence**
   - DolphJS outfit/occasion models
   - Combo generation and outfit verdict flow
   - Async job orchestration with Redis/BullMQ
3. **Phase 3 — Analytics and trip planning**
   - Wear frequency, cost-per-wear, and category dashboards
   - Trip packing and suggested outfits
4. **Phase 4 — Social and personalization**
   - Outfit sharing, comments, votes
   - Style advisor knowledge retrieval
   - Notifications and user engagement flow

## Alternative Big-Project Idea

If you want a second option before locking in the final portfolio project, consider a **Campus Marketplace + Services Platform**. It maps to the same architecture but in a different domain:

- Marketplace — student items, services, tutoring
- Logistics/Matching — buyer/seller/runner routing and matching
- Escrow/Payments — hold funds until delivery confirmed
- Chat — buyer-seller negotiation
- Notifications — DolphJS-powered delivery status alerts
- Analytics — seller dashboards with Recharts
- Support RAG — FAQ/help bot retrieval

This alternative offers a stronger DSA story on matching and routing, while Charis offers a stronger visual and product demo for fashion AI.

## Why Charis Still Makes Great Portfolio Sense

- Fashion intelligence is easy to demo with visual results.
- The service split is a strong technical story.
- You can show a real app with both a data-backed backend and a separate AI/microservice intelligence layer.
- The design is recruiter-friendly and can still include deep algorithmic work behind the scenes.

## Repo Structure

- `backend/`: Django app modules, REST APIs, queue client, domain services
- `frontend/`: React UI, feature-based pages, API clients
- `job-worker/`: BullMQ queues and workers for async processing
- `styling-service/`: DolphinJS styling/AI service with Prisma models

## Notes

This README is meant as a reference summary and content planning guide. Keep the codebase and the DSA practice separate, and use completed milestones as the natural units for YouTube episodes.
