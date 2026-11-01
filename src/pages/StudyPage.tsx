import { useEffect, useReducer } from 'react';

import { Flashcard } from '../components/Flashcard';
import { ScoreSummary } from '../components/ScoreSummary';
import { useAsync } from '../hooks/useAsync';
import { useRepository } from '../hooks/RepositoryContext';
import { hrefFor, navigate } from '../lib/routes';
import {
  createSession,
  currentCard,
  isComplete,
  missedCards,
  scoreSession,
  sessionReducer,
  type StudyDirection,
} from '../lib/session';
import type { Card, Studysheet } from '../lib/types';

interface StudyPageProps {
  sheetId: string;
  direction: StudyDirection;
}

export function StudyPage({ sheetId, direction }: StudyPageProps) {
  const repository = useRepository();
  const [data] = useAsync(() => repository.get(sheetId), [repository, sheetId]);

  if (data.status === 'loading') return <p className="page muted">Loading…</p>;
  if (data.status === 'error') return <p className="page notice notice-error">{data.error.message}</p>;

  if (!data.data || data.data.cards.length === 0) {
    return (
      <div className="page empty">
        <h1>Nothing to study</h1>
        <p className="muted">This studysheet has no cards yet.</p>
        <a className="btn btn-primary" href={hrefFor({ name: 'edit', sheetId })}>
          Add cards
        </a>
      </div>
    );
  }

  // Remount the session whenever the direction changes.
  return <StudySession key={direction} sheet={data.data.sheet} cards={data.data.cards} direction={direction} />;
}

interface StudySessionProps {
  sheet: Studysheet;
  cards: Card[];
  direction: StudyDirection;
}

function StudySession({ sheet, cards, direction }: StudySessionProps) {
  const [session, dispatch] = useReducer(sessionReducer, cards, (initial) => createSession(initial));

  const card = currentCard(session);
  const done = isComplete(session);
  const total = session.deck.length;
  const score = scoreSession(session);

  const labels = direction === 'term' ? (['Term', 'Definition'] as const) : (['Definition', 'Term'] as const);
  const exit = () => navigate({ name: 'edit', sheetId: sheet.id });

  useStudyKeyboard({
    enabled: !done,
    revealed: session.revealed,
    onFlip: () => dispatch({ type: 'flip' }),
    onGrade: (grade) => dispatch({ type: 'grade', grade }),
  });

  return (
    <div className="page study">
      <header className="study-header">
        <a className="back-link" href={hrefFor({ name: 'edit', sheetId: sheet.id })}>
          ← {sheet.title}
        </a>

        <nav className="mode-toggle" aria-label="Study direction">
          <a className={direction === 'term' ? 'is-active' : ''} aria-current={direction === 'term'} href={hrefFor({ name: 'study', sheetId: sheet.id, direction: 'term' })}>
            Term first
          </a>
          <a className={direction === 'definition' ? 'is-active' : ''} aria-current={direction === 'definition'} href={hrefFor({ name: 'study', sheetId: sheet.id, direction: 'definition' })}>
            Definition first
          </a>
        </nav>
      </header>

      <div
        className="progress"
        role="progressbar"
        aria-label="Cards completed"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={session.index}
      >
        <div className="progress-bar" style={{ width: `${(session.index / total) * 100}%` }} />
      </div>

      {done || !card ? (
        <ScoreSummary
          score={score}
          missed={missedCards(session)}
          onRestart={() => dispatch({ type: 'restart', cards })}
          onRetryMissed={() => dispatch({ type: 'restart', cards: missedCards(session) })}
          onExit={exit}
        />
      ) : (
        <>
          <p className="study-counter">
            Card {session.index + 1} of {total}
          </p>

          <Flashcard
            key={card.id}
            front={direction === 'term' ? card.term : card.definition}
            back={direction === 'term' ? card.definition : card.term}
            frontLabel={labels[0]}
            backLabel={labels[1]}
            revealed={session.revealed}
            onFlip={() => dispatch({ type: 'flip' })}
          />

          <div className="study-controls">
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'back' })} disabled={session.index === 0}>
              ← Back
            </button>

            {session.revealed ? (
              <div className="grade-buttons">
                <button type="button" className="btn btn-wrong" onClick={() => dispatch({ type: 'grade', grade: 'wrong' })}>
                  ✗ Missed it <kbd>1</kbd>
                </button>
                <button type="button" className="btn btn-right" onClick={() => dispatch({ type: 'grade', grade: 'right' })}>
                  ✓ Got it <kbd>2</kbd>
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'flip' })}>
                Reveal {labels[1].toLowerCase()} <kbd>Space</kbd>
              </button>
            )}

            <span className="study-tally" aria-label="Running score">
              <span className="tally-right">✓ {score.right}</span>
              <span className="tally-wrong">✗ {score.wrong}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

interface StudyKeyboardOptions {
  enabled: boolean;
  revealed: boolean;
  onFlip: () => void;
  onGrade: (grade: 'right' | 'wrong') => void;
}

/** Space flips; once revealed, 1 = missed and 2 = got it. */
function useStudyKeyboard({ enabled, revealed, onFlip, onGrade }: StudyKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Let focused buttons and links handle their own activation keys.
      const onControl = event.target instanceof Element && event.target.closest('button, a, input, textarea');

      if (event.key === ' ' && !onControl) {
        event.preventDefault();
        onFlip();
      } else if (revealed && event.key === '1') {
        onGrade('wrong');
      } else if (revealed && event.key === '2') {
        onGrade('right');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, revealed, onFlip, onGrade]);
}
