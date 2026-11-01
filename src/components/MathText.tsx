import katex from 'katex';
import { memo, useMemo } from 'react';

import { parseMath } from '../lib/latex';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders card text with embedded LaTeX. Plain text stays a React text node
 * (so it is always escaped); only KaTeX's own output is injected as HTML.
 */
export const MathText = memo(function MathText({ text, className }: MathTextProps) {
  const segments = useMemo(() => parseMath(text), [text]);

  return (
    <div className={['math-text', className].filter(Boolean).join(' ')}>
      {segments.map((segment, i) =>
        segment.kind === 'text' ? (
          <span key={i}>{segment.value}</span>
        ) : (
          <span
            key={i}
            className={segment.display ? 'math-display' : 'math-inline'}
            dangerouslySetInnerHTML={{ __html: renderLatex(segment.value, segment.display) }}
          />
        ),
      )}
    </div>
  );
});

function renderLatex(source: string, displayMode: boolean): string {
  return katex.renderToString(source, {
    displayMode,
    // Show the bad LaTeX in red instead of crashing the card.
    throwOnError: false,
    strict: 'ignore',
    // Disallow \href, \includegraphics, \htmlClass etc. from imported files.
    trust: false,
    maxExpand: 1000,
  });
}
