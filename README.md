# Pulse — On-Demand Location-Based Visual Request App

Drop a pin. Get a real-time photo or video from someone physically at that location.

## Monorepo Structure

```
omni/
├── backend/     Express + TypeScript + Prisma + PostGIS + Redis + Socket.io
└── mobile/      Expo Router + React Native + Maps + Camera
```

## Quick Start

### 1. Start infrastructure

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # Edit JWT_SECRET

# Run migration (with Docker running)
npx prisma migrate deploy
# OR for dev:
npx prisma db push

npm run dev
```

### 3. Mobile

```bash
cd mobile
npm install
cp .env.example .env   # Edit EXPO_PUBLIC_API_URL if needed

npx expo start
```

## Environment Variables

Copy `.env.example` to `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Long random secret (min 16 chars) |
| `EXPO_ACCESS_TOKEN` | From expo.dev (optional for push) |

## API Routes (`/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Sign in |
| POST | `/auth/push-token` | ✓ | Register push token |
| GET | `/users/me` | ✓ | Own profile |
| PUT | `/users/me/location` | ✓ | Update location |
| POST | `/requests` | ✓ | Create request + notify nearby |
| GET | `/requests?lat&lng&radius` | ✓ | Nearby open requests |
| GET | `/requests/mine` | ✓ | My requests |
| GET | `/requests/:id` | ✓ | Request detail |
| DELETE | `/requests/:id` | ✓ | Cancel request |
| POST | `/requests/:id/fulfill` | ✓ | Upload media |
| GET | `/requests/:id/fulfillments` | ✓ | List fulfillments |
| PUT | `/fulfillments/:id/status` | ✓ | Accept/reject |
| POST | `/fulfillments/:id/rate` | ✓ | 1-5 star rating |
| GET | `/media/:filename` | ✓ | Serve media file |

## Karma System

| Action | Points |
|--------|--------|
| Photo upload | +10 (provisional) |
| Video upload | +15 (provisional) |
| Rating ≥ 4 stars | +5 bonus |
| Rating ≤ 2 stars | −2 (floor 0) |

## Architecture Notes

- **Geofencing**: Server-side at request creation time using PostGIS `ST_DWithin`
- **Location freshness**: Mobile fires `PUT /users/me/location` on every app foreground (no background permissions needed)
- **Push notifications**: Expo Push API with Redis dedup (48hr TTL)
- **Real-time**: Socket.io rooms per request (`request:{id}`)
- **Media storage**: Local disk (MVP) — swap `UPLOAD_DIR` for S3 in production
- **Expiry**: node-cron every 2 minutes marks expired requests
