# GreenByte Backend

This backend is designed around the flows already present in the Expo frontend:

- login with phone
- update profile
- fetch e-waste catalog
- estimate pickup value
- create pickup request
- view pickup history
- view dashboard metrics

## 1. Folder structure

```text
backend
├── src
│   ├── config
│   ├── constants
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── services
│   ├── utils
│   └── validators
├── scripts
└── docker-compose.yml
```

Why this structure:

- `routes` only define URLs.
- `controllers` handle request and response.
- `services` hold business logic.
- `models` define MongoDB collections.
- `scripts` are for one-time jobs like seeding and analytics.

## 2. Data model

### User

Stores the customer profile used by login and profile screens.

### CatalogItem

Stores the e-waste categories and pricing currently hardcoded in the frontend.

### Pickup

Stores one pickup request with:

- selected items
- schedule
- address and phone
- estimate
- impact values
- status

### AnalyticsSnapshot

Stores aggregated dashboard numbers produced by the MongoDB pipeline.

## 3. API design

Base URL: `http://localhost:4000/api/v1`

### Health

- `GET /health`

### Auth

- `POST /auth/login`

```json
{
  "phone": "9876543210",
  "name": "Harsh"
}
```

### Users

- `GET /users/:userId`
- `PATCH /users/:userId`

### Catalog

- `GET /catalog`

### Pickups

- `POST /pickups/estimate`
- `POST /pickups`
- `GET /pickups?userId=<userId>`
- `PATCH /pickups/:pickupId/status`

Create payload example:

```json
{
  "userId": "USER_ID",
  "items": [
    {
      "category": "Personal Gadgets",
      "name": "Phones",
      "quantity": 2
    },
    {
      "category": "Mixed E-Scrap",
      "name": "Cables",
      "quantity": 1,
      "weightKg": 3.5
    }
  ],
  "schedule": {
    "dateLabel": "Mon, 21 Apr",
    "timeLabel": "10:30 AM"
  },
  "address": "Pune, Maharashtra",
  "phone": "9876543210",
  "notes": "Call before arrival"
}
```

### Dashboard

- `GET /dashboard/:userId`

## 4. MongoDB pipeline

The analytics pipeline lives in `scripts/runAnalyticsPipeline.js`.

What it does:

1. Reads pickups and users.
2. Aggregates totals like pickups, value, weight, and CO2 saved.
3. Finds top e-waste categories.
4. Stores the result in `analytics_snapshots`.

This is useful because dashboards should not recalculate expensive totals on every request forever. A scheduled pipeline lets the app scale more smoothly.

## 5. Local setup

### Start MongoDB

If Docker is available:

```bash
cd backend
docker compose up -d
```

### Install packages

```bash
cd backend
npm install
```

### Configure environment

```bash
cp .env.example .env
```

### Seed base data

```bash
npm run seed
```

### Start the API

```bash
npm run dev
```

### Run the analytics pipeline

```bash
npm run pipeline
```

## 6. How this maps to the frontend

### Login screen

Frontend should call `POST /auth/login` instead of only storing phone in local state.

### Select E-Waste screen

Frontend should call `GET /catalog` and render dynamic categories and items from MongoDB.

### Schedule and Order Summary screens

Frontend should call:

- `POST /pickups/estimate` before confirmation
- `POST /pickups` when user confirms pickup

### Profile screen

Frontend should call:

- `GET /users/:userId`
- `PATCH /users/:userId`
- `GET /pickups?userId=...`

### Dashboard

Frontend should call:

- `GET /dashboard/:userId`

## 7. Next scaling steps

When you are ready, the next upgrades should be:

1. Add JWT authentication and OTP login.
2. Add Redis caching for catalog and dashboard.
3. Add background jobs with BullMQ for analytics and notifications.
4. Split admin and customer APIs.
5. Add automated tests and Swagger/OpenAPI docs.
