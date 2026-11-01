/**
 * The symbol palette's catalog and the logic for inserting a symbol into
 * card text. Everything here is plain data and pure functions.
 */
import { mathRanges } from './latex';

export interface MathSymbol {
  /** Spoken and searchable name, e.g. "less than or equal". */
  name: string;
  /**
   * LaTeX to insert. `□` marks a blank: the caret lands on the first one (or
   * the selected text fills it), and every `□` is removed on insertion.
   */
  insert: string;
  /** LaTeX for the palette tile, when the inserted text alone looks odd. */
  display?: string;
  /** Extra search words. */
  keywords?: string;
}

export interface SymbolCategory {
  id: string;
  label: string;
  symbols: readonly MathSymbol[];
}

export const BLANK = '□';

export const SYMBOL_CATEGORIES: readonly SymbolCategory[] = [
  {
    id: 'structures',
    label: 'Structures',
    symbols: [
      { name: 'fraction', insert: '\\frac{□}{□}', keywords: 'divide over ratio' },
      { name: 'superscript', insert: '^{□}', display: 'x^{\\square}', keywords: 'power exponent' },
      { name: 'subscript', insert: '_{□}', display: 'x_{\\square}', keywords: 'index' },
      { name: 'square root', insert: '\\sqrt{□}', keywords: 'radical' },
      { name: 'nth root', insert: '\\sqrt[□]{□}', keywords: 'radical cube' },
      { name: 'sum', insert: '\\sum_{□}^{□}', keywords: 'sigma series' },
      { name: 'product', insert: '\\prod_{□}^{□}', keywords: 'pi' },
      { name: 'integral', insert: '\\int_{□}^{□}', keywords: 'antiderivative' },
      { name: 'limit', insert: '\\lim_{□ \\to □}', keywords: 'tends approaches' },
      { name: 'binomial coefficient', insert: '\\binom{□}{□}', keywords: 'choose combination' },
      { name: 'absolute value', insert: '\\lvert □ \\rvert', keywords: 'modulus abs order' },
      { name: 'norm', insert: '\\lVert □ \\rVert', keywords: 'length' },
      { name: 'parentheses', insert: '\\left( □ \\right)', keywords: 'brackets' },
      { name: 'angle brackets', insert: '\\langle □ \\rangle', keywords: 'generated span inner product' },
      { name: 'set braces', insert: '\\{ □ \\}', keywords: 'curly' },
      { name: 'floor', insert: '\\lfloor □ \\rfloor', keywords: 'round down' },
      { name: 'ceiling', insert: '\\lceil □ \\rceil', keywords: 'round up' },
      { name: 'overline', insert: '\\overline{□}', display: '\\overline{z}', keywords: 'bar conjugate closure' },
      { name: 'hat', insert: '\\hat{□}', display: '\\hat{x}', keywords: 'estimator unit' },
      { name: 'vector', insert: '\\vec{□}', display: '\\vec{v}', keywords: 'arrow' },
      {
        name: 'matrix',
        insert: '\\begin{pmatrix} □ & □ \\\\ □ & □ \\end{pmatrix}',
        display: '\\left(\\begin{smallmatrix} a & b \\\\ c & d \\end{smallmatrix}\\right)',
        keywords: 'array grid',
      },
      {
        name: 'cases',
        insert: '\\begin{cases} □ & \\text{if } □ \\\\ □ & \\text{otherwise} \\end{cases}',
        display: '\\left\\{\\begin{smallmatrix} a \\\\ b \\end{smallmatrix}\\right.',
        keywords: 'piecewise',
      },
      { name: 'text', insert: '\\text{□}', display: '\\text{abc}', keywords: 'words roman' },
      { name: 'operator name', insert: '\\operatorname{□}', display: '\\operatorname{im}', keywords: 'function ker' },
      { name: 'blackboard bold', insert: '\\mathbb{□}', display: '\\mathbb{R}', keywords: 'number set' },
      { name: 'calligraphic', insert: '\\mathcal{□}', display: '\\mathcal{A}', keywords: 'script' },
      { name: 'mod', insert: '\\pmod{□}', display: '\\text{mod}', keywords: 'modulo congruence' },
    ],
  },
  {
    id: 'greek',
    label: 'Greek',
    symbols: [
      { name: 'alpha', insert: '\\alpha' },
      { name: 'beta', insert: '\\beta' },
      { name: 'gamma', insert: '\\gamma' },
      { name: 'delta', insert: '\\delta' },
      { name: 'epsilon', insert: '\\varepsilon' },
      { name: 'zeta', insert: '\\zeta' },
      { name: 'eta', insert: '\\eta' },
      { name: 'theta', insert: '\\theta' },
      { name: 'iota', insert: '\\iota' },
      { name: 'kappa', insert: '\\kappa' },
      { name: 'lambda', insert: '\\lambda' },
      { name: 'mu', insert: '\\mu' },
      { name: 'nu', insert: '\\nu' },
      { name: 'xi', insert: '\\xi' },
      { name: 'pi', insert: '\\pi' },
      { name: 'rho', insert: '\\rho' },
      { name: 'sigma', insert: '\\sigma' },
      { name: 'tau', insert: '\\tau' },
      { name: 'phi', insert: '\\varphi' },
      { name: 'chi', insert: '\\chi' },
      { name: 'psi', insert: '\\psi' },
      { name: 'omega', insert: '\\omega' },
      { name: 'capital gamma', insert: '\\Gamma' },
      { name: 'capital delta', insert: '\\Delta', keywords: 'change' },
      { name: 'capital theta', insert: '\\Theta' },
      { name: 'capital lambda', insert: '\\Lambda' },
      { name: 'capital pi', insert: '\\Pi' },
      { name: 'capital sigma', insert: '\\Sigma' },
      { name: 'capital phi', insert: '\\Phi' },
      { name: 'capital psi', insert: '\\Psi' },
      { name: 'capital omega', insert: '\\Omega' },
    ],
  },
  {
    id: 'operators',
    label: 'Operators',
    symbols: [
      { name: 'times', insert: '\\times', keywords: 'multiply cross product' },
      { name: 'divide', insert: '\\div', keywords: 'division' },
      { name: 'dot', insert: '\\cdot', keywords: 'multiply product' },
      { name: 'plus or minus', insert: '\\pm' },
      { name: 'minus or plus', insert: '\\mp' },
      { name: 'compose', insert: '\\circ', keywords: 'composition ring' },
      { name: 'direct sum', insert: '\\oplus', keywords: 'xor circled plus' },
      { name: 'tensor product', insert: '\\otimes', keywords: 'circled times' },
      { name: 'star', insert: '\\ast', keywords: 'asterisk convolution' },
      { name: 'infinity', insert: '\\infty' },
      { name: 'partial derivative', insert: '\\partial' },
      { name: 'nabla', insert: '\\nabla', keywords: 'gradient del' },
      { name: 'contour integral', insert: '\\oint' },
      { name: 'dots', insert: '\\dots', keywords: 'ellipsis' },
      { name: 'prime', insert: "'", display: "f'", keywords: 'derivative' },
      { name: 'degree', insert: '^\\circ', display: '90^\\circ', keywords: 'angle' },
    ],
  },
  {
    id: 'relations',
    label: 'Relations',
    symbols: [
      { name: 'not equal', insert: '\\neq' },
      { name: 'less than or equal', insert: '\\le' },
      { name: 'greater than or equal', insert: '\\ge' },
      { name: 'approximately', insert: '\\approx', keywords: 'about' },
      { name: 'equivalent', insert: '\\equiv', keywords: 'congruent identical' },
      { name: 'isomorphic', insert: '\\cong', keywords: 'congruent' },
      { name: 'similar', insert: '\\sim', keywords: 'tilde distributed' },
      { name: 'asymptotically equal', insert: '\\simeq', keywords: 'homotopic' },
      { name: 'proportional to', insert: '\\propto' },
      { name: 'much less than', insert: '\\ll' },
      { name: 'much greater than', insert: '\\gg' },
      { name: 'divides', insert: '\\mid', keywords: 'such that' },
      { name: 'does not divide', insert: '\\nmid' },
      { name: 'perpendicular', insert: '\\perp', keywords: 'orthogonal' },
      { name: 'parallel', insert: '\\parallel' },
      { name: 'normal subgroup', insert: '\\trianglelefteq' },
    ],
  },
  {
    id: 'sets',
    label: 'Sets & logic',
    symbols: [
      { name: 'element of', insert: '\\in', keywords: 'in member' },
      { name: 'not element of', insert: '\\notin' },
      { name: 'subset', insert: '\\subseteq' },
      { name: 'proper subset', insert: '\\subsetneq', keywords: 'strict' },
      { name: 'superset', insert: '\\supseteq' },
      { name: 'union', insert: '\\cup', keywords: 'or cup' },
      { name: 'intersection', insert: '\\cap', keywords: 'and cap' },
      { name: 'set minus', insert: '\\setminus', keywords: 'difference without' },
      { name: 'empty set', insert: '\\varnothing', keywords: 'null' },
      { name: 'natural numbers', insert: '\\mathbb{N}' },
      { name: 'integers', insert: '\\mathbb{Z}' },
      { name: 'rationals', insert: '\\mathbb{Q}' },
      { name: 'reals', insert: '\\mathbb{R}', keywords: 'real numbers' },
      { name: 'complex numbers', insert: '\\mathbb{C}' },
      { name: 'for all', insert: '\\forall', keywords: 'every each' },
      { name: 'there exists', insert: '\\exists', keywords: 'some' },
      { name: 'there does not exist', insert: '\\nexists' },
      { name: 'not', insert: '\\neg', keywords: 'negation' },
      { name: 'and', insert: '\\land', keywords: 'wedge conjunction' },
      { name: 'or', insert: '\\lor', keywords: 'vee disjunction' },
      { name: 'implies', insert: '\\implies', keywords: 'then' },
      { name: 'if and only if', insert: '\\iff', keywords: 'iff equivalent' },
      { name: 'therefore', insert: '\\therefore' },
      { name: 'because', insert: '\\because' },
    ],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    symbols: [
      { name: 'right arrow', insert: '\\to', keywords: 'maps to function tends' },
      { name: 'left arrow', insert: '\\leftarrow' },
      { name: 'left right arrow', insert: '\\leftrightarrow' },
      { name: 'maps to', insert: '\\mapsto', keywords: 'sends' },
      { name: 'injection', insert: '\\hookrightarrow', keywords: 'hook embedding one-to-one' },
      { name: 'surjection', insert: '\\twoheadrightarrow', keywords: 'onto' },
      { name: 'double right arrow', insert: '\\Rightarrow' },
      { name: 'double left arrow', insert: '\\Leftarrow' },
      { name: 'up arrow', insert: '\\uparrow', keywords: 'increasing' },
      { name: 'down arrow', insert: '\\downarrow', keywords: 'decreasing' },
      { name: 'labeled arrow', insert: '\\xrightarrow{□}', keywords: 'over' },
    ],
  },
];

