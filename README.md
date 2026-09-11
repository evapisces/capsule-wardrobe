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

# Google OAuth sign-in (see "Google OAuth setup" below)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
SESSION_COOKIE_NAME=capsule_session
```

#### Google OAuth setup

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type **Web application**.
2. Add `http://localhost:3001/api/auth/google/callback` (or your `GOOGLE_REDIRECT_URI`) to **Authorized redirect URIs**.
3. Copy the generated **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. `SESSION_COOKIE_NAME` is the name of the httpOnly cookie the server sets after a successful sign-in — any value works locally.

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

**Live app:**
- Frontend: https://capsule-wardrobe-ilh.pages.dev
- Backend: https://lionfish-app-s8enb.ondigitalocean.app (`GET /api/health` → `{ "ok": true }`)
- Database: a DigitalOcean Managed Postgres cluster

### Backend → DigitalOcean App Platform

1. Push the repo to GitHub.
2. In the [DigitalOcean control panel](https://cloud.digitalocean.com/apps), click **Create App** → **Import from GitHub**.
3. Point it at your repo; DigitalOcean will detect the `server/.do/app.yaml` spec automatically.
4. In the **Environment Variables** panel, add the four R2 secrets (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) and the Google OAuth vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` set to `https://<your-pages-site>.pages.dev/api/auth/google/callback` — the **client's** domain, not the server's; see "Same-origin API proxy" below — and `SESSION_COOKIE_NAME`). Confirm `NODE_ENV=production` is set — it controls the session cookie's `Secure` flag.
5. Register that same `GOOGLE_REDIRECT_URI` as an **Authorized redirect URI** on the OAuth Client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — it's an exact-match check, so the production URL needs its own entry alongside the localhost one.
6. Deploy — Prisma migrations run automatically in the build step.

**Connecting to the production database:** DO Managed Postgres has no built-in web SQL console. Grab the **Public network** connection string from the cluster's Connection Details panel, make sure your current IP is listed under the cluster's **Trusted Sources** (a changed IP is the most common cause of connection timeouts), then connect with `psql "<connection-string>"` — or, if `psql` isn't installed locally, `docker run -it --rm postgres:16-alpine psql "<connection-string>"`.

### Frontend → Cloudflare Pages

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/), go to **Pages** → **Create a project** → **Connect to Git**.
2. Select your repo and configure:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `client`
3. Add an environment variable for the Pages Function (see below): `API_ORIGIN=https://<your-do-app>.ondigitalocean.app`. Leave `VITE_API_URL` unset — the client calls its own origin (`/api/...`), which the proxy forwards.
4. Deploy. The `client/public/_redirects` file handles SPA routing automatically.

### Same-origin API proxy

The client (Cloudflare Pages) and server (DigitalOcean) are on different domains. A plain cross-site `fetch` setup works on desktop browsers with `SameSite=None; Secure` cookies, but **iOS Safari and Chrome-on-iOS both run on WebKit and enforce Intelligent Tracking Prevention**, which can refuse to persist a cookie set via a cross-domain OAuth redirect chain — this showed up as an infinite sign-in loop on iPhone even though the same flow worked fine on desktop.

The fix: `client/functions/api/[[path]].ts` is a Cloudflare Pages Function that proxies every `/api/*` request straight through to the DO backend (using the `API_ORIGIN` env var above). This makes the API look same-origin to the browser — no cross-site request happens at all, so ITP (and `SameSite` generally) stops being relevant. `GOOGLE_REDIRECT_URI` points at the **client's** `/api/auth/google/callback` (proxied through to the server) precisely so the whole OAuth round-trip stays on one origin from the browser's point of view. The proxy's upstream `fetch` uses `redirect: 'manual'` so the OAuth routes' 3xx responses (to Google, then back to the client) reach the browser untouched instead of being followed by the Worker itself.

**Troubleshooting, if this regresses:**
- **`{"error":"Invalid or missing OAuth state"}`** — almost always means `VITE_API_URL` is set in Cloudflare Pages (even to the DO URL, e.g. left over from before the proxy existed). It gets baked into the built JS bundle at compile time, turning the "Sign in with Google" link into an absolute cross-domain URL that bypasses the proxy entirely, so the OAuth state cookie ends up scoped to the wrong domain. Check the rendered link's `href` — it should be a relative `/api/auth/google`, not an absolute `https://...ondigitalocean.app/...` one — or grep the built bundle for the DO domain.
- **Env var changes not taking effect after a "redeploy"** — Cloudflare Pages keeps separate **Production** and **Preview** variable sets, and a saved change only applies to deployments built afterward. Confirm the deployment you triggered actually ran as Production, and that the variable was saved under the Production tab specifically.
- **Cloudflare's generic "Error 1101" page** — means the Pages Function threw an unhandled exception (often a missing `API_ORIGIN`). The function returns a specific error message instead of letting this happen, so if you see the generic page again, the deployed function may be stale.

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
