# Backend API

## Auth

- `POST /api/auth/register/` — Register a new user and return JWT access/refresh tokens plus the created user profile.
- `POST /api/auth/login/` — Authenticate with email/password and return JWT access/refresh tokens plus user profile.
- `POST /api/auth/token/refresh/` — Refresh the access token using a valid refresh token.
- `POST /api/auth/logout/` — Blacklist the provided refresh token and log out the authenticated user.
- `GET /api/auth/profile/` — Retrieve the authenticated user's profile.
- `PATCH /api/auth/profile/` — Update the authenticated user's profile.
- `GET /api/auth/health/` — Health check endpoint.

## Wardrobe

- `GET /api/wardrobe/items/` — List wardrobe items owned by the authenticated user.
- `POST /api/wardrobe/items/` — Create a new wardrobe item, including optional image upload.
- `GET /api/wardrobe/items/{id}/` — Retrieve a specific wardrobe item.
- `PUT /api/wardrobe/items/{id}/` — Replace a wardrobe item.
- `PATCH /api/wardrobe/items/{id}/` — Partially update a wardrobe item.
- `DELETE /api/wardrobe/items/{id}/` — Delete a wardrobe item.
- `POST /api/wardrobe/items/{id}/wear/` — Log a wear event for a wardrobe item.
