import { describe, expect, it } from 'vitest';

import { seededRandom } from '../test/fixtures';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const result = shuffle(items, seededRandom(1));

    expect(result).toHaveLength(items.length);
    expect([...result].sort((a, b) => a - b)).toEqual(items);
  });

  it('does not mutate the input', () => {
    const items = [1, 2, 3, 4];
    shuffle(items, seededRandom(2));

    expect(items).toEqual([1, 2, 3, 4]);
  });

  it('actually reorders items', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);

    expect(shuffle(items, seededRandom(3))).not.toEqual(items);
  });

  it('handles empty and single-item arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['only'])).toEqual(['only']);
  });
});
