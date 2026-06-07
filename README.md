# 🧳 Capsule Wardrobe

A personal clothing closet manager and travel capsule wardrobe builder.

**Features**
- Photo upload for every clothing item (stored on Cloudflare R2)
- Filter your closet by category, color, and climate
- Build named capsule wardrobes by picking items from your closet
- Create trips and link capsules to them
- Fully responsive — works great on mobile too

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite 5, TypeScript, TanStack Query v5, React Router v6 |
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL 16, Prisma 5 |
| Storage | Cloudflare R2 (S3-compatible) |
| Monorepo | Shared types package (`@capsule/shared`) |

---

## Local development

### Prerequisites

- Node.js 20+
- [OrbStack](https://orbstack.dev/) (or Docker Desktop) for PostgreSQL
- A free [Cloudflare R2](https://dash.cloudflare.com/) bucket (or skip — photo upload just won't work)

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/capsule-wardrobe.git
cd capsule-wardrobe
npm install          # installs root + all workspaces
```

### 2. Start the database

```bash
docker compose up -d
```

This starts `postgres:16-alpine` on port **5432** with:
- user: `capsule`
- password: `capsule`
- databases: `capsule_wardrobe` (app) and `capsule_wardrobe_test` (tests)

### 3. Configure the server

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
DATABASE_URL=postgresql://capsule:capsule@localhost:5432/capsule_wardrobe
DATABASE_URL_TEST=postgresql://capsule:capsule@localhost:5432/capsule_wardrobe_test
PORT=3001
CLIENT_URL=http://localhost:5173

# Cloudflare R2 (optional — leave as placeholders to skip photo upload)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=capsule-wardrobe-photos
```

### 4. Migrate and seed

```bash
cd server
npx prisma migrate deploy
npx prisma db seed
cd ..
```

### 5. Run the app

```bash
npm run dev        # starts backend (port 3001) and frontend (port 5173) concurrently
```

Open [http://localhost:5173](http://localhost:5173).

To access from a phone on the same Wi-Fi, use the **Network** address Vite prints
(e.g. `http://192.168.1.x:5173`).

### 6. Run the tests

```bash
# Backend (Jest + Supertest)
cd server && npm test

# Frontend (Vitest + React Testing Library)
cd client && npm test
```

---

## Deployment

### Backend → DigitalOcean App Platform

1. Push the repo to GitHub.
2. In the [DigitalOcean control panel](https://cloud.digitalocean.com/apps), click **Create App** → **Import from GitHub**.
3. Point it at your repo; DigitalOcean will detect the `server/.do/app.yaml` spec automatically.
4. Add the four R2 secrets (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) in the **Environment Variables** panel.
5. Deploy — Prisma migrations run automatically in the build step.

**API health check:** `GET /api/health` → `{ "ok": true }`

### Frontend → Cloudflare Pages

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/), go to **Pages** → **Create a project** → **Connect to Git**.
2. Select your repo and configure:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `client`
3. Add an environment variable:
   ```
   VITE_API_URL=https://<your-do-app>.ondigitalocean.app
   ```
4. Deploy. The `client/public/_redirects` file handles SPA routing automatically.

---

## Project structure

```
capsule-wardrobe/
├── shared/            # @capsule/shared — TypeScript types used by both ends
├── server/
│   ├── prisma/        # schema.prisma, migrations, seed.ts
│   ├── src/
│   │   ├── routes/    # closets, items, capsules, trips, upload
│   │   ├── lib/       # prisma singleton, R2 helpers
│   │   ├── middleware/ # error handler
│   │   └── __tests__/ # Jest + Supertest tests
│   └── .do/app.yaml   # DigitalOcean App Platform spec
├── client/
│   ├── public/        # _redirects for Cloudflare Pages
│   └── src/
│       ├── components/ # NavBar, ItemCard, CapsuleTray, FilterBar, BottomSheet, …
│       ├── pages/     # ClosetPage, CapsuleBuilderPage, TripsPage, TripDetailPage, …
│       └── lib/       # api.ts, queryClient.ts
└── docker-compose.yml
```
