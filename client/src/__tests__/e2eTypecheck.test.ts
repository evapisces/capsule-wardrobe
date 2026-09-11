import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, describe, expect, it } from 'vitest';

// Guards issue #15: `client/e2e/` is outside `client/tsconfig.json`'s
// `include: ["src"]` and Playwright never type-checks the files it runs, so the
// hand-built fixtures in `e2e/fixtures/api.ts` could silently drift from the
// `@capsule/shared` API contract. `e2e/tsconfig.json` + the
// `test:e2e:typecheck` script close that gap; this suite proves both that the
// project is wired up and that a real shape mismatch is a compile error.

const clientRoot = resolve(__dirname, '../..');
const tsc = resolve(clientRoot, 'node_modules/typescript/bin/tsc');
const e2eTsconfig = resolve(clientRoot, 'e2e/tsconfig.json');
const apiFixture = resolve(clientRoot, 'e2e/fixtures/api.ts');

// tsc cold starts are well over the 5s default.
const TSC_TIMEOUT = 120_000;

interface TscResult {
  ok: boolean;
  output: string;
}

function runTsc(projectPath: string): TscResult {
  try {
    execFileSync(process.execPath, [tsc, '-p', projectPath, '--pretty', 'false'], {
      cwd: clientRoot,
      stdio: 'pipe',
    });
    return { ok: true, output: '' };
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer };
    return {
      ok: false,
      output: `${e.stdout?.toString() ?? ''}${e.stderr?.toString() ?? ''}`,
    };
  }
}

describe('e2e fixtures type-check against @capsule/shared (issue #15)', () => {
  it('e2e/tsconfig.json is a checking-only project that covers the whole dir', () => {
    const cfg = JSON.parse(readFileSync(e2eTsconfig, 'utf-8')) as {
      extends?: string;
      compilerOptions?: Record<string, unknown>;
      include?: string[];
    };
    expect(cfg.extends).toBe('../tsconfig.json');
    expect(cfg.compilerOptions?.noEmit).toBe(true);
    expect(cfg.include).toContain('.');
    expect(
      (cfg.compilerOptions?.paths as Record<string, string[]> | undefined)?.[
        '@capsule/shared'
      ],
    ).toBeDefined();
  });

  it('exposes a test:e2e:typecheck script that checks the e2e project', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(clientRoot, 'package.json'), 'utf-8'),
    ) as { scripts?: Record<string, string> };
    const script = pkg.scripts?.['test:e2e:typecheck'] ?? '';
    expect(script).toMatch(/tsc\b/);
    expect(script).toContain('e2e/tsconfig.json');
  });

  it('the committed e2e suite type-checks cleanly', () => {
    const result = runTsc(e2eTsconfig);
    expect(result.output).toBe('');
    expect(result.ok).toBe(true);
  }, TSC_TIMEOUT);

  describe('a deliberate fixture/@capsule/shared mismatch', () => {
    const scratch = mkdtempSync(resolve(clientRoot, 'e2e/__typecheck_probe_'));

    afterAll(() => {
      rmSync(scratch, { recursive: true, force: true });
    });

    it('fails tsc (and therefore CI)', () => {
      // A fixture whose shape no longer matches its `@capsule/shared` type — the
      // exact drift this project is meant to catch.
      writeFileSync(
        resolve(scratch, 'drift.ts'),
        [
          "import type { Trip } from '@capsule/shared';",
          '',
          'export const staleTrip: Trip = {',
          "  id: 'trip-x',",
          "  userId: 'user-x',",
          "  name: 'Stale',",
          "  destination: 'Nowhere',",
          "  startDate: '2025-01-01T00:00:00.000Z',",
          "  endDate: '2025-01-08T00:00:00.000Z',",
          "  createdAt: '2025-01-01T00:00:00.000Z',",
          "  autoLogEnabled: 'yes',",
          '};',
          '',
        ].join('\n'),
      );

      const result = runTsc(e2eTsconfig);
      expect(result.ok).toBe(false);
      expect(result.output).toMatch(/drift\.ts/);
      expect(result.output).toMatch(/autoLogEnabled|not assignable/);
    }, TSC_TIMEOUT);
  });

  // Issue #17: the list-endpoint fixtures used to be returned as bare `[]`, so
  // tsc checked nothing for them. Now each is a typed const
  // (`const CLOSET_ITEMS: ClosetItem[] = []` etc.), so a mistyped element in one
  // of those previously-unchecked fixtures must break the type-check too.
  describe('a wrong-typed element in a previously-unchecked list fixture', () => {
    const original = readFileSync(apiFixture, 'utf-8');

    afterAll(() => {
      writeFileSync(apiFixture, original);
    });

    it('fails tsc when a ClosetItem fixture element has a mistyped field', () => {
      expect(original).toContain('const CLOSET_ITEMS: ClosetItem[] = [];');
      writeFileSync(
        apiFixture,
        original.replace(
          'const CLOSET_ITEMS: ClosetItem[] = [];',
          // `category` is `ItemCategory`, never a number.
          "const CLOSET_ITEMS: ClosetItem[] = [{ id: 'x', closetId: 'c', name: 'n', photoUrl: null, category: 99, color: null, climate: null, size: null, brand: null, notes: null, pricePaid: null, createdAt: '2024-01-01T00:00:00.000Z' }];",
        ),
      );

      const result = runTsc(e2eTsconfig);
      expect(result.ok).toBe(false);
      expect(result.output).toMatch(/fixtures[/\\]api\.ts/);
      expect(result.output).toMatch(/category|not assignable/);
    }, TSC_TIMEOUT);
  });
});
