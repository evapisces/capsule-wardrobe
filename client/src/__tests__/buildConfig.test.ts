import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

// Guards the fix for issue #11: a bare `tsc` used to emit compiled `.js` files
// next to every source file, which Vite/Vitest then resolved in preference to
// the real `.ts`/`.tsx` sources. The client must only ever type-check, never emit.

const clientRoot = resolve(__dirname, '../..');

function readJson(relativePath: string): Record<string, unknown> {
  const raw = readFileSync(resolve(clientRoot, relativePath), 'utf-8');
  return JSON.parse(raw);
}

describe('client build config (issue #11)', () => {
  it('tsconfig.json sets noEmit so tsc only type-checks', () => {
    const tsconfig = readJson('tsconfig.json') as {
      compilerOptions?: Record<string, unknown>;
    };
    expect(tsconfig.compilerOptions?.noEmit).toBe(true);
  });

  it('does not configure an outDir that would emit sources', () => {
    const tsconfig = readJson('tsconfig.json') as {
      compilerOptions?: Record<string, unknown>;
    };
    expect(tsconfig.compilerOptions?.outDir).toBeUndefined();
  });

  it('build script runs tsc with --noEmit before vite build', () => {
    const pkg = readJson('package.json') as { scripts?: Record<string, string> };
    const build = pkg.scripts?.build ?? '';
    expect(build).toMatch(/tsc\s+--noEmit/);
    expect(build).toContain('vite build');
  });
});
