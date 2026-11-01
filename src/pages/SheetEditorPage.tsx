import { useEffect, useRef, useState } from 'react';

import { CardEditorRow } from '../components/CardEditorRow';
import { AutoGrowTextarea } from '../components/AutoGrowTextarea';
import { useAutosave, type SaveStatus } from '../hooks/useAutosave';
import { useRepository } from '../hooks/RepositoryContext';
import { downloadTextFile } from '../lib/download';
import { draftFrom, emptyCard, hasContent, isBlank, moveItem, newDraft, toStored, type EditorDraft } from '../lib/editor';
import { NEW_SHEET_ID, hrefFor, navigate } from '../lib/routes';
import { fileNameFor, serializeStudysheet } from '../lib/studysheetFile';
import type { CardDraft } from '../lib/types';

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; draft: EditorDraft };

export function SheetEditorPage({ sheetId }: { sheetId: string }) {
  const repository = useRepository();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const loadedId = useRef<string | null>(null);

  const { status: saveStatus, schedule } = useAutosave(async (draft: EditorDraft) => {
    const { sheet, cards } = toStored(draft);
    await repository.save(sheet, cards);

    // The first save of a new sheet gives it a real URL, unless the user
    // already navigated away (the save was flushed on unmount).
    const stillOnNewSheet = window.location.hash === hrefFor({ name: 'edit', sheetId: NEW_SHEET_ID });
    if (sheetId === NEW_SHEET_ID && stillOnNewSheet) {
      loadedId.current = sheet.id;
      navigate({ name: 'edit', sheetId: sheet.id }, { replace: true });
    }
  });

  useEffect(() => {
    // Swapping /new for the real id after the first save must not reload.
    if (sheetId === loadedId.current) return;

    if (sheetId === NEW_SHEET_ID) {
      setState({ status: 'ready', draft: newDraft() });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    repository.get(sheetId).then((data) => {
      if (cancelled) return;
      loadedId.current = sheetId;
      setState(data ? { status: 'ready', draft: draftFrom(data) } : { status: 'missing' });
    });

    return () => {
      cancelled = true;
    };
  }, [repository, sheetId]);

  if (state.status === 'loading') return <p className="page muted">Loading…</p>;
  if (state.status === 'missing') return <MissingSheet />;

  const { draft } = state;
  const studyableCount = draft.cards.filter((card) => !isBlank(card)).length;

  const update = (next: EditorDraft) => {
    setState({ status: 'ready', draft: next });
    if (hasContent(next)) schedule(next);
  };

  const updateSheet = (fields: Partial<Pick<EditorDraft['sheet'], 'title' | 'description'>>) =>
    update({ ...draft, sheet: { ...draft.sheet, ...fields } });

  const updateCards = (cards: CardDraft[]) => update({ ...draft, cards });

  const addCard = () => {
    updateCards([...draft.cards, emptyCard()]);

    // Focus the new card's term once it renders.
    requestAnimationFrame(() => {
      const rows = document.querySelectorAll<HTMLTextAreaElement>('.card-row textarea');
      rows[rows.length - 2]?.focus();
    });
  };

  const onExport = () => {
    const stored = toStored(draft);
    downloadTextFile(fileNameFor(stored.sheet.title), serializeStudysheet(stored));
  };

  const isSaved = sheetId !== NEW_SHEET_ID;

  return (
    <div className="page editor">
      <header className="page-header">
        <div className="editor-heading">
          <a className="back-link" href={hrefFor({ name: 'home' })}>
            ← All studysheets
          </a>
          <SaveIndicator status={saveStatus} />
        </div>

        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={onExport} disabled={!hasContent(draft)}>
            Export
          </button>
          <StudyLink sheetId={draft.sheet.id} direction="definition" label="Study reversed" disabled={!isSaved || studyableCount === 0} secondary />
          <StudyLink sheetId={draft.sheet.id} direction="term" label="Study" disabled={!isSaved || studyableCount === 0} />
        </div>
      </header>

      <section className="editor-meta">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="input-title"
            value={draft.sheet.title}
            onChange={(e) => updateSheet({ title: e.target.value })}
            placeholder="e.g. Modern Algebra Exam 2"
            autoFocus={sheetId === NEW_SHEET_ID}
          />
        </label>

        <label className="field">
          <span className="field-label">Description</span>
          <AutoGrowTextarea
            value={draft.sheet.description}
            onChange={(e) => updateSheet({ description: e.target.value })}
            placeholder="Optional. What does this sheet cover?"
          />
        </label>

        <p className="hint">
          Write math with LaTeX: <code>$x^2$</code> inline, <code>$$\int_0^1 f(x)\,dx$$</code> for display. Use <code>\$</code> for a literal dollar sign.
        </p>
      </section>

      <h2 className="section-title">
        Cards <span className="muted">({studyableCount})</span>
      </h2>

      <ol className="card-list">
        {draft.cards.map((card, index) => (
          <CardEditorRow
            key={card.id}
            card={card}
            number={index + 1}
            isFirst={index === 0}
            isLast={index === draft.cards.length - 1}
            onChange={(next) => updateCards(draft.cards.map((c) => (c.id === next.id ? next : c)))}
            onRemove={() => updateCards(draft.cards.filter((c) => c.id !== card.id))}
            onMove={(offset) => updateCards(moveItem(draft.cards, index, offset))}
          />
        ))}
      </ol>

      <button type="button" className="btn btn-add-card" onClick={addCard}>
        + Add card
      </button>
    </div>
  );
}

function StudyLink(props: { sheetId: string; direction: 'term' | 'definition'; label: string; disabled: boolean; secondary?: boolean }) {
  const className = `btn ${props.secondary ? 'btn-secondary' : 'btn-primary'}`;

  if (props.disabled) {
    return (
      <button type="button" className={className} disabled title="Add a card to start studying">
        {props.label}
      </button>
    );
  }

  return (
    <a className={className} href={hrefFor({ name: 'study', sheetId: props.sheetId, direction: props.direction })}>
      {props.label}
    </a>
  );
}

const SAVE_LABELS: Record<SaveStatus, string> = {
  idle: '',
  pending: 'Unsaved changes…',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Could not save. Is storage full?',
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span className={`save-indicator save-${status}`} role="status" aria-live="polite">
      {SAVE_LABELS[status]}
    </span>
  );
}

function MissingSheet() {
  return (
    <div className="page empty">
      <h1>Studysheet not found</h1>
      <p className="muted">It may have been deleted, or it lives in a different browser.</p>
      <a className="btn btn-primary" href={hrefFor({ name: 'home' })}>
        Back to studysheets
      </a>
    </div>
  );
}
