import { describe, expect, it } from 'vitest';

import { hasContent, moveItem, newDraft, toStored } from './editor';

describe('toStored', () => {
  it('drops blank cards, numbers positions, and names untitled sheets', () => {
    const draft = newDraft(0);
    draft.cards = [
      { id: 'a', term: 'A', definition: 'alpha' },
      { id: 'b', term: '  ', definition: '' },
      { id: 'c', term: '', definition: 'only a definition' },
    ];

    const { sheet, cards } = toStored(draft, 5);

    expect(sheet.title).toBe('Untitled studysheet');
    expect(sheet.updatedAt).toBe(5);
    expect(cards.map((c) => [c.id, c.position, c.sheetId])).toEqual([
      ['a', 0, sheet.id],
      ['c', 1, sheet.id],
    ]);
  });
});

describe('hasContent', () => {
  it('is false for a fresh draft and true once anything is typed', () => {
    const draft = newDraft();
    expect(hasContent(draft)).toBe(false);

    expect(hasContent({ ...draft, sheet: { ...draft.sheet, title: 'x' } })).toBe(true);
  });
});

describe('moveItem', () => {
  it('moves items and ignores out-of-range moves', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
  });
});
