## Phase 1: Monorepo Setup

### Task 1: Root scaffold + shared types

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `shared/package.json`
- Create: `shared/types.ts`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "capsule-wardrobe",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "dev:server": "npm run dev --prefix server",
    "dev:client": "npm run dev --prefix client"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.env
```

- [ ] **Step 3: Create shared/package.json**

```json
{
  "name": "@capsule/shared",
  "version": "1.0.0",
  "main": "types.ts",
  "types": "types.ts"
}
```

- [ ] **Step 4: Create shared/types.ts**

```typescript
export type ItemCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'shoes'
  | 'accessories'
  | 'outerwear';

export type Climate = 'tropical' | 'temperate' | 'cold' | 'layering';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Closet {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface ClosetItem {
  id: string;
  closetId: string;
  name: string;
  photoUrl: string | null;
  category: ItemCategory;
  color: string | null;
  climate: Climate | null;
  size: string | null;
  brand: string | null;
  notes: string | null;
  createdAt: string;
  capsuleCount?: number;
}

export interface Capsule {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  items?: ClosetItem[];
  createdAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  capsules?: Capsule[];
  createdAt: string;
}

export interface UploadResponse {
  key: string;
  url: string;
}
```

- [ ] **Step 5: Install root deps + commit**

```bash
npm install
git init
git add .
git commit -m "chore: monorepo root + shared types"
```

---

### Task 2: Server scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/jest.config.js`
- Create: `server/.env.example`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "capsule-wardrobe-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/s3-request-presigner": "^3.600.0",
    "@prisma/client": "^5.16.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.16.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.5",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@capsule/shared": ["../shared/types"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create server/jest.config.js**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  globalSetup: './src/__tests__/globalSetup.ts',
  globalTeardown: './src/__tests__/globalTeardown.ts',
  moduleNameMapper: {
    '@capsule/shared': '<rootDir>/../shared/types',
  },
};
```

- [ ] **Step 4: Create server/.env.example**

```
DATABASE_URL=postgresql://user:password@localhost:5432/capsule_wardrobe
DATABASE_URL_TEST=postgresql://user:password@localhost:5432/capsule_wardrobe_test
PORT=3001
CLIENT_URL=http://localhost:5173
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=capsule-wardrobe-photos
```

- [ ] **Step 5: Install server deps**

```bash
cd server && npm install
```

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "chore: server scaffold"
```

---

## Phase 2: Database

### Task 3: Prisma schema + migrations

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/prisma/seed.ts`
- Create: `server/src/__tests__/globalSetup.ts`
- Create: `server/src/__tests__/globalTeardown.ts`

- [ ] **Step 1: Create server/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  closets   Closet[]
  capsules  Capsule[]
  trips     Trip[]
}

model Closet {
  id          String       @id @default(cuid())
  userId      String
  name        String
  description String?
  createdAt   DateTime     @default(now())
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       ClosetItem[]
}

model ClosetItem {
  id        String        @id @default(cuid())
  closetId  String
  name      String
  photoUrl  String?
  category  ItemCategory
  color     String?
  climate   Climate?
  size      String?
  brand     String?
  notes     String?
  createdAt DateTime      @default(now())
  closet    Closet        @relation(fields: [closetId], references: [id], onDelete: Cascade)
  capsules  CapsuleItem[]
}

enum ItemCategory {
  tops
  bottoms
  dresses
  shoes
  accessories
  outerwear
}

enum Climate {
  tropical
  temperate
  cold
  layering
}

model Capsule {
  id          String        @id @default(cuid())
  userId      String
  name        String
  description String?
  createdAt   DateTime      @default(now())
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       CapsuleItem[]
  trips       TripCapsule[]
}

model CapsuleItem {
  capsuleId    String
  closetItemId String
  capsule      Capsule    @relation(fields: [capsuleId], references: [id], onDelete: Cascade)
  closetItem   ClosetItem @relation(fields: [closetItemId], references: [id], onDelete: Cascade)

  @@id([capsuleId, closetItemId])
}

model Trip {
  id          String        @id @default(cuid())
  userId      String
  name        String
  destination String
  startDate   DateTime
  endDate     DateTime
  createdAt   DateTime      @default(now())
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  capsules    TripCapsule[]
}

model TripCapsule {
  tripId    String
  capsuleId String
  trip      Trip    @relation(fields: [tripId], references: [id], onDelete: Cascade)
  capsule   Capsule @relation(fields: [capsuleId], references: [id], onDelete: Cascade)

  @@id([tripId, capsuleId])
}
```

