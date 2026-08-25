import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve('apps/admin-local'),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    host: '127.0.0.1',
    port: 5174
  }
});
