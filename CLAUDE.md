# capsule-wardrobe

Client/server TypeScript monorepo.

- `client/` — React + Vite + Vitest
- `server/` — Express + Prisma (Postgres) + Jest + Supertest
- `shared/` — types shared by client and server; keep in sync when changing an API contract
- `docker-compose.yml` — local Postgres (`postgres` service) used by server tests

## Commands

| Task | Command |
|---|---|
| Run everything in dev | `npm run dev` |
| Client tests | `npm test --prefix client` |
| Client e2e overflow tests (headless Chromium, no DB) | `npm run test:e2e:install --prefix client` once, then `npm run test:e2e --prefix client` |
| Type-check the client e2e suite against `@capsule/shared` | `npm run test:e2e:typecheck --prefix client` |
| Server tests | `docker compose up -d postgres && npm test --prefix server` |
| Client build / typecheck | `npm run build --prefix client` |
| Server build / typecheck | `npm run build --prefix server` |
| DB migrate | `npm run db:migrate --prefix server` |

## Deployment

- **Client** — Cloudflare Pages, at `https://capsule-wardrobe-ilh.pages.dev`.
- **Server** — DigitalOcean App Platform, at `https://lionfish-app-s8enb.ondigitalocean.app`. `/api/health` returns `{"ok":true}` when the deployment is up.
- **Database** — a DigitalOcean Managed Postgres cluster, accessed from outside DO via its **Public network** connection string with `sslmode=require`. It has no built-in web SQL console; connect with `psql` (or `docker run -it --rm postgres:16-alpine psql "<connection-string>"` if `psql` isn't installed locally). Only IPs (and the app itself) listed under the cluster's **Trusted Sources** can connect — a changed local IP is a common cause of connection timeouts.
- Client and server are on **different domains**, but the browser never talks to the server's domain directly: `client/functions/api/[[path]].ts` is a Cloudflare Pages Function that proxies every `/api/*` request to the DO backend (via the `API_ORIGIN` env var, set in the Cloudflare Pages project). This makes the API same-origin from the browser's point of view, which matters because iOS Safari/Chrome (both WebKit) apply Intelligent Tracking Prevention that can drop cookies set via a cross-domain OAuth redirect — that showed up as an infinite sign-in loop on iPhone even though the same cross-domain setup worked on desktop with `SameSite=None; Secure`. The client's `VITE_API_URL` is left unset in production so it calls its own relative `/api/...` paths, which the proxy forwards.
- `GOOGLE_REDIRECT_URI` on the server must exactly match an Authorized redirect URI registered on the OAuth Client in Google Cloud Console (Console → APIs & Services → Credentials), and — because of the proxy above — points at the **client's** domain (`https://capsule-wardrobe-ilh.pages.dev/api/auth/google/callback`), not the server's. Local dev keeps its own entry (`http://localhost:3001/...`, since Vite's dev server already proxies `/api` to the local server — see `client/vite.config.ts`).
- The server's env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SESSION_COOKIE_NAME`, `CLIENT_URL`, `DATABASE_URL`, `NODE_ENV=production`) are set directly in the DO App Platform component — see `server/.env.example` for the full list. Changing them requires a redeploy/restart to take effect.

## Agent pipeline conventions

The `/feature` command orchestrates three subagents: `product-manager`,
`engineer`, `quality-engineer` (see `.claude/agents/`).

- Work is tracked as GitHub issues on `evapisces/capsule-wardrobe`, labeled `agent-pipeline`.
- Branch naming: `feature/issue-<n>-<slug>`.
- Every PR is opened as a **draft**, includes `Closes #<n>` and a **How to test** section.
- The quality-engineer posts PR reviews; it never pushes commits.
- The human approves the spec before implementation, and does the final review + merge.
