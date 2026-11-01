import type { Card } from '../lib/types';

export function makeCards(count: number, sheetId = 'sheet-1'): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i + 1}`,
    sheetId,
    term: `Term ${i + 1}`,
    definition: `Definition ${i + 1}`,
    position: i,
  }));
}

/** A deterministic RandomSource (mulberry32) for repeatable shuffles. */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let dbCounter = 0;

/** A unique database name so tests never share IndexedDB state. */
export function uniqueDbName(): string {
  dbCounter++;
  return `examlet-test-${dbCounter}-${Math.random().toString(36).slice(2)}`;
}
