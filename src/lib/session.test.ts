import { describe, expect, it } from 'vitest';

import { makeCards, seededRandom } from '../test/fixtures';
import { createSession, currentCard, isComplete, missedCards, scoreSession, sessionReducer, type StudySession } from './session';

function gradeAll(session: StudySession, grades: ('right' | 'wrong')[]): StudySession {
  return grades.reduce(
    (s, grade) => sessionReducer(sessionReducer(s, { type: 'flip' }), { type: 'grade', grade }),
    session,
  );
}

describe('createSession', () => {
  it('shuffles a copy of the cards and starts unrevealed', () => {
    const cards = makeCards(10);
    const session = createSession(cards, seededRandom(42));

    expect(session.deck).toHaveLength(10);
    expect(session.deck.map((c) => c.id)).not.toEqual(cards.map((c) => c.id));
    expect(session.index).toBe(0);
    expect(session.revealed).toBe(false);
  });
});

describe('sessionReducer', () => {
  it('flips back and forth', () => {
    const session = createSession(makeCards(2));

    const flipped = sessionReducer(session, { type: 'flip' });
    expect(flipped.revealed).toBe(true);
    expect(sessionReducer(flipped, { type: 'flip' }).revealed).toBe(false);
  });

  it('ignores grading before the card is revealed', () => {
    const session = createSession(makeCards(2));

    expect(sessionReducer(session, { type: 'grade', grade: 'right' })).toBe(session);
  });

  it('records the grade and advances to the next card face-down', () => {
    const session = createSession(makeCards(3));
    const first = currentCard(session)!;

    const next = sessionReducer(sessionReducer(session, { type: 'flip' }), { type: 'grade', grade: 'wrong' });

    expect(next.index).toBe(1);
    expect(next.revealed).toBe(false);
    expect(next.grades[first.id]).toBe('wrong');
  });

  it('goes back one card and forgets its grade', () => {
    const session = gradeAll(createSession(makeCards(3)), ['right']);
    const back = sessionReducer(session, { type: 'back' });

    expect(back.index).toBe(0);
    expect(Object.keys(back.grades)).toHaveLength(0);
    expect(sessionReducer(back, { type: 'back' })).toBe(back);
  });

  it('completes after every card is graded', () => {
    const done = gradeAll(createSession(makeCards(3)), ['right', 'wrong', 'right']);

    expect(isComplete(done)).toBe(true);
    expect(currentCard(done)).toBeUndefined();
    expect(sessionReducer(done, { type: 'flip' })).toBe(done);
  });

  it('restarts with a new set of cards', () => {
    const done = gradeAll(createSession(makeCards(3)), ['right', 'wrong', 'right']);
    const retry = sessionReducer(done, { type: 'restart', cards: missedCards(done) });

    expect(retry.deck).toHaveLength(1);
    expect(retry.index).toBe(0);
    expect(retry.grades).toEqual({});
  });
});

describe('scoreSession', () => {
  it('counts right and wrong and rounds the percentage', () => {
    const done = gradeAll(createSession(makeCards(3)), ['right', 'wrong', 'right']);

    expect(scoreSession(done)).toEqual({ right: 2, wrong: 1, total: 3, percent: 67 });
  });

  it('is zero for an empty deck', () => {
    expect(scoreSession(createSession([])).percent).toBe(0);
  });
});

describe('missedCards', () => {
  it('returns wrong cards in study order', () => {
    const session = createSession(makeCards(4), seededRandom(7));
    const done = gradeAll(session, ['wrong', 'right', 'wrong', 'right']);

    expect(missedCards(done).map((c) => c.id)).toEqual([session.deck[0]!.id, session.deck[2]!.id]);
  });
});
