/**
 * Hash-based routes. Hash routing keeps the app a pure static bundle that
 * works from any host or sub-path with no server rewrite rules.
 */
import type { StudyDirection } from './session';

export type Route =
  | { name: 'home' }
  | { name: 'edit'; sheetId: string }
  | { name: 'study'; sheetId: string; direction: StudyDirection }
  | { name: 'notFound' };

export const NEW_SHEET_ID = 'new';

export function parseRoute(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) return { name: 'home' };

  const [section, sheetId, action] = parts;
  if (section !== 'sheets' || !sheetId) return { name: 'notFound' };

  if (action === 'edit' && parts.length === 3) return { name: 'edit', sheetId };

  if (action === 'study' && parts.length === 3) {
    const reverse = new URLSearchParams(query).get('show') === 'definition';
    return { name: 'study', sheetId, direction: reverse ? 'definition' : 'term' };
  }

  return { name: 'notFound' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
    case 'notFound':
      return '#/';
    case 'edit':
      return `#/sheets/${encodeURIComponent(route.sheetId)}/edit`;
    case 'study': {
      const query = route.direction === 'definition' ? '?show=definition' : '';
      return `#/sheets/${encodeURIComponent(route.sheetId)}/study${query}`;
    }
  }
}

export function navigate(route: Route, { replace = false } = {}): void {
  const href = hrefFor(route);

  if (replace) window.location.replace(href);
  else window.location.hash = href;
}
