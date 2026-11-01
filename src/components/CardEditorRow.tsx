import { useState } from 'react';

import { containsMath } from '../lib/latex';
import type { CardDraft } from '../lib/types';
import { AutoGrowTextarea } from './AutoGrowTextarea';
import { MathText } from './MathText';

interface CardEditorRowProps {
  card: CardDraft;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (card: CardDraft) => void;
  onRemove: () => void;
  onMove: (offset: -1 | 1) => void;
}

export function CardEditorRow({ card, number, isFirst, isLast, onChange, onRemove, onMove }: CardEditorRowProps) {
  const [showPreview, setShowPreview] = useState(false);
  const hasMath = containsMath(card.term) || containsMath(card.definition);

  return (
    <li className="card-row">
      <header className="card-row-header">
        <span className="card-row-number">{number}</span>

        <div className="card-row-actions">
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${hasMath ? 'has-math' : ''}`}
            onClick={() => setShowPreview((v) => !v)}
            aria-pressed={showPreview}
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move card ${number} up`}>
            ↑
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move card ${number} down`}>
            ↓
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={onRemove} aria-label={`Delete card ${number}`}>
            Delete
          </button>
        </div>
      </header>

      <div className="card-row-fields">
        <label className="field">
          <span className="field-label">Term</span>
          <AutoGrowTextarea
            value={card.term}
            onChange={(e) => onChange({ ...card, term: e.target.value })}
            placeholder="e.g. Lagrange's theorem"
          />
        </label>

        <label className="field">
          <span className="field-label">Definition</span>
          <AutoGrowTextarea
            value={card.definition}
            onChange={(e) => onChange({ ...card, definition: e.target.value })}
            placeholder="e.g. If $H \le G$ and $G$ is finite, then $|H|$ divides $|G|$."
          />
        </label>
      </div>

      {showPreview && (
        <div className="card-row-preview">
          <MathText text={card.term || '—'} />
          <MathText text={card.definition || '—'} />
        </div>
      )}
    </li>
  );
}
