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

### Auth examples

`POST /auth/register/`

Request:
```json
{
  "email": "editor@example.com",
  "username": "editorial",
  "password": "Password123!",
  "password_confirm": "Password123!",
  "bio": "Curating a wardrobe OS with editorial precision."
}
```

Response:
```json
{
  "user": {
    "id": "63f9cf6e-74bb-49cd-be01-0a680b474028",
    "username": "editorial",
    "email": "editor@example.com",
    "bio": "Curating a wardrobe OS with editorial precision.",
    "avatar_url": null,
    "created_at": "2026-08-16T23:14:26.140286Z",
    "updated_at": "2026-08-16T23:14:26.140351Z"
  },
  "tokens": {
    "access": "<access_token>",
    "refresh": "<refresh_token>"
  }
}
```

`POST /auth/login/`

Request:
```json
{
  "email": "editor@example.com",
  "password": "Password123!"
}
```

Response:
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>",
  "user": {
    "id": "63f9cf6e-74bb-49cd-be01-0a680b474028",
    "username": "editorial",
    "email": "editor@example.com",
    "bio": "Curating a wardrobe OS with editorial precision.",
    "avatar_url": null
  }
}
```

`GET /auth/profile/`

Response:
```json
{
  "id": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "username": "editorial",
  "email": "editor@example.com",
  "bio": "Curating a wardrobe OS with editorial precision.",
  "avatar_url": null
}
```

`PATCH /auth/profile/`

Request:
```json
{
  "bio": "Building Charis with a capsule wardrobe mindset."
}
```

Response:
```json
{
  "id": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "username": "editorial",
  "email": "editor@example.com",
  "bio": "Building Charis with a capsule wardrobe mindset.",
  "avatar_url": null
}
```

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

### Wardrobe examples

`POST /wardrobe/items/`

Request:
```json
{
  "name": "White Oxford Shirt",
  "category": "top",
  "primary_color": "white",
  "secondary_color": null,
  "fabric": "cotton",
  "formality_level": 3,
  "brand": "Charis House",
  "purchase_price": "180.00",
  "purchase_date": "2024-05-02",
  "season_ids": [1]
}
```

Response:
```json
{
  "id": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
  "user": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "name": "White Oxford Shirt",
  "category": "top",
  "primary_color": "white",
  "secondary_color": null,
  "fabric": "cotton",
  "formality_level": 3,
  "seasons": [
    {
      "id": 1,
      "name": "spring"
    }
  ],
  "brand": "Charis House",
  "image_url": "https://example.com/uploads/shirt.jpg",
  "tagging_status": "pending",
  "times_worn": 0,
  "purchase_price": "180.00",
  "purchase_date": "2024-05-02",
  "created_at": "2026-08-16T23:15:03.000000Z",
  "updated_at": "2026-08-16T23:15:03.000000Z"
}
```

`POST /wardrobe/items/{id}/wear/`

Request:
```json
{
  "outfit_id": "73187852-76ad-458c-80a6-b2a2d1f0b065"
}
```

Response:
```json
{
  "message": "Wear log created successfully.",
  "wear_log_id": "f9aa3a43-6455-4781-82af-927a4f8ec511",
  "outfit_id": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "worn_date": "2026-08-17"
}
```

`GET /wardrobe/wear-logs/`

Response:
```json
[
  {
    "id": "f9aa3a43-6455-4781-82af-927a4f8ec511",
    "wardrobe_item": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
    "wardrobe_item_name": "White Oxford Shirt",
    "outfit_id": "73187852-76ad-458c-80a6-b2a2d1f0b065",
    "worn_date": "2026-08-17",
    "created_at": "2026-08-17T00:12:11.000000Z"
  }
]
```

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

### Trip planner examples

`POST /tripplanner/trips/`

Request:
```json
{
  "name": "Paris Fashion Week",
  "destination": "Paris, France",
  "start_date": "2026-09-24",
  "end_date": "2026-10-02",
  "description": "Editorial travel capsule"
}
```

Response:
```json
{
  "id": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "user": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "name": "Paris Fashion Week",
  "destination": "Paris, France",
  "start_date": "2026-09-24",
  "end_date": "2026-10-02",
  "description": "Editorial travel capsule",
  "trip_events": [],
  "packing_lists": [],
  "created_at": "2026-08-17T00:00:00.000000Z",
  "updated_at": "2026-08-17T00:00:00.000000Z"
}
```

`POST /tripplanner/trips/{trip_id}/events/`

Request:
```json
{
  "name": "Showroom Visit",
  "date": "2026-09-25",
  "formality_required": 4,
  "location": "Le Marais",
  "notes": "Morning appointment"
}
```

Response:
```json
{
  "id": "1b3f5f4e-4e25-4f3f-8d8c-2ac8f2e3b942",
  "trip": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "name": "Showroom Visit",
  "date": "2026-09-25",
  "formality_required": 4,
  "location": "Le Marais",
  "notes": "Morning appointment",
  "created_at": "2026-08-17T00:00:00.000000Z",
  "updated_at": "2026-08-17T00:00:00.000000Z"
}
```

`POST /tripplanner/trips/{trip_id}/generate-packing-list/`

Response:
```json
{
  "id": "pack-1",
  "trip": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "items": [
    {
      "id": "pack-item-1",
      "wardrobe_item_id": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
      "wardrobe_item_name": "White Oxford Shirt",
      "wardrobe_item_category": "top",
      "covers_event_ids": ["1b3f5f4e-4e25-4f3f-8d8c-2ac8f2e3b942"],
      "created_at": "2026-08-17T00:00:00.000000Z",
      "updated_at": "2026-08-17T00:00:00.000000Z"
    }
  ],
  "created_at": "2026-08-17T00:00:00.000000Z",
  "updated_at": "2026-08-17T00:00:00.000000Z"
}
```

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

### Social examples

`POST /social/shares/`

Request:
```json
{
  "outfit_id": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "caption": "Autumn Transition",
  "visibility": "public"
}
```

Response:
```json
{
  "id": "share-1",
  "user": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "user_email": "editor@example.com",
  "outfit_id": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "caption": "Autumn Transition",
  "visibility": "public",
  "shared_at": "2026-08-17T00:00:00.000000Z",
  "vote_count": 0,
  "comment_count": 0,
  "vote_breakdown": {
    "upvotes": 0,
    "downvotes": 0
  },
  "comments": []
}
```

`POST /social/shares/{id}/comments/`

Request:
```json
{
  "text": "Love the silhouette and the palette."
}
```

Response:
```json
{
  "id": "comment-1",
  "share": "share-1",
  "user": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "user_email": "editor@example.com",
  "text": "Love the silhouette and the palette.",
  "created_at": "2026-08-17T00:00:00.000000Z",
  "updated_at": "2026-08-17T00:00:00.000000Z"
}
```

`POST /social/shares/{id}/vote/`

Request:
```json
{
  "value": 1
}
```

Response:
```json
{
  "id": "vote-1",
  "share": "share-1",
  "user": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "value": 1,
  "created_at": "2026-08-17T00:00:00.000000Z",
  "updated_at": "2026-08-17T00:00:00.000000Z"
}
```

`POST /social/friendships/`

Request:
```json
{
  "friend_user_id": "a8e6a7da-2eb2-4c84-9c2e-02d4c7093e9f"
}
```

Response:
```json
{
  "id": "friendship-1",
  "requester": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "requester_email": "editor@example.com",
  "addressee": "a8e6a7da-2eb2-4c84-9c2e-02d4c7093e9f",
  "addressee_email": "friend@example.com",
  "status": "pending",
  "accepted_at": null
}
```

`POST /social/friendships/{id}/accept/`

Response:
```json
{
  "id": "friendship-1",
  "requester": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "requester_email": "editor@example.com",
  "addressee": "a8e6a7da-2eb2-4c84-9c2e-02d4c7093e9f",
  "addressee_email": "friend@example.com",
  "status": "accepted",
  "accepted_at": "2026-08-17T00:00:00.000000Z"
}
```

## Analytics

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `GET` | `/analytics/overview/` | Returns wardrobe analytics: wear frequency, category breakdown, color distribution, and cost-per-wear. Optional `start` and `end` query params accept ISO dates. | Authenticated |

### Analytics example

`GET /analytics/overview/?start=2026-08-01&end=2026-08-31`

Response:
```json
{
  "wear_frequency": [
    { "week": "2026-W30", "count": 6 },
    { "week": "2026-W31", "count": 9 }
  ],
  "category_breakdown": [
    { "category": "top", "count": 26 },
    { "category": "bottom", "count": 14 }
  ],
  "color_distribution": [
    { "color": "camel", "count": 22 },
    { "color": "black", "count": 15 }
  ],
  "cost_per_wear": [
    {
      "item_id": "demo-1",
      "name": "Camel Cashmere Coat",
      "purchase_price": "975.00",
      "times_worn": 24,
      "cost_per_wear": 40.63
    }
  ]
}
```

## Style Advisor

| Method | Route | What it does | Auth |
| --- | --- | --- | --- |
| `POST` | `/styleadvisor/knowledge/` | Admin-only upload endpoint for curated style knowledge chunks that back the RAG flow. | Admin |
| `POST` | `/styleadvisor/complete/` | Runs retrieval + Gemini generation to suggest missing items for an outfit or occasion. Saves shopping suggestions for the current user. | Authenticated |

### Style Advisor examples

`POST /styleadvisor/knowledge/`

Request:
```json
{
  "content": "Linen works best for spring and summer occasions up to smart casual formality level 3.",
  "tags": ["linen", "summer"]
}
```

Response:
```json
{
  "id": "knowledge-1",
  "content": "Linen works best for spring and summer occasions up to smart casual formality level 3.",
  "tags": ["linen", "summer"],
  "created_at": "2026-08-17T00:00:00.000000Z",
  "updated_at": "2026-08-17T00:00:00.000000Z"
}
```

`POST /styleadvisor/complete/`

Request:
```json
{
  "occasion_description": "Formal dinner at a gallery opening",
  "occasion_formality": 4,
  "current_item_descriptions": [
    "white oxford shirt",
    "navy trouser",
    "black shoes"
  ],
  "occasion_id": "82c616d5-a23d-4e22-8699-1832863ee64d"
}
```

Response:
```json
{
  "suggestions": [
    {
      "id": "8c1908cd-76dd-4069-ad20-bd5d69080415",
      "user": "63f9cf6e-74bb-49cd-be01-0a680b474028",
      "occasion_id": null,
      "occasion_description": "Formal dinner at a gallery opening",
      "item_description": "Navy Blazer or Suit Jacket",
      "reason": "A formal dinner and gallery opening absolutely requires a jacket.",
      "priority": "high",
      "created_at": "2026-08-17T00:00:00.000000Z",
      "updated_at": "2026-08-17T00:00:00.000000Z"
    }
  ]
}
```

## Notes

- Cross-service outfit references are UUIDs, not database foreign keys.
- Wear logs update `times_worn` in the same transaction as the log write.
- The style advisor uses a RAG flow: retrieve relevant style rules first, then ask Gemini to generate grounded suggestions.
- Styling-service and job-worker use the internal API key for trusted service-to-service calls.

## Postman Flow

If you want to smoke-test the whole stack in Postman, run the requests in this order:

1. `POST /auth/register/` or `POST /auth/login/`
1. Copy the returned `access` token into `Authorization: Bearer <access_token>`
1. `GET /auth/profile/`
1. `POST /wardrobe/items/`
1. `POST /wardrobe/items/{id}/wear/`
1. `GET /wardrobe/wear-logs/`
1. `GET /analytics/overview/`
1. `POST /tripplanner/trips/`
1. `POST /tripplanner/trips/{trip_id}/events/`
1. `POST /tripplanner/trips/{trip_id}/generate-packing-list/`
1. `POST /styleadvisor/knowledge/` if you are seeding RAG content as an admin
1. `POST /styleadvisor/complete/`
1. Switch to the styling service and call `POST /occasions`
1. `POST /combos`
1. `GET /verdict/{id}` until the job worker has finished

Practical notes:

- Django routes use `http://localhost:8000/api`
- Styling-service routes use `http://localhost:3000`
- The styling-service also accepts the internal service token for worker callbacks
- For multipart wardrobe uploads, send the image as form-data and keep the rest of the fields in the same request
