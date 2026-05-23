# Capsule Wardrobe Tracker — Design Spec
*2026-05-22*

## Overview

A personal React web app for managing a clothing closet and building travel capsule wardrobes from it. The user catalogs their clothes with photos, organizes subsets into reusable capsules, and links capsules to specific trips.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite → Cloudflare Pages |
| Backend | Node.js + Express → DigitalOcean App Platform |
| Database | PostgreSQL + Prisma → DigitalOcean Managed Postgres (or Neon) |
| File storage | Cloudflare R2 (photos) |
| Monorepo structure | `/client`, `/server`, `/shared` with root `concurrently` runner |

---

## Data Model

```
users
  id, email, created_at

closets
  id, user_id, name, description, created_at
  → belongs to user; a user can have multiple closets
  → v1: one default closet auto-created on first launch

closet_items
  id, closet_id, name, photo_url (R2 key), category, color,
  climate, size, brand, notes, created_at
  → belongs to a closet (not directly to user)
  → category: tops | bottoms | dresses | shoes | accessories | outerwear
  → climate: tropical | temperate | cold | layering

capsules
  id, user_id, name, description, created_at
  → belongs to user; can draw items from any of the user's closets

capsule_items
  capsule_id, closet_item_id
  → many-to-many junction; one item can belong to many capsules

trips
  id, user_id, name, destination, start_date, end_date, created_at

trip_capsules
  trip_id, capsule_id
  → many-to-many junction; a trip can reference multiple capsules
```

**Photo upload flow:** client requests a presigned R2 upload URL from Express → browser uploads directly to R2 (binary never touches the DO server) → client saves the R2 key on the item record → server generates signed read URLs at fetch time.

---

## API Design

All routes prefixed `/api`. No auth in v1 — single-user, but user_id foreign key is on all entities for future auth extension.

### Closets
```
GET    /closets
POST   /closets
GET    /closets/:id
PUT    /closets/:id
DELETE /closets/:id
```

### Closet Items
```
GET    /closets/:id/items     ?category=&color=&climate=
POST   /closets/:id/items
GET    /items/:id
PUT    /items/:id
DELETE /items/:id
```

### Photos
```
POST   /upload                multipart → streams to R2 → returns { key, url }
```

### Capsules
```
GET    /capsules
POST   /capsules
GET    /capsules/:id          returns capsule with embedded items
PUT    /capsules/:id
DELETE /capsules/:id
POST   /capsules/:id/items
DELETE /capsules/:id/items/:itemId
```

### Trips
```
GET    /trips
POST   /trips
GET    /trips/:id             returns trip with embedded capsules (and their items)
PUT    /trips/:id
DELETE /trips/:id
POST   /trips/:id/capsules
DELETE /trips/:id/capsules/:capsuleId
```

---

## Frontend Architecture

### Pages (React Router v6)

| Route | Page | Description |
|---|---|---|
| `/` | Closet | Photo grid, filter bar, "Add Item" button |
| `/items/:id` | Item Detail | Full photo, attributes, edit form, capsule membership |
| `/capsules` | Capsule List | Grid of capsule cards with item count + thumbnail preview |
| `/capsules/:id` | Capsule Builder | Pinned tray at top, full closet grid below, "+" opens bottom sheet |
| `/trips` | Trip List | Cards showing destination, dates, linked capsules |
| `/trips/:id` | Trip Detail | Trip metadata + linked capsule expandable cards |

### State Management
- **React Query** — all server state (fetching, caching, optimistic mutations)
- **Component state / context** — local UI state (filters, sheet open/closed, selected items)

### Key Shared Components

| Component | Purpose |
|---|---|
| `ClosetGrid` | Photo grid of items; reused on Closet page and inside BottomSheet |
| `ItemCard` | Thumbnail + multi-capsule badge (green border = in active capsule, orange count = in others) |
| `CapsuleTray` | Pinned top section in Capsule Builder; shows current capsule items with × to remove |
| `BottomSheet` | Slide-up drawer with search input + filter chips; generic, used for item search |
| `ItemUploadForm` | Photo picker + all item attribute fields |

---

## UX Interaction Model

**Capsule Builder** uses a capsule-first layout:
- Capsule tray is pinned at top; closet is scrollable below
- Clicking any item in the closet toggles it in/out of the active capsule
- "+" in the tray opens a bottom sheet with search + filter chips (category, color, climate)
- Items show green border when in the active capsule; orange badge with count when in other capsules
- On desktop: bottom sheet expands as a wider drawer; on mobile: standard bottom sheet

---

## Key User Flows

**Add a closet item:**
Closet → "Add Item" → ItemUploadForm → photo upload (presigned R2 URL) → fill attributes → save → appears in closet grid

**Build a capsule:**
Capsules → "New Capsule" → name/description → Capsule Builder → tap "+" → BottomSheet slides up → search/filter → tap items to add → appear in tray → auto-save on each add/remove

**Create a trip + link capsule:**
Trips → "New Trip" → name, destination, dates → Trip Detail → "Link Capsule" → select from existing capsules → capsule appears as expandable card on trip

---

## MVP Scope

**In v1:**
- Closet management (add/edit/delete items, photo upload)
- Capsule builder (create/edit capsules, add/remove items via bottom sheet)
- Trip management (create trips, link/unlink capsules)
- Closet filtering (category, color, climate)
- Item detail view
- Capsule summary view

**Explicitly out of v1:**
- Auth / multi-user
- Outfit builder / mix-and-match
- Weather-aware packing suggestions
- Usage statistics
- Multiple closets UI (data model supports it; UI ships later)

---

## Deployment

```
git push
  ├── /client changes → Cloudflare Pages auto-build + deploy
  └── /server changes → DigitalOcean App Platform auto-build + deploy
                          └── prisma migrate deploy (build step)
```

CORS configured on Express to allow the Cloudflare Pages domain.
