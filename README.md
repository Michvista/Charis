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

## Repo Structure

- `backend/`: Django app modules, REST APIs, queue client, domain services
- `frontend/`: React UI, feature-based pages, API clients
- `job-worker/`: BullMQ queues and workers for async processing
- `styling-service/`: DolphinJS styling/AI service with Prisma models