- [ ] **Step 2: Run initial migration**

```bash
cd server
cp .env.example .env  # fill in real DATABASE_URL
npx prisma migrate dev --name init
npx prisma generate
```

Expected: migration file created under `prisma/migrations/`, Prisma client generated.

- [ ] **Step 3: Create server/prisma/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 'user_1' },
    update: {},
    create: {
      id: 'user_1',
      email: 'eva@capsule.local',
    },
  });

  await prisma.closet.upsert({
    where: { id: 'closet_default' },
    update: {},
    create: {
      id: 'closet_default',
      userId: user.id,
      name: 'My Closet',
      description: null,
    },
  });

  console.log('Seed complete: user_1 + default closet');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Run seed**

```bash
cd server && npm run db:seed
```

Expected output: `Seed complete: user_1 + default closet`

- [ ] **Step 5: Create test DB setup/teardown**

Create `server/src/__tests__/globalSetup.ts`:

```typescript
import { execSync } from 'child_process';

export default async function globalSetup() {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
}
```

Create `server/src/__tests__/globalTeardown.ts`:

```typescript
export default async function globalTeardown() {
  // Connection pool cleanup handled by individual test files
}
```

- [ ] **Step 6: Commit**

```bash
git add server/prisma/ server/src/__tests__/global*.ts
git commit -m "feat: prisma schema, migration, seed, test db setup"
```

---

## Phase 3: Core API Infrastructure

### Task 4: Prisma singleton + Express app

**Files:**
- Create: `server/src/lib/prisma.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server/src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
```

- [ ] **Step 2: Create server/src/middleware/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  res.status(statusCode).json({ error: err.message ?? 'Internal server error' });
}
```

- [ ] **Step 3: Create server/src/app.ts**

```typescript
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Routes wired in Task 13
  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 4: Create server/src/index.ts**

```typescript
import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT ?? 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Verify server starts**

```bash
cd server && npm run dev
# curl http://localhost:3001/health → {"ok":true}
```

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: express app, prisma singleton, error handler"
```

---

## Phase 4: Closets & Items API

### Task 5: Closets routes (TDD)

**Files:**
- Create: `server/src/__tests__/closets.test.ts`
- Create: `server/src/routes/closets.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/closets.test.ts`:

```typescript
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';

const app = createApp();
const USER_ID = 'user_1';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'test@capsule.local' },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.closet.deleteMany({ where: { userId: USER_ID } });
});

describe('GET /api/closets', () => {
  it('returns list of closets', async () => {
    await prisma.closet.create({
      data: { userId: USER_ID, name: 'Test Closet' },
    });
    const res = await request(app).get('/api/closets');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Test Closet');
  });
});

describe('POST /api/closets', () => {
  it('creates a closet', async () => {
    const res = await request(app)
      .post('/api/closets')
      .send({ name: 'New Closet', description: 'My wardrobe' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Closet');
    expect(res.body.userId).toBe(USER_ID);
  });
});

describe('GET /api/closets/:id', () => {
  it('returns a single closet', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Single' },
    });
    const res = await request(app).get(`/api/closets/${closet.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(closet.id);
  });

  it('returns 404 for missing closet', async () => {
    const res = await request(app).get('/api/closets/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/closets/:id', () => {
  it('updates a closet', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Old Name' },
    });
    const res = await request(app)
      .put(`/api/closets/${closet.id}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });
});

describe('DELETE /api/closets/:id', () => {
  it('deletes a closet', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Delete Me' },
    });
    const res = await request(app).delete(`/api/closets/${closet.id}`);
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (routes not wired)**

```bash
cd server && npm test -- --testPathPattern=closets
```

Expected: all tests fail with 404 (no routes yet).

- [ ] **Step 3: Create server/src/routes/closets.ts**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();
const USER_ID = 'user_1'; // hardcoded for v1; replace with req.user.id when auth added

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const closets = await prisma.closet.findMany({ where: { userId: USER_ID } });
    res.json(closets);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name, description: description ?? null },
    });
    res.status(201).json(closet);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await prisma.closet.findUnique({ where: { id: req.params.id } });
    if (!closet) return res.status(404).json({ error: 'Closet not found' });
    res.json(closet);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closet = await prisma.closet.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(closet);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.closet.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 4: Wire route into app.ts**

```typescript
// add to server/src/app.ts imports:
import closetsRouter from './routes/closets';

// add after health route:
app.use('/api/closets', closetsRouter);
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd server && npm test -- --testPathPattern=closets
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/closets.ts server/src/__tests__/closets.test.ts server/src/app.ts
git commit -m "feat: closets CRUD API"
```

---

### Task 6: Items routes (TDD)

**Files:**
- Create: `server/src/__tests__/items.test.ts`
- Create: `server/src/routes/items.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/items.test.ts`:

```typescript
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';

const app = createApp();
const USER_ID = 'user_1';
let closetId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'test@capsule.local' },
  });
  const closet = await prisma.closet.create({
    data: { id: 'test_closet', userId: USER_ID, name: 'Test Closet' },
  });
  closetId = closet.id;
});

