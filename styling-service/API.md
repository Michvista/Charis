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

### Occasion examples

`POST /occasions`

Request:
```json
{
  "name": "Formal Dinner",
  "formalityLevel": 4
}
```

Response:
```json
{
  "_id": "82c616d5-a23d-4e22-8699-1832863ee64d",
  "props": {
    "name": "Formal Dinner",
    "formalityLevel": 4
  }
}
```

`GET /occasions`

Response:
```json
[
  {
    "_id": "82c616d5-a23d-4e22-8699-1832863ee64d",
    "props": {
      "name": "Formal Dinner",
      "formalityLevel": 4
    }
  }
]
```

## Combos

| Method | Route | What it does |
| --- | --- | --- |
| `POST` | `/combos` | Enqueues combo generation for the authenticated user. The job-worker later calls back with ranked combinations. |
| `POST` | `/combos/generate-sync` | Internal route used by the job-worker. Runs the backtracking combo generator synchronously and returns candidate outfits immediately. |

### Combo examples

`POST /combos`

Request:
```json
{
  "occasionId": "82c616d5-a23d-4e22-8699-1832863ee64d",
  "targetSeason": "summer",
  "items": [
    {
      "id": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
      "imageUrl": "https://danami.ng/wp-content/uploads/2024/09/Danami-2.webp",
      "category": "top",
      "colorHex": "#ffffff",
      "formalityLevel": 3,
      "seasonTags": ["summer", "spring"]
    },
    {
      "id": "b2b2f1c2-3f44-4e2a-8c2e-7a1c1a4a2222",
      "imageUrl": "https://cdn-images.farfetch-contents.com/33/22/46/11/33224611_63920919_1000.jpg",
      "category": "bottom",
      "colorHex": "#1f1f1f",
      "formalityLevel": 4,
      "seasonTags": ["summer"]
    },
    {
      "id": "c3c3d2d3-4f55-4f3b-9d3f-8b2b2b5b3333",
      "imageUrl": "https://img.joomcdn.net/88754c40953d2680ea872b5df07b4015ea1321d1_original.jpeg",
      "category": "shoes",
      "colorHex": "#000000",
      "formalityLevel": 4,
      "seasonTags": ["summer"]
    }
  ]
}
```

Response:
```json
{
  "outfitId": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "status": "processing"
}
```

`POST /combos/generate-sync`

Request:
```json
{
  "outfitId": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "wardrobeItems": [
    {
      "id": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
      "imageUrl": "https://danami.ng/wp-content/uploads/2024/09/Danami-2.webp",
      "category": "top",
      "colorHex": "#ffffff",
      "formalityLevel": 3,
      "seasonTags": ["summer", "spring"]
    }
  ],
  "occasion": "Formal Dinner",
  "occasionFormality": 4,
  "targetSeason": "summer",
  "maxResults": 3
}
```

Response:
```json
{
  "outfitId": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "status": "processing"
}
```

## Verdict

| Method | Route | What it does |
| --- | --- | --- |
| `POST` | `/verdict` | Enqueues an AI verdict job for an outfit. The worker later calls Gemini vision and patches the completed result back. |
| `PATCH` | `/verdict/{id}/complete` | Internal route used by the worker to store completed verdict or combo results, or mark the outfit as failed. |
| `GET` | `/verdict/{id}` | Returns a single outfit. Normal users can only read outfits they own; internal service calls can read any outfit. |

### Verdict examples

`POST /verdict`

Request:
```json
{
  "occasionId": "82c616d5-a23d-4e22-8699-1832863ee64d",
  "items": [
    {
      "wardrobeItemId": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
      "itemRole": "top",
      "imageUrl": "https://danami.ng/wp-content/uploads/2024/09/Danami-2.webp",
      "colorHex": "#ffffff",
      "formalityLevel": 3,
      "seasonTags": ["summer", "spring"]
    }
  ]
}
```

Response:
```json
{
  "outfitId": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "status": "processing"
}
```

`GET /verdict/{id}`

Response:
```json
{
  "outfitId": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "userId": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "status": "pending",
  "score": 0,
  "verdictText": "processing",
  "rankedCombos": [],
  "items": [
    {
      "wardrobeItemId": "8e1f7bc1-1d6f-4f3c-9f84-0d8f8e22b111",
      "itemRole": "top"
    }
  ]
}
```

`PATCH /verdict/{id}/complete`

Request:
```json
{
  "aiVerdict": {
    "confidence": 87,
    "verdict": "Good fit",
    "visualNotes": "Strong color balance and clean silhouette."
  }
}
```

Response:
```json
{
  "outfitId": "73187852-76ad-458c-80a6-b2a2d1f0b065",
  "userId": "63f9cf6e-74bb-49cd-be01-0a680b474028",
  "status": "done",
  "score": 87,
  "verdictText": "Good fit",
  "rankedCombos": []
}
```

## Notes

- `generate-sync` and `complete` are internal workflow routes, not public user actions.
- The combo flow uses a role-level weighted compatibility graph plus backtracking.
- The verdict flow uses Gemini vision to rerank or validate outfit image combinations.
- The service intentionally keeps UUID references to cross-service records instead of database foreign keys.
