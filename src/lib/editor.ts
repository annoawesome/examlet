/** Pure helpers for the studysheet editor's draft state. */
import { createId } from './id';
import type { Card, CardDraft, Studysheet, StudysheetWithCards } from './types';

export interface EditorDraft {
  sheet: Studysheet;
  cards: CardDraft[];
}

export function emptyCard(): CardDraft {
  return { id: createId(), term: '', definition: '' };
}

export function newDraft(now = Date.now()): EditorDraft {
  return {
    sheet: { id: createId(), title: '', description: '', createdAt: now, updatedAt: now },
    cards: [emptyCard(), emptyCard()],
  };
}

export function draftFrom({ sheet, cards }: StudysheetWithCards): EditorDraft {
  return {
    sheet,
    cards: cards.length > 0 ? cards.map(({ id, term, definition }) => ({ id, term, definition })) : [emptyCard()],
  };
}

export function isBlank(card: CardDraft): boolean {
  return !card.term.trim() && !card.definition.trim();
}

/** True once the user has typed anything worth persisting. */
export function hasContent(draft: EditorDraft): boolean {
  return Boolean(draft.sheet.title.trim() || draft.sheet.description.trim() || draft.cards.some((c) => !isBlank(c)));
}

/** Converts a draft into what gets stored. Blank rows are not saved. */
export function toStored(draft: EditorDraft, now = Date.now()): StudysheetWithCards {
  const sheet: Studysheet = {
    ...draft.sheet,
    title: draft.sheet.title.trim() || 'Untitled studysheet',
    updatedAt: now,
  };

  const cards: Card[] = draft.cards
    .filter((card) => !isBlank(card))
    .map((card, position) => ({ ...card, sheetId: sheet.id, position }));

  return { sheet, cards };
}

export function moveItem<T>(items: readonly T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return [...items];

  const result = [...items];
  const [item] = result.splice(index, 1);
  result.splice(target, 0, item as T);
  return result;
}
