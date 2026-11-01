import { shuffle, type RandomSource } from './shuffle';
import type { Card } from './types';

/**
 * Which side of the card is shown first.
 * - `term`: see the term, reveal the definition.
 * - `definition`: see the definition, reveal the term.
 */
export type StudyDirection = 'term' | 'definition';

export type Grade = 'right' | 'wrong';

export interface StudySession {
  deck: Card[];
  index: number;
  revealed: boolean;
  grades: Record<string, Grade>;
}

export type SessionAction =
  | { type: 'flip' }
  | { type: 'grade'; grade: Grade }
  | { type: 'back' }
  | { type: 'restart'; cards: Card[]; random?: RandomSource };

export interface SessionScore {
  right: number;
  wrong: number;
  total: number;
  percent: number;
}

/** Starts a session over a freshly shuffled copy of `cards`. */
export function createSession(cards: readonly Card[], random?: RandomSource): StudySession {
  return {
    deck: shuffle(cards, random),
    index: 0,
    revealed: false,
    grades: {},
  };
}

export function isComplete(session: StudySession): boolean {
  return session.index >= session.deck.length;
}

export function currentCard(session: StudySession): Card | undefined {
  return session.deck[session.index];
}

export function sessionReducer(session: StudySession, action: SessionAction): StudySession {
  switch (action.type) {
    case 'flip': {
      if (isComplete(session)) return session;
      return { ...session, revealed: !session.revealed };
    }

    case 'grade': {
      // A card can only be graded once the student has seen the answer.
      const card = currentCard(session);
      if (!card || !session.revealed) return session;

      return {
        ...session,
        index: session.index + 1,
        revealed: false,
        grades: { ...session.grades, [card.id]: action.grade },
      };
    }

    case 'back': {
      if (session.index === 0) return session;

      const index = session.index - 1;
      const previous = session.deck[index];
      const grades = { ...session.grades };
      if (previous) delete grades[previous.id];

      return { ...session, index, revealed: false, grades };
    }

    case 'restart':
      return createSession(action.cards, action.random);
  }
}

export function scoreSession(session: StudySession): SessionScore {
  const total = session.deck.length;

  let right = 0;
  let wrong = 0;
  for (const grade of Object.values(session.grades)) {
    if (grade === 'right') right++;
    else wrong++;
  }

  const percent = total === 0 ? 0 : Math.round((right / total) * 100);

  return { right, wrong, total, percent };
}

/** Cards graded wrong, in the order they were studied. */
export function missedCards(session: StudySession): Card[] {
  return session.deck.filter((card) => session.grades[card.id] === 'wrong');
}
