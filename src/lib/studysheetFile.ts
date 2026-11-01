/**
 * The portable `.studysheet.json` format. Exports are self-contained and
 * carry no ids, so importing the same file twice creates two sheets
 * instead of overwriting one.
 */
import { createId } from './id';
import type { Card, Studysheet, StudysheetWithCards } from './types';

export const FILE_FORMAT = 'examlet.studysheet';
export const FILE_VERSION = 1;
export const FILE_EXTENSION = '.studysheet.json';

export interface StudysheetFile {
  format: typeof FILE_FORMAT;
  version: typeof FILE_VERSION;
  exportedAt: string;
  studysheet: {
    title: string;
    description: string;
    cards: { term: string; definition: string }[];
  };
}

export class StudysheetFileError extends Error {
  override name = 'StudysheetFileError';
}

export function toStudysheetFile({ sheet, cards }: StudysheetWithCards, now = new Date()): StudysheetFile {
  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    exportedAt: now.toISOString(),
    studysheet: {
      title: sheet.title,
      description: sheet.description,
      cards: cards.map(({ term, definition }) => ({ term, definition })),
    },
  };
}

export function serializeStudysheet(data: StudysheetWithCards, now?: Date): string {
  return JSON.stringify(toStudysheetFile(data, now), null, 2);
}

/** Parses and validates file text, returning a brand new sheet with fresh ids. */
export function parseStudysheetFile(text: string, now = Date.now()): StudysheetWithCards {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new StudysheetFileError('This file is not valid JSON.');
  }

  const file = validate(raw);

  const sheet: Studysheet = {
    id: createId(),
    title: file.studysheet.title.trim() || 'Imported studysheet',
    description: file.studysheet.description,
    createdAt: now,
    updatedAt: now,
  };

  const cards: Card[] = file.studysheet.cards.map((card, position) => ({
    id: createId(),
    sheetId: sheet.id,
    term: card.term,
    definition: card.definition,
    position,
  }));

  return { sheet, cards };
}

/** "Modern Algebra: Exam 2" → "modern-algebra-exam-2.studysheet.json" */
export function fileNameFor(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${slug || 'studysheet'}${FILE_EXTENSION}`;
}

function validate(raw: unknown): StudysheetFile {
  if (!isRecord(raw) || raw.format !== FILE_FORMAT) {
    throw new StudysheetFileError('This is not an Examlet studysheet file.');
  }

  if (raw.version !== FILE_VERSION) {
    throw new StudysheetFileError(`Unsupported studysheet file version: ${String(raw.version)}.`);
  }

  const sheet = raw.studysheet;
  if (!isRecord(sheet) || typeof sheet.title !== 'string' || !Array.isArray(sheet.cards)) {
    throw new StudysheetFileError('The studysheet is missing its title or cards.');
  }

  const cards = sheet.cards.map((card, i) => {
    if (!isRecord(card) || typeof card.term !== 'string' || typeof card.definition !== 'string') {
      throw new StudysheetFileError(`Card ${i + 1} needs a text term and definition.`);
    }
    return { term: card.term, definition: card.definition };
  });

  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    studysheet: {
      title: sheet.title,
      description: typeof sheet.description === 'string' ? sheet.description : '',
      cards,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
