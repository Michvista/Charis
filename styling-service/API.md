# Charis Styling Service API

Base URL in Docker: `http://localhost:3000`

The styling-service is protected by a DolphJS auth shield. It accepts either:

- a user JWT signed with `JWT_SECRET`, or
- the shared internal service token in `Authorization: Bearer <INTERNAL_API_KEY>`

## Occasions

| Method | Route | What it does |
| --- | --- | --- |
| `POST` | `/occasions` | Creates a new occasion record with its formality level. This is the source of truth for styling requests that need occasion-based scoring. |
| `GET` | `/occasions` | Lists the available occasions. |

## Combos

| Method | Route | What it does |
| --- | --- | --- |
| `POST` | `/combos` | Enqueues combo generation for the authenticated user. The job-worker later calls back with ranked combinations. |
| `POST` | `/combos/generate-sync` | Internal route used by the job-worker. Runs the backtracking combo generator synchronously and returns candidate outfits immediately. |

## Verdict

| Method | Route | What it does |
| --- | --- | --- |
| `POST` | `/verdict` | Enqueues an AI verdict job for an outfit. The worker later calls Gemini vision and patches the completed result back. |
| `PATCH` | `/verdict/{id}/complete` | Internal route used by the worker to store completed verdict or combo results, or mark the outfit as failed. |
| `GET` | `/verdict/{id}` | Returns a single outfit. Normal users can only read outfits they own; internal service calls can read any outfit. |

## Notes

- `generate-sync` and `complete` are internal workflow routes, not public user actions.
- The combo flow uses a role-level weighted compatibility graph plus backtracking.
- The verdict flow uses Gemini vision to rerank or validate outfit image combinations.
- The service intentionally keeps UUID references to cross-service records instead of database foreign keys.
