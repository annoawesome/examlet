import { describe, expect, it } from 'vitest';

import exampleFile from '../../examples/modern-algebra-exam-2.studysheet.json?raw';
import { makeCards } from '../test/fixtures';
import { FILE_FORMAT, StudysheetFileError, fileNameFor, parseStudysheetFile, serializeStudysheet } from './studysheetFile';
import type { Studysheet } from './types';

const sheet: Studysheet = {
  id: 'sheet-1',
  title: 'Modern Algebra Exam 2',
  description: 'Groups, rings, and fields',
  createdAt: 1,
  updatedAt: 2,
};

describe('serializeStudysheet / parseStudysheetFile', () => {
  it('round-trips content with fresh ids', () => {
    const cards = makeCards(3);
    const text = serializeStudysheet({ sheet, cards }, new Date('2026-01-01T00:00:00Z'));

    const imported = parseStudysheetFile(text, 99);

    expect(imported.sheet.id).not.toBe(sheet.id);
    expect(imported.sheet).toMatchObject({ title: sheet.title, description: sheet.description, createdAt: 99, updatedAt: 99 });
    expect(imported.cards.map(({ term, definition, position }) => ({ term, definition, position }))).toEqual(
      cards.map(({ term, definition, position }) => ({ term, definition, position })),
    );
    expect(imported.cards.every((card) => card.sheetId === imported.sheet.id)).toBe(true);
  });

  it('does not leak internal ids into the file', () => {
    const text = serializeStudysheet({ sheet, cards: makeCards(1) });

    expect(text).not.toContain('sheet-1');
    expect(text).not.toContain('card-1');
    expect(JSON.parse(text).format).toBe(FILE_FORMAT);
  });

  it('preserves LaTeX and very long definitions exactly', () => {
    const long = `$$\\int_0^1 x\\,dx$$ ${'lorem ipsum '.repeat(2000)}`;
    const text = serializeStudysheet({ sheet, cards: [{ ...makeCards(1)[0]!, definition: long }] });

    expect(parseStudysheetFile(text).cards[0]!.definition).toBe(long);
  });

  it.each([
    ['not json', 'not valid JSON'],
    ['{"format":"other"}', 'not an Examlet studysheet'],
    ['{"format":"examlet.studysheet","version":99}', 'Unsupported'],
    ['{"format":"examlet.studysheet","version":1,"studysheet":{"title":"x"}}', 'missing its title or cards'],
    ['{"format":"examlet.studysheet","version":1,"studysheet":{"title":"x","cards":[{"term":1}]}}', 'Card 1'],
  ])('rejects %s', (input, message) => {
    expect(() => parseStudysheetFile(input)).toThrow(StudysheetFileError);
    expect(() => parseStudysheetFile(input)).toThrow(message);
  });

  it('gives untitled imports a name', () => {
    const text = JSON.stringify({ format: FILE_FORMAT, version: 1, studysheet: { title: '  ', cards: [] } });

    expect(parseStudysheetFile(text).sheet.title).toBe('Imported studysheet');
  });
});

describe('fileNameFor', () => {
  it('slugifies the title', () => {
    expect(fileNameFor('Modern Algebra: Exam 2!')).toBe('modern-algebra-exam-2.studysheet.json');
  });

  it('falls back when nothing is left', () => {
    expect(fileNameFor('???')).toBe('studysheet.studysheet.json');
  });
});

describe('bundled example', () => {
  it('parses examples/modern-algebra-exam-2.studysheet.json', () => {
    expect(parseStudysheetFile(exampleFile).cards).toHaveLength(6);
  });
});
