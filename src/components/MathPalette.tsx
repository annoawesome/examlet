import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from 'react';

import { SYMBOL_CATEGORIES, displayLatex, searchSymbols, type MathSymbol } from '../lib/mathSymbols';
import { renderLatex } from './MathText';

interface MathPaletteProps {
  /** Which field symbols go into, e.g. "Definition". */
  target: string;
  onInsert: (symbol: MathSymbol) => void;
  onClose: () => void;
  searchRef?: Ref<HTMLInputElement>;
}

/**
 * A panel of math symbols. Picking one inserts its LaTeX into the field being
 * edited; the status line shows the code, so authors learn it as they go.
 */
export function MathPalette({ target, onInsert, onClose, searchRef }: MathPaletteProps) {
  const [categoryId, setCategoryId] = useState(SYMBOL_CATEGORIES[0]!.id);
  const [query, setQuery] = useState('');
  const [described, setDescribed] = useState<MathSymbol | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridId = useId();

  const searching = query.trim() !== '';
  const symbols = searching ? searchSymbols(query) : SYMBOL_CATEGORIES.find((c) => c.id === categoryId)!.symbols;

  // Keep focus (and the caret) in the card field when tiles or blank areas are pressed.
  const keepFieldFocus = (e: PointerEvent) => {
    if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && symbols[0]) {
      e.preventDefault();
      onInsert(symbols[0]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      gridRef.current?.querySelector('button')?.focus();
    }
  };

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid) return;

    const tiles = [...grid.querySelectorAll('button')];
    const index = tiles.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;

    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    const offset = offsets[e.key];
    if (offset === undefined) return;

    e.preventDefault();
    tiles[Math.min(Math.max(index + offset, 0), tiles.length - 1)]?.focus();
  };

  return (
    <div className="math-palette" role="group" aria-label={`Math symbols for ${target}`} onPointerDown={keepFieldFocus} onKeyDown={onKeyDown}>
      <div className="math-palette-top">
        <input
          ref={searchRef}
          type="search"
          className="math-palette-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search, e.g. integral"
          aria-label="Search symbols"
          aria-controls={gridId}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Done
        </button>
      </div>

      {!searching && (
        <div className="math-palette-tabs" role="toolbar" aria-label="Symbol categories">
          {SYMBOL_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className="math-palette-tab"
              aria-pressed={category.id === categoryId}
              onClick={() => setCategoryId(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      )}

      <div id={gridId} ref={gridRef} className="math-palette-grid" onKeyDown={onGridKeyDown}>
        {symbols.map((symbol) => (
          <button
            key={symbol.name}
            type="button"
            className="math-tile"
            aria-label={symbol.name}
            title={symbol.name}
            onClick={() => onInsert(symbol)}
            onFocus={() => setDescribed(symbol)}
            onMouseEnter={() => setDescribed(symbol)}
            dangerouslySetInnerHTML={{ __html: tileHtml(symbol) }}
          />
        ))}
        {searching && symbols.length === 0 && <p className="math-palette-empty muted">No symbols match “{query.trim()}”.</p>}
      </div>

      <p className="math-palette-status">
        {described ? (
          <>
            <span>{described.name}</span> <code>{described.insert}</code>
          </>
        ) : (
          <span className="muted">Inserting into {target.toLowerCase()}. Hover a symbol to see its LaTeX.</span>
        )}
      </p>
    </div>
  );
}

const tileCache = new Map<string, string>();

function tileHtml(symbol: MathSymbol): string {
  let html = tileCache.get(symbol.name);
  if (html === undefined) {
    html = renderLatex(displayLatex(symbol), false);
    tileCache.set(symbol.name, html);
  }
  return html;
}
