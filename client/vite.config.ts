import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@capsule/shared': path.resolve(__dirname, '../shared/types'),
    },
  },
  server: {
    host: true, // bind to 0.0.0.0 so phones on the same network can connect
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    // Playwright owns everything under `e2e/` — keep Vitest out of it.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
