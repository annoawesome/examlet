import type { KeyboardEvent } from 'react';

import { MathText } from './MathText';

interface FlashcardProps {
  front: string;
  back: string;
  frontLabel: string;
  backLabel: string;
  revealed: boolean;
  onFlip: () => void;
}

/** Text length thresholds that pick a font size so long answers still fit. */
export function sizeClassFor(text: string): 'size-lg' | 'size-md' | 'size-sm' {
  if (text.length <= 80) return 'size-lg';
  if (text.length <= 320) return 'size-md';
  return 'size-sm';
}

/**
 * A two-sided card. Both faces share one grid cell, so the card grows to the
 * taller face; very long faces scroll inside the card instead of the page.
 *
 * It is a `div role="button"` rather than a `<button>` because the faces hold
 * block content (display math) and need their own scroll areas.
 */
export function Flashcard({ front, back, frontLabel, backLabel, revealed, onFlip }: FlashcardProps) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onFlip();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`flashcard ${revealed ? 'is-revealed' : ''}`}
      onClick={onFlip}
      onKeyDown={onKeyDown}
      aria-pressed={revealed}
      aria-label={revealed ? `${backLabel} shown. Flip to see the ${frontLabel.toLowerCase()}.` : `Reveal the ${backLabel.toLowerCase()}`}
    >
      <div className="flashcard-inner">
        <section className="flashcard-face flashcard-front" aria-hidden={revealed} inert={revealed}>
          <span className="flashcard-label">{frontLabel}</span>
          <MathText text={front} className={`flashcard-text ${sizeClassFor(front)}`} />
          <span className="flashcard-hint">Click or press Space to reveal</span>
        </section>

        <section className="flashcard-face flashcard-back" aria-hidden={!revealed} inert={!revealed}>
          <span className="flashcard-label">{backLabel}</span>
          <MathText text={back} className={`flashcard-text ${sizeClassFor(back)}`} />
        </section>
      </div>
    </div>
  );
}
