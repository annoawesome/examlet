/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { serviceWorker } from './pwa/serviceWorkerPlugin.ts';

/**
 * Production-only Content Security Policy. The app has no backend, so it
 * never needs to talk to another origin. Dev mode is excluded because the
 * React refresh preamble is an inline script.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  // KaTeX emits inline style attributes for layout.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'examlet:csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy(), serviceWorker()],
  base: './',

  // KaTeX is ~270 kB and needed on every card view, so splitting it out
  // would not shorten the critical path.
  build: {
    chunkSizeWarningLimit: 600,

    // Keep fonts as files so the CSP's `font-src 'self'` can stay strict.
    assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf|eot)$/.test(filePath) ? false : undefined),
  },

  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