afterAll(async () => {
  await prisma.closetItem.deleteMany({ where: { closetId } });
  await prisma.closet.delete({ where: { id: closetId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.closetItem.deleteMany({ where: { closetId } });
});

describe('GET /api/closets/:id/items', () => {
  it('returns items in a closet', async () => {
    await prisma.closetItem.create({
      data: { closetId, name: 'Blue Shirt', category: 'tops', color: 'blue' },
    });
    const res = await request(app).get(`/api/closets/${closetId}/items`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Blue Shirt');
  });

  it('filters by category', async () => {
    await prisma.closetItem.createMany({
      data: [
        { closetId, name: 'Shirt', category: 'tops' },
        { closetId, name: 'Jeans', category: 'bottoms' },
      ],
    });
    const res = await request(app).get(`/api/closets/${closetId}/items?category=tops`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('tops');
  });

  it('includes capsuleCount on each item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Shared Item', category: 'tops' },
    });
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Test Capsule' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: capsule.id, closetItemId: item.id },
    });
    const res = await request(app).get(`/api/closets/${closetId}/items`);
    const found = res.body.find((i: { id: string }) => i.id === item.id);
    expect(found.capsuleCount).toBe(1);
    await prisma.capsuleItem.deleteMany({ where: { capsuleId: capsule.id } });
    await prisma.capsule.delete({ where: { id: capsule.id } });
  });
});

