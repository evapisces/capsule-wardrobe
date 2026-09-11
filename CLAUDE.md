# capsule-wardrobe

Client/server TypeScript monorepo.

- `client/` — React + Vite + Vitest
- `server/` — Express + Prisma (Postgres) + Jest + Supertest
- `shared/` — types shared by client and server; keep in sync when changing an API contract
- `docker-compose.yml` — local Postgres (`db` service) used by server tests

## Commands

| Task | Command |
|---|---|
| Run everything in dev | `npm run dev` |
| Client tests | `npm test --prefix client` |
| Client e2e overflow tests (headless Chromium, no DB) | `npm run test:e2e:install --prefix client` once, then `npm run test:e2e --prefix client` |
| Server tests | `docker compose up -d db && npm test --prefix server` |
| Client build / typecheck | `npm run build --prefix client` |
| Server build / typecheck | `npm run build --prefix server` |
| DB migrate | `npm run db:migrate --prefix server` |

## Agent pipeline conventions

The `/feature` command orchestrates three subagents: `product-manager`,
`engineer`, `quality-engineer` (see `.claude/agents/`).

- Work is tracked as GitHub issues on `evapisces/capsule-wardrobe`, labeled `agent-pipeline`.
- Branch naming: `feature/issue-<n>-<slug>`.
- Every PR is opened as a **draft**, includes `Closes #<n>` and a **How to test** section.
- The quality-engineer posts PR reviews; it never pushes commits.
- The human approves the spec before implementation, and does the final review + merge.
