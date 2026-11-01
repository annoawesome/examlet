import { describe, expect, it } from 'vitest';

import { containsMath, parseMath } from './latex';

describe('parseMath', () => {
  it('returns plain text untouched', () => {
    expect(parseMath('A group is a set with an operation.')).toEqual([
      { kind: 'text', value: 'A group is a set with an operation.' },
    ]);
  });

  it('extracts inline $...$ math', () => {
    expect(parseMath('Let $x^2$ be')).toEqual([
      { kind: 'text', value: 'Let ' },
      { kind: 'math', value: 'x^2', display: false },
      { kind: 'text', value: ' be' },
    ]);
  });

  it('extracts display $$...$$ math', () => {
    expect(parseMath('$$\\sum_{i=1}^n i$$')).toEqual([{ kind: 'math', value: '\\sum_{i=1}^n i', display: true }]);
  });

  it('supports \\( \\) and \\[ \\] delimiters', () => {
    expect(parseMath('\\(a\\) and \\[b\\]')).toEqual([
      { kind: 'math', value: 'a', display: false },
      { kind: 'text', value: ' and ' },
      { kind: 'math', value: 'b', display: true },
    ]);
  });

  it('treats \\$ as a literal dollar sign', () => {
    expect(parseMath('costs \\$5')).toEqual([{ kind: 'text', value: 'costs $5' }]);
  });

  it('does not treat prices as math', () => {
    expect(parseMath('between $5 and $10')).toEqual([{ kind: 'text', value: 'between $5 and $10' }]);
  });

  it('leaves an unclosed delimiter as text', () => {
    expect(parseMath('half $open')).toEqual([{ kind: 'text', value: 'half $open' }]);
  });

  it('keeps multi-line display math together', () => {
    const source = 'Proof:\n$$\n|G| = [G:H]\\,|H|\n$$\nDone.';

    expect(parseMath(source).filter((s) => s.kind === 'math')).toEqual([
      { kind: 'math', value: '\n|G| = [G:H]\\,|H|\n', display: true },
    ]);
  });
});

describe('containsMath', () => {
  it('detects math', () => {
    expect(containsMath('$x$')).toBe(true);
    expect(containsMath('no math here')).toBe(false);
  });
});