describe('POST /api/closets/:id/items', () => {
  it('creates an item', async () => {
    const res = await request(app)
      .post(`/api/closets/${closetId}/items`)
      .send({ name: 'Linen Top', category: 'tops', color: 'white', size: 'S', brand: 'Everlane' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Linen Top');
    expect(res.body.brand).toBe('Everlane');
  });
});

describe('GET /api/items/:id', () => {
  it('returns a single item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Single Item', category: 'shoes' },
    });
    const res = await request(app).get(`/api/items/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(item.id);
  });
});

describe('PUT /api/items/:id', () => {
  it('updates an item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Old Name', category: 'tops' },
    });
    const res = await request(app)
      .put(`/api/items/${item.id}`)
      .send({ name: 'Updated Name', size: 'M' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.size).toBe('M');
  });
});

describe('DELETE /api/items/:id', () => {
  it('deletes an item', async () => {
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Delete Me', category: 'tops' },
    });
    const res = await request(app).delete(`/api/items/${item.id}`);
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd server && npm test -- --testPathPattern=items
```

- [ ] **Step 3: Create server/src/routes/items.ts**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { ItemCategory, Climate } from '@capsule/shared';

const router = Router();
const USER_ID = 'user_1';

// GET /api/closets/:id/items — list items with optional filters + capsuleCount
router.get('/closets/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, color, climate } = req.query as {
      category?: ItemCategory;
      color?: string;
      climate?: Climate;
    };

    const items = await prisma.closetItem.findMany({
      where: {
        closetId: req.params.id,
        ...(category && { category }),
        ...(color && { color: { contains: color, mode: 'insensitive' } }),
        ...(climate && { climate }),
      },
      include: {
        _count: { select: { capsules: true } },
      },
    });

    const result = items.map(({ _count, ...item }) => ({
      ...item,
      capsuleCount: _count.capsules,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/closets/:id/items
router.post('/closets/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.closetItem.create({
      data: { closetId: req.params.id, ...req.body },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id
router.get('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.closetItem.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { capsules: true } } },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { _count, ...rest } = item;
    res.json({ ...rest, capsuleCount: _count.capsules });
  } catch (err) {
    next(err);
  }
});

// PUT /api/items/:id
router.put('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.closetItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/items/:id
router.delete('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.closetItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 4: Wire into app.ts**

```typescript
// add to server/src/app.ts:
import itemsRouter from './routes/items';
app.use('/api', itemsRouter);
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd server && npm test -- --testPathPattern=items
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/items.ts server/src/__tests__/items.test.ts server/src/app.ts
git commit -m "feat: closet items CRUD API with filtering and capsuleCount"
```

---

## Phase 5: Photo Upload

### Task 7: R2 client + upload route

**Files:**
- Create: `server/src/lib/r2.ts`
- Create: `server/src/routes/upload.ts`
- Create: `server/src/__tests__/upload.test.ts`

- [ ] **Step 1: Create server/src/lib/r2.ts**

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME ?? 'capsule-wardrobe-photos';

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function getSignedReadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
}
```

- [ ] **Step 2: Write failing upload test**

Create `server/src/__tests__/upload.test.ts`:

```typescript
import request from 'supertest';
import { createApp } from '../app';
import { uploadToR2, getSignedReadUrl } from '../lib/r2';
import path from 'path';
import fs from 'fs';

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue(undefined),
  getSignedReadUrl: jest.fn().mockResolvedValue('https://r2.example.com/signed-url'),
  BUCKET: 'test-bucket',
}));

const app = createApp();

describe('POST /api/upload', () => {
  it('uploads a file and returns key + url', async () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test.jpg');
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));

    const res = await request(app)
      .post('/api/upload')
      .attach('photo', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('key');
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.key).toBe('string');
    expect(uploadToR2).toHaveBeenCalled();
    expect(getSignedReadUrl).toHaveBeenCalledWith(res.body.key);

    fs.rmSync(testImagePath);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd server && npm test -- --testPathPattern=upload
```

- [ ] **Step 4: Create server/src/routes/upload.ts**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { uploadToR2, getSignedReadUrl } from '../lib/r2';

// Add uuid to server/package.json dependencies: "uuid": "^9.0.1", "@types/uuid": "^9.0.8"

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const ext = req.file.originalname.split('.').pop() ?? 'jpg';
    const key = `items/${uuidv4()}.${ext}`;

    await uploadToR2(key, req.file.buffer, req.file.mimetype);
    const url = await getSignedReadUrl(key);

    res.json({ key, url });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 5: Add uuid dep + wire route**

```bash
cd server && npm install uuid && npm install -D @types/uuid
```

In `server/src/app.ts`:
```typescript
import uploadRouter from './routes/upload';
app.use('/api/upload', uploadRouter);
```

- [ ] **Step 6: Run test — expect PASS**

```bash
cd server && npm test -- --testPathPattern=upload
```

- [ ] **Step 7: Commit**

```bash
git add server/src/lib/r2.ts server/src/routes/upload.ts server/src/__tests__/upload.test.ts server/src/app.ts
git commit -m "feat: R2 photo upload route"
```

---

## Phase 6: Capsules & Trips API

### Task 8: Capsules routes (TDD)

**Files:**
- Create: `server/src/__tests__/capsules.test.ts`
- Create: `server/src/routes/capsules.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/capsules.test.ts`:

```typescript
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';

const app = createApp();
const USER_ID = 'user_1';
let closetId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'test@capsule.local' },
  });
  const closet = await prisma.closet.create({
    data: { userId: USER_ID, name: 'Capsule Test Closet' },
  });
  closetId = closet.id;
});

