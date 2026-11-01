import katex from 'katex';
import { describe, expect, it } from 'vitest';

import { mathRanges } from './latex';
import { SYMBOL_CATEGORIES, displayLatex, isInsideMath, planInsertion, searchSymbols, type MathSymbol } from './mathSymbols';

const alpha: MathSymbol = { name: 'alpha', insert: '\\alpha' };
const fraction: MathSymbol = { name: 'fraction', insert: '\\frac{□}{□}' };
const sqrt: MathSymbol = { name: 'square root', insert: '\\sqrt{□}' };

/** Applies an insertion and marks the caret with `|`. */
function apply(value: string, start: number, end: number, symbol: MathSymbol): string {
  const plan = planInsertion(value, start, end, symbol);
  const next = value.slice(0, plan.from) + plan.text + value.slice(plan.to);
  expect(plan.selectionStart).toBe(plan.selectionEnd);
  return next.slice(0, plan.selectionStart) + '|' + next.slice(plan.selectionStart);
}

describe('planInsertion', () => {
  it('wraps a symbol in $…$ outside math', () => {
    expect(apply('Let  be', 4, 4, alpha)).toBe('Let $\\alpha$| be');
  });

  it('inserts bare LaTeX inside math', () => {
    expect(apply('$x = $', 5, 5, alpha)).toBe('$x = \\alpha|$');
  });

  it('puts the caret on the first blank', () => {
    expect(apply('', 0, 0, fraction)).toBe('$\\frac{|}{}$');
    expect(apply('$1 + $', 5, 5, fraction)).toBe('$1 + \\frac{|}{}$');
  });

  it('fills the first blank with the selection and moves to the next', () => {
    expect(apply('$a$', 1, 2, fraction)).toBe('$\\frac{a}{|}$');
  });

  it('places the caret after the insertion when the selection fills the only blank', () => {
    expect(apply('root of 2', 8, 9, sqrt)).toBe('root of $\\sqrt{2}$|');
  });

  it('joins math that ends right at the caret', () => {
    expect(apply('Let $\\alpha$ be', 12, 12, alpha)).toBe('Let $\\alpha\\alpha$| be');
    expect(apply('$x$', 3, 3, fraction)).toBe('$x\\frac{|}{}$');
  });

  it('does not mistake a price for open math', () => {
    expect(apply('costs $5 and ', 13, 13, alpha)).toBe('costs $5 and $\\alpha$|');
  });

  it('separates a command from a following letter', () => {
    expect(apply('$x$', 1, 1, alpha)).toBe('$\\alpha |x$');
  });
});

describe('isInsideMath', () => {
  it('is true between the delimiters, including their inner edges', () => {
    const value = 'a $x$ b';
    expect(isInsideMath(value, 2)).toBe(false);
    expect(isInsideMath(value, 3)).toBe(true);
    expect(isInsideMath(value, 4)).toBe(true);
    expect(isInsideMath(value, 5)).toBe(false);
  });

  it('ignores prices', () => {
    expect(isInsideMath('$5 and $10', 4)).toBe(false);
  });
});

describe('mathRanges', () => {
  it('locates each math body', () => {
    expect(mathRanges('a $x$ and $$y$$')).toEqual([
      { start: 3, end: 4, outerEnd: 5 },
      { start: 12, end: 13, outerEnd: 15 },
    ]);
  });
});

describe('searchSymbols', () => {
  it('matches names, keywords and LaTeX', () => {
    expect(searchSymbols('subset').map((s) => s.name)).toContain('subset');
    expect(searchSymbols('choose').map((s) => s.name)).toEqual(['binomial coefficient']);
    expect(searchSymbols('\\varphi').map((s) => s.name)).toEqual(['phi']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchSymbols('  ')).toEqual([]);
  });
});

describe('SYMBOL_CATEGORIES', () => {
  const symbols = SYMBOL_CATEGORIES.flatMap((category) => category.symbols);

  it('has unique names', () => {
    expect(new Set(symbols.map((s) => s.name)).size).toBe(symbols.length);
  });

  it.each(symbols.map((s) => [s.name, s] as const))('%s renders in KaTeX', (_name, symbol) => {
    expect(() => katex.renderToString(displayLatex(symbol), { throwOnError: true })).not.toThrow();
    expect(() => katex.renderToString(symbol.insert.replaceAll('□', 'x'), { throwOnError: true })).not.toThrow();
  });
});
