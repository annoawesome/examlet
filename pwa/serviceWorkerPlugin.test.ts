// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { precacheList, precacheUrl, renderServiceWorker } from './serviceWorkerPlugin';

describe('precacheList', () => {
  it('keeps app files and WOFF2 fonts, sorted', () => {
    expect(
      precacheList([
        'index.html',
        'assets/index-abc.js',
        'assets/KaTeX_Main-Regular-1.woff2',
        'assets/KaTeX_Main-Regular-2.woff',
        'assets/KaTeX_Main-Regular-3.ttf',
        'assets/index-abc.js.map',
        'icons/icon-192.png',
        'manifest.webmanifest',
      ]),
    ).toEqual(['assets/KaTeX_Main-Regular-1.woff2', 'assets/index-abc.js', 'icons/icon-192.png', 'index.html', 'manifest.webmanifest']);
  });

  it('leaves out the service worker itself and dotfiles', () => {
    expect(precacheList(['sw.js', '.DS_Store', 'icons/.DS_Store', 'favicon.svg'])).toEqual(['favicon.svg']);
  });
});

describe('precacheUrl', () => {
  it('caches index.html under the scope root, which navigations request', () => {
    expect(precacheUrl('index.html')).toBe('./');
  });

  it('keeps other files as they are', () => {
    expect(precacheUrl('assets/index-abc.js')).toBe('assets/index-abc.js');
    expect(precacheUrl('icons/index.html')).toBe('icons/index.html');
  });
});

describe('renderServiceWorker', () => {
  const template = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

  it('fills the template with the file list and version', () => {
    const output = renderServiceWorker(template, ['./', 'assets/a.js'], 'abc123');

    expect(output).toContain('const VERSION = "abc123";');
    expect(output).toContain('const PRECACHE = ["./","assets/a.js"];');
    expect(output).not.toContain('__EXAMLET_');
  });

  it('rejects a template with a placeholder it does not know', () => {
    expect(() => renderServiceWorker(`${template}\n__EXAMLET_OTHER__`, [], 'v')).toThrow(/placeholder/);
  });
});
