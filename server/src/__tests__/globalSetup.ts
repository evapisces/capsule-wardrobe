import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';

// Load .env from the server root so DATABASE_URL_TEST is available in global setup
config({ path: path.resolve(process.cwd(), '.env') });

export default async function globalSetup() {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST };
  // Regenerate the Prisma client first so a clean checkout (missing or stale
  // generated client) compiles and runs the suite without a manual
  // `npx prisma generate`.
  execSync('npx prisma generate', { cwd: process.cwd(), env, stdio: 'inherit' });
  execSync('npx prisma migrate deploy', { cwd: process.cwd(), env, stdio: 'inherit' });
}
