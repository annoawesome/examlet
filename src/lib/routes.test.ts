import { describe, expect, it } from 'vitest';

import { hrefFor, parseRoute, type Route } from './routes';

describe('parseRoute', () => {
  it.each<[string, Route]>([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/sheets/abc/edit', { name: 'edit', sheetId: 'abc' }],
    ['#/sheets/abc/study', { name: 'study', sheetId: 'abc', direction: 'term' }],
    ['#/sheets/abc/study?show=definition', { name: 'study', sheetId: 'abc', direction: 'definition' }],
    ['#/nope', { name: 'notFound' }],
    ['#/sheets/abc/edit/extra', { name: 'notFound' }],
  ])('parses %s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('round-trips through hrefFor', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'edit', sheetId: 'a b/c' },
      { name: 'study', sheetId: 'x', direction: 'definition' },
    ];

    for (const route of routes) expect(parseRoute(hrefFor(route))).toEqual(route);
  });
});
