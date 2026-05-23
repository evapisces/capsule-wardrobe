# Capsule Wardrobe Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack personal app for managing a clothing closet and assembling travel capsule wardrobes from it, with photo upload, capsule builder, and trip management.

**Architecture:** React + Vite frontend (Cloudflare Pages) + Node/Express backend (DigitalOcean App Platform) in a monorepo with shared TypeScript types. PostgreSQL + Prisma for data, Cloudflare R2 for photo storage. No auth in v1 — single hardcoded user, schema is multi-user-ready for when auth is added.

**Tech Stack:** React 18, Vite, React Router v6, TanStack Query v5, TypeScript, Node.js 20, Express 4, Prisma 5, PostgreSQL, Cloudflare R2 (`@aws-sdk/client-s3`), Jest + Supertest (backend tests), Vitest + React Testing Library (frontend tests)

**Design spec:** `docs/superpowers/specs/2026-05-22-capsule-wardrobe-design.md`

---

## File Structure

```
capsule-wardrobe/
├── package.json              # root concurrently runner
├── .gitignore
├── .env.example
├── README.md
├── .do/
│   └── app.yaml              # DigitalOcean App Platform config
├── shared/
│   ├── package.json
│   └── types.ts              # shared TS types (ClosetItem, Capsule, Trip, etc.)
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma     # all 7 models
│   │   └── seed.ts           # creates user_1 + default closet
│   └── src/
│       ├── index.ts          # server entry
│       ├── app.ts            # Express factory, all routes wired
│       ├── lib/
│       │   ├── prisma.ts     # singleton PrismaClient
│       │   └── r2.ts         # S3Client + uploadToR2 + getSignedReadUrl
│       ├── middleware/
│       │   └── errorHandler.ts
│       ├── routes/
│       │   ├── closets.ts    # GET/POST/PUT/DELETE /api/closets
│       │   ├── items.ts      # closet items CRUD + filtering
│       │   ├── capsules.ts   # capsules CRUD + item add/remove
│       │   ├── trips.ts      # trips CRUD + capsule link/unlink
│       │   └── upload.ts     # POST /api/upload → R2
│       └── __tests__/
│           ├── globalSetup.ts
│           ├── globalTeardown.ts
│           ├── closets.test.ts
│           ├── items.test.ts
│           ├── capsules.test.ts
│           ├── trips.test.ts
│           └── upload.test.ts
└── client/
    ├── package.json
    ├── vite.config.ts        # proxies /api to :3001 in dev
    ├── tsconfig.json
    ├── index.html
    ├── public/
    │   └── _redirects        # Cloudflare Pages SPA routing
    └── src/
        ├── main.tsx
        ├── App.tsx           # React Router routes
        ├── index.css
        ├── test-setup.ts
        ├── lib/
        │   ├── queryClient.ts
        │   └── api.ts        # all typed API calls
        ├── pages/
        │   ├── ClosetPage.tsx
        │   ├── ItemDetailPage.tsx
        │   ├── CapsulesPage.tsx
        │   ├── CapsuleBuilderPage.tsx
        │   ├── TripsPage.tsx
        │   └── TripDetailPage.tsx
        └── components/
            ├── NavBar.tsx
            ├── ClosetGrid.tsx
            ├── ItemCard.tsx        # photo thumb + multi-capsule badge
            ├── CapsuleTray.tsx     # sticky tray in CapsuleBuilder
            ├── BottomSheet.tsx     # generic slide-up drawer
            ├── ItemUploadForm.tsx  # photo upload + all item fields
            └── FilterBar.tsx      # category / color / climate filters
```

---

## Tasks Overview

| # | Task | Phase |
|---|---|---|
| 1 | Root scaffold + shared types | Foundation |
| 2 | Server scaffold | Foundation |
| 3 | Prisma schema + migrations + seed + test DB | Database |
| 4 | Prisma singleton + Express app + error handler | Core API |
| 5 | Closets routes (TDD) | Closets & Items |
| 6 | Items routes with filtering + capsuleCount (TDD) | Closets & Items |
| 7 | R2 client + upload route (TDD) | Photo Upload |
| 8 | Capsules routes (TDD) | Capsules |
| 9 | Trips routes + wire all routes (TDD) | Trips |
| 10 | Client scaffold (Vite, React, TypeScript, Vitest) | Frontend |
| 11 | Typed API client | Frontend |
| 12 | React Router + NavBar + page shells | Frontend |
| 13 | ItemCard + ClosetGrid | Closet UI |
| 14 | FilterBar | Closet UI |
| 15 | ItemUploadForm (photo upload + attributes) | Closet UI |
| 16 | ClosetPage (full) | Closet UI |
| 17 | ItemDetailPage (view/edit/delete) | Closet UI |
| 18 | CapsulesPage (list + create) | Capsule Builder |
| 19 | BottomSheet component | Capsule Builder |
| 20 | CapsuleTray component | Capsule Builder |
| 21 | CapsuleBuilderPage (full interaction) | Capsule Builder |
| 22 | TripsPage (list + create) | Trips |
| 23 | TripDetailPage (link/unlink capsules, expand) | Trips |
| 24 | Deployment config + README | Deploy |

---

## Full Task Details

The complete task details with all code are split across three section files. Execute them in order:

1. **Tasks 1–9 (Foundation + Backend):** `docs/superpowers/plans/sections/01-foundation-backend.md`
2. **Tasks 10–17 (Frontend Foundation + Closet UI):** `docs/superpowers/plans/sections/02-frontend-foundation-closet.md`
3. **Tasks 18–24 (Capsule Builder + Trips + Deployment):** `docs/superpowers/plans/sections/03-capsule-builder-trips-deploy.md`

---

## Key Decisions

- **USER_ID is hardcoded to `'user_1'`** in all routes for v1. When auth is added, replace with `req.user.id`. The schema already has `userId` on all entities.
- **Default closet** is auto-created by seed (`id: 'closet_default'`). The frontend fetches `GET /api/closets` and uses `closets[0].id`. No closet-switcher UI in v1.
- **Photo upload** goes browser → `POST /api/upload` (gets signed URL + streams to R2) → R2 directly. The `key` is stored as `photoUrl` on the item. Signed read URLs are generated per-request.
- **`capsuleCount`** is computed in the API (`_count.capsules`) and returned on every `ClosetItem` response. Frontend uses it to show orange badges.
- **Optimistic mutations** are not used — each add/remove invalidates the capsule query. The tradeoff is acceptable for a personal app; the round-trip is fast.

---

## Verification Checklist

- [ ] `GET /health` returns `{"ok":true}`
- [ ] Add a closet item with a photo → photo appears in grid
- [ ] Filter closet by category → grid updates
- [ ] Click item → item detail → edit → saved
- [ ] Create capsule → builder opens
- [ ] Add items via tray "+" (bottom sheet) and clicking grid → both work
- [ ] Remove item from tray via × → removed
- [ ] Create trip → link capsule → expand → items visible
- [ ] Unlink capsule from trip → removed
- [ ] `cd server && npm test` → all suites pass
- [ ] `cd client && npm test` → all suites pass