afterAll(async () => {
  await prisma.closet.deleteMany({ where: { id: closetId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.capsule.deleteMany({ where: { userId: USER_ID } });
});

describe('POST /api/capsules', () => {
  it('creates a capsule', async () => {
    const res = await request(app)
      .post('/api/capsules')
      .send({ name: 'Japan Trip Essentials', description: 'Carry-on only' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Japan Trip Essentials');
  });
});

describe('GET /api/capsules', () => {
  it('returns all capsules', async () => {
    await prisma.capsule.createMany({
      data: [
        { userId: USER_ID, name: 'Capsule A' },
        { userId: USER_ID, name: 'Capsule B' },
      ],
    });
    const res = await request(app).get('/api/capsules');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/capsules/:id', () => {
  it('returns capsule with embedded items and capsuleCount', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'With Items' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Test Item', category: 'tops' },
    });
    // add same item to a second capsule to test capsuleCount > 1
    const capsule2 = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Second Capsule' },
    });
    await prisma.capsuleItem.createMany({
      data: [
        { capsuleId: capsule.id, closetItemId: item.id },
        { capsuleId: capsule2.id, closetItemId: item.id },
      ],
    });

    const res = await request(app).get(`/api/capsules/${capsule.id}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].capsuleCount).toBe(2);
  });
});

describe('POST /api/capsules/:id/items/:itemId', () => {
  it('adds an item to a capsule', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Empty Capsule' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Add Me', category: 'shoes' },
    });
    const res = await request(app).post(`/api/capsules/${capsule.id}/items/${item.id}`);
    expect(res.status).toBe(201);
    const check = await prisma.capsuleItem.findUnique({
      where: { capsuleId_closetItemId: { capsuleId: capsule.id, closetItemId: item.id } },
    });
    expect(check).not.toBeNull();
  });
});

describe('DELETE /api/capsules/:id/items/:itemId', () => {
  it('removes an item from a capsule', async () => {
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Full Capsule' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId, name: 'Remove Me', category: 'tops' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: capsule.id, closetItemId: item.id },
    });
    const res = await request(app).delete(`/api/capsules/${capsule.id}/items/${item.id}`);
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd server && npm test -- --testPathPattern=capsules
```

- [ ] **Step 3: Create server/src/routes/capsules.ts**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();
const USER_ID = 'user_1';

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const capsules = await prisma.capsule.findMany({ where: { userId: USER_ID } });
    res.json(capsules);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name, description: description ?? null },
    });
    res.status(201).json(capsule);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await prisma.capsule.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            closetItem: {
              include: { _count: { select: { capsules: true } } },
            },
          },
        },
      },
    });
    if (!capsule) return res.status(404).json({ error: 'Capsule not found' });

    const result = {
      ...capsule,
      items: capsule.items.map(({ closetItem }) => {
        const { _count, ...item } = closetItem;
        return { ...item, capsuleCount: _count.capsules };
      }),
    };
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capsule = await prisma.capsule.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(capsule);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.capsule.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.capsuleItem.create({
      data: { capsuleId: req.params.id, closetItemId: req.params.itemId },
    });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.capsuleItem.delete({
      where: {
        capsuleId_closetItemId: {
          capsuleId: req.params.id,
          closetItemId: req.params.itemId,
        },
      },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: Wire into app.ts**

```typescript
import capsulesRouter from './routes/capsules';
app.use('/api/capsules', capsulesRouter);
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd server && npm test -- --testPathPattern=capsules
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/capsules.ts server/src/__tests__/capsules.test.ts server/src/app.ts
git commit -m "feat: capsules CRUD API with item add/remove"
```

---

### Task 9: Trips routes (TDD)

**Files:**
- Create: `server/src/__tests__/trips.test.ts`
- Create: `server/src/routes/trips.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/trips.test.ts`:

```typescript
import request from 'supertest';
import { createApp } from '../app';
import prisma from '../lib/prisma';

const app = createApp();
const USER_ID = 'user_1';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'test@capsule.local' },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.trip.deleteMany({ where: { userId: USER_ID } });
});

describe('POST /api/trips', () => {
  it('creates a trip', async () => {
    const res = await request(app).post('/api/trips').send({
      name: 'Japan 2026',
      destination: 'Tokyo, Japan',
      startDate: '2026-10-01',
      endDate: '2026-10-14',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Japan 2026');
    expect(res.body.destination).toBe('Tokyo, Japan');
  });
});

describe('GET /api/trips', () => {
  it('returns all trips', async () => {
    await prisma.trip.create({
      data: {
        userId: USER_ID,
        name: 'Test Trip',
        destination: 'Paris',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-07'),
      },
    });
    const res = await request(app).get('/api/trips');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/trips/:id', () => {
  it('returns trip with embedded capsules and items', async () => {
    const closet = await prisma.closet.create({
      data: { userId: USER_ID, name: 'Trip Test Closet' },
    });
    const item = await prisma.closetItem.create({
      data: { closetId: closet.id, name: 'Pack Me', category: 'tops' },
    });
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Trip Capsule' },
    });
    await prisma.capsuleItem.create({
      data: { capsuleId: capsule.id, closetItemId: item.id },
    });
    const trip = await prisma.trip.create({
      data: {
        userId: USER_ID,
        name: 'Embedded Trip',
        destination: 'Seoul',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-10'),
      },
    });
    await prisma.tripCapsule.create({
      data: { tripId: trip.id, capsuleId: capsule.id },
    });

    const res = await request(app).get(`/api/trips/${trip.id}`);
    expect(res.status).toBe(200);
    expect(res.body.capsules).toHaveLength(1);
    expect(res.body.capsules[0].items).toHaveLength(1);
    expect(res.body.capsules[0].items[0].name).toBe('Pack Me');
  });
});

describe('POST /api/trips/:id/capsules/:capsuleId', () => {
  it('links a capsule to a trip', async () => {
    const trip = await prisma.trip.create({
      data: {
        userId: USER_ID, name: 'Link Trip', destination: 'Berlin',
        startDate: new Date('2026-08-01'), endDate: new Date('2026-08-07'),
      },
    });
    const capsule = await prisma.capsule.create({
      data: { userId: USER_ID, name: 'Link Capsule' },
    });
    const res = await request(app).post(`/api/trips/${trip.id}/capsules/${capsule.id}`);
    expect(res.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd server && npm test -- --testPathPattern=trips
```

- [ ] **Step 3: Create server/src/routes/trips.ts**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();
const USER_ID = 'user_1';

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.trip.findMany({ where: { userId: USER_ID } });
    res.json(trips);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, destination, startDate, endDate } = req.body as {
      name: string; destination: string; startDate: string; endDate: string;
    };
    const trip = await prisma.trip.create({
      data: {
        userId: USER_ID, name, destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    res.status(201).json(trip);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        capsules: {
          include: {
            capsule: {
              include: {
                items: {
                  include: { closetItem: true },
                },
              },
            },
          },
        },
      },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const result = {
      ...trip,
      capsules: trip.capsules.map(({ capsule }) => ({
        ...capsule,
        items: capsule.items.map(({ closetItem }) => closetItem),
      })),
    };
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, ...rest } = req.body;
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });
    res.json(trip);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/capsules/:capsuleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.tripCapsule.create({
      data: { tripId: req.params.id, capsuleId: req.params.capsuleId },
    });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id/capsules/:capsuleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.tripCapsule.delete({
      where: {
        tripId_capsuleId: { tripId: req.params.id, capsuleId: req.params.capsuleId },
      },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: Wire into app.ts + finalize all routes**

Replace `server/src/app.ts` with the final wired version:

```typescript
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { errorHandler } from './middleware/errorHandler';
import closetsRouter from './routes/closets';
import itemsRouter from './routes/items';
import capsulesRouter from './routes/capsules';
import tripsRouter from './routes/trips';
import uploadRouter from './routes/upload';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/closets', closetsRouter);
  app.use('/api', itemsRouter);
  app.use('/api/capsules', capsulesRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/upload', uploadRouter);

  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 5: Run all backend tests**

```bash
cd server && npm test
```

Expected: all test suites pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/trips.ts server/src/__tests__/trips.test.ts server/src/app.ts
git commit -m "feat: trips CRUD API with capsule linking + all routes wired"
```
