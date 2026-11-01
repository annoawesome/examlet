/**
 * Splits card text into plain-text and math segments.
 *
 * Supported delimiters:
 *   inline:  $...$   \( ... \)
 *   display: $$...$$ \[ ... \]
 * A literal dollar sign can be written as `\$`.
 */
export type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'math'; value: string; display: boolean };

interface Delimiter {
  open: string;
  close: string;
  display: boolean;
}

// Order matters: `$$` must be tried before `$`.
const DELIMITERS: readonly Delimiter[] = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false },
];

export interface MathRange {
  start: number;
  end: number;
  outerEnd: number;
}

export function parseMath(source: string): Segment[] {
  return scan(source).segments;
}

/**
 * Where each math segment sits in the source. `[start, end)` is the body;
 * `outerEnd` is just past the closing delimiter.
 */
export function mathRanges(source: string): MathRange[] {
  return scan(source).ranges;
}

function scan(source: string) {
  const segments: Segment[] = [];
  const ranges: MathRange[] = [];
  let text = '';
  let i = 0;

  const flushText = () => {
    if (text) segments.push({ kind: 'text', value: text });
    text = '';
  };

  while (i < source.length) {
    if (source.startsWith('\\$', i)) {
      text += '$';
      i += 2;
      continue;
    }

    const match = matchDelimiter(source, i);
    if (match) {
      flushText();
      segments.push({ kind: 'math', value: match.body, display: match.display });
      ranges.push({ start: match.bodyStart, end: match.bodyStart + match.body.length, outerEnd: match.end });
      i = match.end;
      continue;
    }

    text += source[i];
    i++;
  }

  flushText();
  return { segments, ranges };
}

/** True when the text contains at least one math segment. */
export function containsMath(source: string): boolean {
  return parseMath(source).some((segment) => segment.kind === 'math');
}

function matchDelimiter(
  source: string,
  start: number,
): { body: string; bodyStart: number; display: boolean; end: number } | undefined {
  for (const delimiter of DELIMITERS) {
    if (!source.startsWith(delimiter.open, start)) continue;

    const bodyStart = start + delimiter.open.length;
    const close = findClose(source, delimiter.close, bodyStart);
    if (close === -1) continue;

    const body = source.slice(bodyStart, close);
    if (!body.trim()) continue;

    // "$5 and $10" is prose, not math: inline `$` must hug its content.
    if (delimiter.open === '$' && (/^\s/.test(body) || /\s$/.test(body))) continue;

    return { body, bodyStart, display: delimiter.display, end: close + delimiter.close.length };
  }

  return undefined;
}

/** Finds the closing delimiter, skipping escaped `\$` inside the math. */
function findClose(source: string, close: string, from: number): number {
  let i = from;

  while (i < source.length) {
    const found = source.indexOf(close, i);
    if (found === -1) return -1;

    const escaped = close.startsWith('$') && source[found - 1] === '\\';
    if (!escaped) return found;

    i = found + 1;
  }

  return -1;
}
