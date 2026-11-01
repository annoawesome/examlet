/** A named group of cards, e.g. "Modern Algebra Exam 2". */
export interface Studysheet {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

/** One flashcard. `position` keeps the author's ordering inside a sheet. */
export interface Card {
  id: string;
  sheetId: string;
  term: string;
  definition: string;
  position: number;
}

/** What the home page needs to list a sheet without loading every card. */
export interface StudysheetSummary extends Studysheet {
  cardCount: number;
}

/** A sheet together with its cards, ordered by `position`. */
export interface StudysheetWithCards {
  sheet: Studysheet;
  cards: Card[];
}

/** The unsaved shape of a card while it is being edited. */
export interface CardDraft {
  id: string;
  term: string;
  definition: string;
}
