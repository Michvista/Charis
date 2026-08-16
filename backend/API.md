# Charis Backend API

Base URL: `http://localhost:8000/api`

Authentication uses JWT unless the endpoint is public. Most private routes expect:

`Authorization: Bearer <access_token>`

## Auth

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `GET` | `/auth/health/` | Simple health check for the Django service. | Public |
| `POST` | `/auth/register/` | Creates a new user and returns profile data plus JWT access/refresh tokens. | Public |
| `POST` | `/auth/login/` | Logs a user in and returns JWT access/refresh tokens plus the profile payload. | Public |
| `POST` | `/auth/token/refresh/` | Exchanges a refresh token for a new access token. | Public |
| `POST` | `/auth/logout/` | Blacklists the provided refresh token. | Authenticated |
| `GET` | `/auth/profile/` | Returns the authenticated user profile. | Authenticated |
| `PATCH` | `/auth/profile/` | Updates the authenticated user profile. | Authenticated |

## Wardrobe

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `GET` | `/wardrobe/items/` | Lists the current user's wardrobe items. | Authenticated |
| `POST` | `/wardrobe/items/` | Creates a wardrobe item, optionally uploads an image, and can enqueue image tagging. | Authenticated |
| `GET` | `/wardrobe/items/{id}/` | Returns one wardrobe item owned by the current user. | Authenticated |
| `PUT` | `/wardrobe/items/{id}/` | Replaces a wardrobe item. | Authenticated |
| `PATCH` | `/wardrobe/items/{id}/` | Partially updates a wardrobe item. | Authenticated |
| `DELETE` | `/wardrobe/items/{id}/` | Deletes a wardrobe item. | Authenticated |
| `POST` | `/wardrobe/items/{id}/wear/` | Creates a wear log entry and increments `times_worn` atomically. Optional `outfit_id` links the wear log to a styling-service outfit. | Authenticated |
| `GET` | `/wardrobe/wear-logs/` | Lists the current user's wear history. | Authenticated |
| `GET` | `/wardrobe/wear-logs/{id}/` | Returns one wear log and, when available, outfit analytics from styling-service. | Authenticated |

## Trip Planner

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `GET` | `/tripplanner/trips/` | Lists the current user's trips. | Authenticated |
| `POST` | `/tripplanner/trips/` | Creates a trip for the authenticated user. | Authenticated |
| `GET` | `/tripplanner/trips/{id}/` | Returns one trip and its nested events / packing lists. | Authenticated |
| `PATCH` | `/tripplanner/trips/{id}/` | Updates a trip. | Authenticated |
| `DELETE` | `/tripplanner/trips/{id}/` | Deletes a trip. | Authenticated |
| `POST` | `/tripplanner/trips/{id}/generate-packing-list/` | Runs the greedy packing-list algorithm and creates a packing list for the trip. | Authenticated |
| `GET` | `/tripplanner/trips/{trip_id}/events/` | Lists events for one trip. | Authenticated |
| `POST` | `/tripplanner/trips/{trip_id}/events/` | Creates an event attached to a trip. | Authenticated |
| `GET` | `/tripplanner/trips/{trip_id}/events/{id}/` | Returns one trip event. | Authenticated |
| `PUT` | `/tripplanner/trips/{trip_id}/events/{id}/` | Replaces a trip event. | Authenticated |
| `PATCH` | `/tripplanner/trips/{trip_id}/events/{id}/` | Partially updates a trip event. | Authenticated |
| `DELETE` | `/tripplanner/trips/{trip_id}/events/{id}/` | Deletes a trip event. | Authenticated |

## Social

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `GET` | `/social/feed/` | Returns the public/friends feed of outfit shares. | Authenticated |
| `GET` | `/social/shares/` | Lists outfit shares visible in the system. | Authenticated |
| `POST` | `/social/shares/` | Creates a new outfit share for the authenticated user. | Authenticated |
| `GET` | `/social/shares/{id}/` | Returns one outfit share with comments and votes. | Authenticated |
| `PATCH` | `/social/shares/{id}/` | Updates a share such as caption or visibility. | Authenticated |
| `DELETE` | `/social/shares/{id}/` | Deletes a share. | Authenticated |
| `POST` | `/social/shares/{id}/comments/` | Adds a comment to a share. | Authenticated |
| `POST` | `/social/shares/{id}/vote/` | Upvotes or downvotes a share. Replaces the current user's previous vote if one exists. | Authenticated |

## Analytics

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `GET` | `/analytics/overview/` | Returns wardrobe analytics: wear frequency, category breakdown, color distribution, and cost-per-wear. Optional `start` and `end` query params accept ISO dates. | Authenticated |

## Style Advisor

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `POST` | `/styleadvisor/knowledge/` | Admin-only upload endpoint for curated style knowledge chunks that back the RAG flow. | Admin |
| `POST` | `/styleadvisor/complete/` | Runs retrieval + Gemini generation to suggest missing items for an outfit or occasion. Saves shopping suggestions for the current user. | Authenticated |

## Notes

- Cross-service outfit references are UUIDs, not database foreign keys.
- Wear logs update `times_worn` in the same transaction as the log write.
- The style advisor uses a RAG flow: retrieve relevant style rules first, then ask Gemini to generate grounded suggestions.
- Styling-service and job-worker use the internal API key for trusted service-to-service calls.
