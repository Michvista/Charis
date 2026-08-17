# Charis Frontend API Guide

Base app URL in local development: `http://localhost:5173`

The frontend does not own the business logic. It is a React + Next.js client that calls:

- Django backend at `http://localhost:8000/api`
- Styling-service at `http://localhost:3000`

The app reads these environment variables:

- `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api`
- `NEXT_PUBLIC_STYLING_URL=http://localhost:3300`

## Session Flow

The frontend stores the logged-in session in local storage and reuses the JWT access token for all private requests.

### Login

Request sent by the UI:
```json
{
  "username": "editor@example.com",
  "password": "Password123!"
}
```

Response expected by the UI:
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>",
  "user": {
    "id": "63f9cf6e-74bb-49cd-be01-0a680b474028",
    "username": "editorial",
    "email": "editor@example.com"
  }
}
```

### Register

Request sent by the UI:
```json
{
  "email": "editor@example.com",
  "username": "editorial",
  "password": "Password123!",
  "password_confirm": "Password123!"
}
```

Response expected by the UI:
```json
{
  "user": {
    "id": "63f9cf6e-74bb-49cd-be01-0a680b474028",
    "username": "editorial",
    "email": "editor@example.com"
  },
  "tokens": {
    "access": "<access_token>",
    "refresh": "<refresh_token>"
  }
}
```

## Page Map

| Page | Uses | Purpose |
| --- | --- | --- |
| `/login` | `POST /auth/login/`, `POST /auth/register/` | Authentication entry point |
| `/wardrobe` | `GET /wardrobe/items/`, `POST /wardrobe/items/`, `PATCH /wardrobe/items/{id}/`, `DELETE /wardrobe/items/{id}/`, `POST /wardrobe/items/{id}/wear/` | Closet management |
| `/styling` | `GET /wardrobe/items/`, `GET /styling/occasions/`, `POST /styling/combos/generate/`, `GET /styling/outfits/{id}/verdict/` | Outfit building and verdict viewing |
| `/trips` | `GET /tripplanner/trips/`, `POST /tripplanner/trips/`, `POST /tripplanner/trips/{id}/generate-packing-list/`, `POST /tripplanner/trips/{trip_id}/events/` | Trip planning |
| `/social` | `GET /social/feed/`, `GET /social/shares/`, `POST /social/shares/`, `POST /social/shares/{id}/comments/`, `POST /social/shares/{id}/vote/`, `GET /social/friendships/` | Community feed and friendships |
| `/analytics` | `GET /analytics/overview/` | Charts and wardrobe intelligence |
| `/advisor` | `POST /styleadvisor/complete/` | RAG-powered outfit completion |

## Wardrobe Page

The wardrobe page is powered by the Django wardrobe endpoints.

### List items

Request:
```http
GET /wardrobe/items/
Authorization: Bearer <access_token>
```

Response:
```json
[
  {
    "id": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
    "name": "White Oxford Shirt",
    "category": "top",
    "primary_color": "white",
    "image_url": "https://example.com/uploads/shirt.jpg",
    "times_worn": 2
  }
]
```

### Create item

Request:
```http
POST /wardrobe/items/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

Form fields:
```json
{
  "name": "White Oxford Shirt",
  "category": "top",
  "primary_color": "white",
  "formality_level": 3,
  "brand": "Charis House",
  "image": "<file>"
}
```

Response:
```json
{
  "id": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
  "name": "White Oxford Shirt",
  "category": "top",
  "primary_color": "white",
  "image_url": "https://example.com/uploads/shirt.jpg",
  "tagging_status": "pending"
}
```

## Styling Page

The styling page talks to both the wardrobe data and the styling service.

### Load wardrobe options

Request:
```http
GET /wardrobe/items/
Authorization: Bearer <access_token>
```

### Load occasions

Request:
```http
GET http://localhost:3300/styling/occasions/
Authorization: Bearer <access_token>
```

Response:
```json
[
  {
    "id": "82c616d5-a23d-4e22-8699-1832863ee64d",
    "name": "Formal Dinner",
    "formalityLevel": 4
  }
]
```

### Generate combos

Request:
```http
POST http://localhost:3300/styling/combos/generate/
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:
```json
{
  "occasionId": "82c616d5-a23d-4e22-8699-1832863ee64d",
  "targetSeason": "summer",
  "items": [
    {
      "wardrobeItemId": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
      "itemRole": "top",
      "imageUrl": "https://example.com/shirt.jpg"
    }
  ]
}
```

Response:
```json
{
  "outfitId": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "status": "processing"
}
```

### Fetch verdict

Request:
```http
GET http://localhost:3300/styling/outfits/b81319eb-ad50-4757-8948-def4cf537d3a/verdict/
Authorization: Bearer <access_token>
```

Response:
```json
{
  "outfitId": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "status": "done",
  "score": 57.5,
  "verdictText": "This outfit is far too casual for a formal dinner."
}
```

## Trips Page

### Create trip

Request:
```http
POST /tripplanner/trips/
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:
```json
{
  "name": "Paris Fashion Week",
  "destination": "Paris, France",
  "start_date": "2026-09-24",
  "end_date": "2026-10-02"
}
```

Response:
```json
{
  "id": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "name": "Paris Fashion Week",
  "destination": "Paris, France",
  "trip_events": [],
  "packing_lists": []
}
```

### Generate packing list

Request:
```http
POST /tripplanner/trips/b81319eb-ad50-4757-8948-def4cf537d3a/generate-packing-list/
Authorization: Bearer <access_token>
```

Response:
```json
{
  "id": "pack-1",
  "trip": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "items": []
}
```

## Social Page

### Create share

Request:
```http
POST /social/shares/
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:
```json
{
  "outfit_id": "b81319eb-ad50-4757-8948-def4cf537d3a",
  "caption": "Autumn Transition",
  "visibility": "public"
}
```

Response:
```json
{
  "id": "share-1",
  "caption": "Autumn Transition",
  "visibility": "public",
  "vote_count": 0,
  "comment_count": 0
}
```

## Analytics Page

### Load dashboard data

Request:
```http
GET /analytics/overview/
Authorization: Bearer <access_token>
```

Response:
```json
{
  "wear_frequency": [
    { "week": "2026-W30", "count": 6 }
  ],
  "category_breakdown": [
    { "category": "top", "count": 26 }
  ],
  "color_distribution": [
    { "color": "camel", "count": 22 }
  ],
  "cost_per_wear": [
    {
      "item_id": "demo-1",
      "name": "Camel Cashmere Coat",
      "times_worn": 24,
      "cost_per_wear": 40.63
    }
  ]
}
```

## Advisor Page

### Request style suggestion completion

Request:
```http
POST /styleadvisor/complete/
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:
```json
{
  "occasion_description": "Formal dinner at a gallery opening",
  "occasion_formality": 4,
  "current_item_descriptions": [
    "white oxford shirt",
    "navy trouser",
    "black shoes"
  ]
}
```

Response:
```json
{
  "suggestions": [
    {
      "id": "8c1908cd-76dd-4069-ad20-bd5d69080415",
      "item_description": "Navy Blazer or Suit Jacket",
      "reason": "A formal dinner and gallery opening absolutely requires a jacket.",
      "priority": "high"
    }
  ]
}
```

## Notes

- The frontend uses `requestBackend()` for Django and `requestStyling()` for DolphJS.
- If the UI receives a network error, it falls back to demo data so the page still renders.
- Public pages are limited; most routes are protected by `AuthGuard`.
- The Django social router exposes `GET /social/friendships/`; if the frontend wrapper still points at `/social/friends/`, that wrapper should be aligned next.
