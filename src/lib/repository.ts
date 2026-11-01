import {
  CARDS_BY_SHEET_INDEX,
  CARDS_STORE,
  SHEETS_STORE,
  openDatabase,
  requestToPromise,
  transactionDone,
} from './db';
import type { Card, Studysheet, StudysheetSummary, StudysheetWithCards } from './types';

/** All persistence for studysheets and their cards. */
export interface StudysheetRepository {
  listSummaries(): Promise<StudysheetSummary[]>;
  get(id: string): Promise<StudysheetWithCards | undefined>;
  /** Writes the sheet and replaces its cards in one atomic transaction. */
  save(sheet: Studysheet, cards: Card[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export function createIndexedDbRepository(dbName?: string): StudysheetRepository {
  let connection: Promise<IDBDatabase> | undefined;
  const db = () => (connection ??= openDatabase(dbName));

  return {
    async listSummaries() {
      const tx = (await db()).transaction([SHEETS_STORE, CARDS_STORE], 'readonly');
      const sheets = await requestToPromise<Studysheet[]>(tx.objectStore(SHEETS_STORE).getAll());
      const bySheet = tx.objectStore(CARDS_STORE).index(CARDS_BY_SHEET_INDEX);

      const summaries = await Promise.all(
        sheets.map(async (sheet) => ({
          ...sheet,
          cardCount: await requestToPromise(bySheet.count(sheet.id)),
        })),
      );

      return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async get(id) {
      const tx = (await db()).transaction([SHEETS_STORE, CARDS_STORE], 'readonly');

      const [sheet, cards] = await Promise.all([
        requestToPromise<Studysheet | undefined>(tx.objectStore(SHEETS_STORE).get(id)),
        requestToPromise<Card[]>(tx.objectStore(CARDS_STORE).index(CARDS_BY_SHEET_INDEX).getAll(id)),
      ]);

      if (!sheet) return undefined;
      return { sheet, cards: cards.sort((a, b) => a.position - b.position) };
    },

    async save(sheet, cards) {
      const tx = (await db()).transaction([SHEETS_STORE, CARDS_STORE], 'readwrite');
      const done = transactionDone(tx);
      const cardStore = tx.objectStore(CARDS_STORE);

      tx.objectStore(SHEETS_STORE).put(sheet);
      await deleteCardsOf(cardStore, sheet.id);
      for (const card of cards) cardStore.put({ ...card, sheetId: sheet.id });

      await done;
    },

    async delete(id) {
      const tx = (await db()).transaction([SHEETS_STORE, CARDS_STORE], 'readwrite');
      const done = transactionDone(tx);

      tx.objectStore(SHEETS_STORE).delete(id);
      await deleteCardsOf(tx.objectStore(CARDS_STORE), id);

      await done;
    },
  };
}

async function deleteCardsOf(cardStore: IDBObjectStore, sheetId: string): Promise<void> {
  const keys = await requestToPromise(cardStore.index(CARDS_BY_SHEET_INDEX).getAllKeys(sheetId));
  for (const key of keys) cardStore.delete(key);
}