/** Tile LaTeX for a symbol: blanks show as empty boxes. */
export function displayLatex(symbol: MathSymbol): string {
  return symbol.display ?? symbol.insert.replaceAll(BLANK, '\\square');
}

/** Symbols whose name, keywords or LaTeX contain every word of the query. */
export function searchSymbols(query: string): MathSymbol[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return SYMBOL_CATEGORIES.flatMap((category) => category.symbols).filter((symbol) => {
    const haystack = `${symbol.name} ${symbol.keywords ?? ''} ${symbol.insert}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export interface Insertion {
  /** Replace `value.slice(from, to)` with `text`. */
  from: number;
  to: number;
  text: string;
  /** Selection to set afterwards, in the new value's coordinates. */
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Works out how to insert `symbol` into `value` at the current selection.
 *
 * - Outside math, the LaTeX is wrapped in `$…$` so it renders.
 * - Selected text fills the first blank (select `x`, pick √ → `\sqrt{x}`).
 * - The caret lands on the next empty blank, or after the insertion.
 * - A command like `\alpha` gets a space if a letter follows it.
 */
export function planInsertion(value: string, selectionStart: number, selectionEnd: number, symbol: MathSymbol): Insertion {
  const selected = value.slice(selectionStart, selectionEnd);
  const blanks = blankOffsets(symbol.insert);
  let latex = symbol.insert.replaceAll(BLANK, '');

  // Offsets of blanks after the markers are removed.
  let caretTargets: number[] =blanks.map((offset, i) => offset - i);

  if (selected && caretTargets.length > 0) {
    const [first, ...rest] = caretTargets as [number, ...number[]];
    latex = latex.slice(0, first) + selected + latex.slice(first);
    caretTargets = rest.map((offset) => offset + selected.length);
  }

  // Probe with a placeholder: `$x = $` is only math once something fills it.
  const insideMath = isInsideMath(value.slice(0, selectionStart) + 'x' + value.slice(selectionEnd), selectionStart);
  const [firstBlank] = caretTargets;

  // Just after `$\alpha$`, the next symbol joins that math instead of starting a new `$…$`.
  const joined = !insideMath && !selected ? mathRanges(value).find((range) => range.outerEnd === selectionStart) : undefined;
  if (joined) {
    const caret = firstBlank === undefined ? selectionStart + latex.length : joined.end + firstBlank;
    return { from: joined.end, to: joined.end, text: latex, selectionStart: caret, selectionEnd: caret };
  }

  const next = value.slice(selectionEnd);
  if (insideMath && /\\[a-zA-Z]+$/.test(latex) && /^[a-zA-Z]/.test(next)) latex += ' ';

  const prefix = insideMath ? '' : '$';
  const text = insideMath ? latex : `$${latex}$`;
  const caret = firstBlank === undefined ? selectionStart + text.length : selectionStart + prefix.length + firstBlank;

  return { from: selectionStart, to: selectionEnd, text, selectionStart: caret, selectionEnd: caret };
}

/** True when `index` sits inside the body of a math segment. */
export function isInsideMath(value: string, index: number): boolean {
  return mathRanges(value).some((range) => index >= range.start && index <= range.end);
}

function blankOffsets(template: string): number[] {
  const offsets: number[] = [];
  for (let i = template.indexOf(BLANK); i !== -1; i = template.indexOf(BLANK, i + 1)) offsets.push(i);
  return offsets;
}
