import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { Plugin } from 'vite';

export const SERVICE_WORKER_FILE = 'sw.js';

const TEMPLATE_PATH = new URL('./sw.js', import.meta.url);

/**
 * Font formats left out of the precache. KaTeX's CSS lists WOFF2 first and
 * every browser with service workers supports it, so the WOFF and TTF copies
 * would only double the download.
 */
const SKIPPED = /\.(woff|ttf|eot|map)$/;

/** Picks the build files the service worker caches on install, sorted. */
export function precacheList(fileNames: Iterable<string>): string[] {
  return [...fileNames]
    .filter((name) => name !== SERVICE_WORKER_FILE && !SKIPPED.test(name) && !name.split('/').some((part) => part.startsWith('.')))
    .sort();
}

/**
 * The URL a build file is precached under. index.html goes under the scope
 * root, the URL navigations use. Many hosts redirect /index.html → /, and a
 * cached redirected response cannot answer a navigation.
 */
export function precacheUrl(fileName: string): string {
  return fileName === 'index.html' ? './' : fileName;
}

/** Fills the service worker template's placeholders. */
export function renderServiceWorker(template: string, files: string[], version: string): string {
  const filled = template
    .replace('__EXAMLET_VERSION__', JSON.stringify(version))
    .replace('__EXAMLET_PRECACHE__', JSON.stringify(files));

  if (filled.includes('__EXAMLET_')) throw new Error('Service worker template has an unfilled placeholder.');
  return filled;
}

/**
 * Emits dist/sw.js with the list of build files to precache and a version
 * hash of their contents and the worker's own code. The browser compares
 * sw.js byte for byte, so any change to either is picked up as an update.
 */
export function serviceWorker(): Plugin {
  let publicDir = '';

  return {
    name: 'examlet:service-worker',
    apply: 'build',
    // Run after Vite's HTML plugin so index.html is already in the bundle.
    enforce: 'post',

    configResolved(config) {
      publicDir = config.publicDir;
    },

    generateBundle(_options, bundle) {
      const contents = new Map<string, string | Uint8Array>();

      for (const output of Object.values(bundle)) {
        contents.set(output.fileName, output.type === 'chunk' ? output.code : output.source);
      }

      // Public files are copied into dist after bundling, so read them from disk.
      if (publicDir) {
        for (const entry of readdirSync(publicDir, { recursive: true, withFileTypes: true })) {
          if (!entry.isFile()) continue;
          const path = join(entry.parentPath, entry.name);
          contents.set(relative(publicDir, path).split(sep).join('/'), readFileSync(path));
        }
      }

      const template = readFileSync(TEMPLATE_PATH, 'utf8');
      const files = precacheList(contents.keys());
      const hash = createHash('sha256').update(template);
      for (const file of files) hash.update(file).update('\0').update(contents.get(file)!).update('\0');

      this.emitFile({
        type: 'asset',
        fileName: SERVICE_WORKER_FILE,
        source: renderServiceWorker(template, files.map(precacheUrl), hash.digest('hex').slice(0, 16)),
      });
    },
  };
}
