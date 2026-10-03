import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The site is built as a fully static bundle with hash-based routing so it can
 * be hosted from a GitHub Pages project sub-path
 * (`https://nadeem-majeedch.github.io/Operating-Systems-Visual-Lab/`) without
 * server-side rewrites.
 *
 * `base` is the repository path on GitHub Pages: every emitted asset URL is
 * prefixed with it, so CSS, JS, the favicon and public assets all resolve under
 * the project path. Because routing is hash-based, refreshing any deep link
 * always re-requests this same document from the Pages root — no rewrite rule
 * is required (see `public/404.html` for non-hash deep links).
 */
export default defineConfig({
  base: '/Operating-Systems-Visual-Lab/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    open: false,
  },
});
