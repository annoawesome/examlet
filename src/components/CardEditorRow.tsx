import { useId, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent, type RefObject } from 'react';

import { containsMath } from '../lib/latex';
import { planInsertion, type MathSymbol } from '../lib/mathSymbols';
import type { CardDraft } from '../lib/types';
import { AutoGrowTextarea } from './AutoGrowTextarea';
import { MathPalette } from './MathPalette';
import { MathText } from './MathText';

type Field = 'term' | 'definition';

const FIELD_LABELS: Record<Field, string> = { term: 'Term', definition: 'Definition' };

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
  const [paletteField, setPaletteField] = useState<Field | null>(null);
  const fieldRefs: Record<Field, RefObject<HTMLTextAreaElement | null>> = {
    term: useRef<HTMLTextAreaElement>(null),
    definition: useRef<HTMLTextAreaElement>(null),
  };
  const searchRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<{ field: Field; position: number } | null>(null);

  // Restores the caret after a fallback insertion re-renders the field.
  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    if (!pending) return;

    pendingSelection.current = null;
    fieldRefs[pending.field].current?.setSelectionRange(pending.position, pending.position);
  }, [card.term, card.definition]);

  const togglePalette = (field: Field, e: MouseEvent) => {
    if (paletteField === field) {
      setPaletteField(null);
      return;
    }

    setPaletteField(field);
    // Keyboard users (no pointer, so detail is 0) land in the search box.
    if (e.detail === 0) requestAnimationFrame(() => searchRef.current?.focus());
  };

  const insert = (symbol: MathSymbol) => {
    if (!paletteField) return;
    const el = fieldRefs[paletteField].current;
    if (!el) return;

    const plan = planInsertion(el.value, el.selectionStart, el.selectionEnd, symbol);
    el.focus();
    el.setSelectionRange(plan.from, plan.to);

    // insertText keeps the browser's undo history. jsdom and some browsers lack it.
    if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, plan.text)) {
      el.setSelectionRange(plan.selectionStart, plan.selectionEnd);
      return;
    }

    pendingSelection.current = { field: paletteField, position: plan.selectionStart };
    onChange({ ...card, [paletteField]: el.value.slice(0, plan.from) + plan.text + el.value.slice(plan.to) });
  };

  // The palette closes once focus leaves the card.
  const onBlur = (e: FocusEvent<HTMLLIElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setPaletteField(null);
  };

  const fieldProps = (field: Field) => ({
    field,
    value: card[field],
    textareaRef: fieldRefs[field],
    paletteOpen: paletteField === field,
    onTogglePalette: (e: MouseEvent) => togglePalette(field, e),
    onFocus: () => paletteField && setPaletteField(field),
    onChange: (value: string) => onChange({ ...card, [field]: value }),
  });

  return (
    <li className="card-row" onBlur={onBlur}>
      <header className="card-row-header">
        <span className="card-row-number">{number}</span>

        <div className="card-row-actions">
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
        <CardField {...fieldProps('term')} placeholder="e.g. Mitochondria" />
        <CardField {...fieldProps('definition')} placeholder="e.g. The part of a cell that produces most of its energy" />
      </div>

      {paletteField && (
        <MathPalette
          target={FIELD_LABELS[paletteField]}
          onInsert={insert}
          onClose={() => {
            fieldRefs[paletteField].current?.focus();
            setPaletteField(null);
          }}
          searchRef={searchRef}
        />
      )}
    </li>
  );
}

interface CardFieldProps {
  field: Field;
  value: string;
  placeholder: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  paletteOpen: boolean;
  onTogglePalette: (e: MouseEvent) => void;
  onFocus: () => void;
  onChange: (value: string) => void;
}

function CardField({ field, value, placeholder, textareaRef, paletteOpen, onTogglePalette, onFocus, onChange }: CardFieldProps) {
  const id = useId();
  const label = FIELD_LABELS[field];

  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <button
          type="button"
          className="math-toggle"
          aria-expanded={paletteOpen}
          aria-label={`Math symbols for ${label.toLowerCase()}`}
          title="Insert a math symbol"
          // Keep the caret in the field so the symbol lands where it was.
          onPointerDown={(e) => e.preventDefault()}
          onClick={onTogglePalette}
        >
          Σ
        </button>
      </div>

      <AutoGrowTextarea id={id} ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} placeholder={placeholder} />

      {containsMath(value) && (
        <div className="field-preview">
          <span className="field-preview-label">Preview</span>
          <MathText text={value} />
        </div>
      )}
    </div>
  );
}
