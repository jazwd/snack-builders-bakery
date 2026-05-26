# snack-builders-bakery

Stack Builder coding exercise

## Environment variables

Copy `.env.example` to `.env` and adjust values as needed.

Required:

- `MONGODB_URI`: MongoDB connection string. Example: `mongodb://127.0.0.1:27017`

Optional:

- `MONGODB_DB_NAME`: Database name. Default: `bakery`
- `PORT`: API port. Default: `3000`
- `JWT_EXPIRES_IN`: Token expiration (for example `1h`). Default: `1h`

Required for JWT-protected routes:

- `JWT_SECRET`: Secret used to sign and verify tokens
- `AUTH_USERNAME`: Login username for `/api/auth/login`
- `AUTH_PASSWORD`: Login password for `/api/auth/login`

## Run

```bash
npm install
npm run dev
```

## Authentication

1. Get a token from `POST /api/auth/login` using:

```json
{
    "username": "your_username",
    "password": "your_password"
}
```

2. Send the token as a Bearer token:

```text
Authorization: Bearer <token>
```

All routes except `/api/health` and `/api/auth/login` require JWT.
