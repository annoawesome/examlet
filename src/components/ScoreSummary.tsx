import type { CSSProperties } from 'react';

import type { SessionScore } from '../lib/session';
import type { Card } from '../lib/types';
import { MathText } from './MathText';

interface ScoreSummaryProps {
  score: SessionScore;
  missed: Card[];
  onRestart: () => void;
  onRetryMissed: () => void;
  onExit: () => void;
}

function verdictFor(percent: number): string {
  if (percent === 100) return 'Perfect run!';
  if (percent >= 80) return 'Great work.';
  if (percent >= 50) return 'Getting there.';
  return 'Keep practicing.';
}

export function ScoreSummary({ score, missed, onRestart, onRetryMissed, onExit }: ScoreSummaryProps) {
  return (
    <section className="score" aria-labelledby="score-title">
      <div className="score-ring" style={{ '--percent': score.percent } as CSSProperties}>
        <span className="score-percent">{score.percent}%</span>
      </div>

      <h2 id="score-title" className="score-title">{verdictFor(score.percent)}</h2>
      <p className="score-detail">
        You got <strong>{score.right}</strong> of <strong>{score.total}</strong> right
        {score.wrong > 0 && <> and missed <strong>{score.wrong}</strong></>}.
      </p>

      <div className="score-actions">
        {missed.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={onRetryMissed}>
            Retry {missed.length} missed
          </button>
        )}
        <button type="button" className={`btn ${missed.length > 0 ? 'btn-secondary' : 'btn-primary'}`} onClick={onRestart}>
          Restart all
        </button>
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          Back to studysheet
        </button>
      </div>

      {missed.length > 0 && (
        <div className="missed">
          <h3 className="missed-title">Cards to review</h3>
          <ul className="missed-list">
            {missed.map((card) => (
              <li key={card.id} className="missed-item">
                <MathText text={card.term} className="missed-term" />
                <MathText text={card.definition} className="missed-definition" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
