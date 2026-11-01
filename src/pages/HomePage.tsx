import { useRef, useState, type ChangeEvent } from 'react';

import { useAsync } from '../hooks/useAsync';
import { useRepository } from '../hooks/RepositoryContext';
import { downloadTextFile } from '../lib/download';
import { NEW_SHEET_ID, hrefFor, navigate } from '../lib/routes';
import { FILE_EXTENSION, StudysheetFileError, fileNameFor, parseStudysheetFile, serializeStudysheet } from '../lib/studysheetFile';
import type { StudysheetSummary } from '../lib/types';

export function HomePage() {
  const repository = useRepository();
  const [sheets, reload] = useAsync(() => repository.listSummaries(), [repository]);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';

    const imported: string[] = [];
    const failed: string[] = [];

    for (const file of files) {
      try {
        const { sheet, cards } = parseStudysheetFile(await file.text());
        await repository.save(sheet, cards);
        imported.push(sheet.title);
      } catch (error) {
        const reason = error instanceof StudysheetFileError ? error.message : 'Could not read the file.';
        failed.push(`${file.name}: ${reason}`);
      }
    }

    if (failed.length) setNotice({ tone: 'error', text: failed.join(' ') });
    else if (imported.length) setNotice({ tone: 'success', text: `Imported ${imported.join(', ')}.` });

    reload();
  };

  const onExport = async (summary: StudysheetSummary) => {
    const data = await repository.get(summary.id);
    if (data) downloadTextFile(fileNameFor(data.sheet.title), serializeStudysheet(data));
  };

  const onDelete = async (summary: StudysheetSummary) => {
    const cards = `${summary.cardCount} card${summary.cardCount === 1 ? '' : 's'}`;
    if (!window.confirm(`Delete "${summary.title}" and its ${cards}? This cannot be undone.`)) return;

    await repository.delete(summary.id);
    reload();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Your studysheets</h1>
          <p className="page-subtitle">Everything is stored in this browser. Export a sheet to back it up or share it.</p>
        </div>

        <div className="page-actions">
          <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
            Import
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'edit', sheetId: NEW_SHEET_ID })}>
            New studysheet
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={`${FILE_EXTENSION},application/json,.json`}
            multiple
            hidden
            onChange={onImport}
            data-testid="import-input"
          />
        </div>
      </header>

      {notice && (
        <div className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <span>{notice.text}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {sheets.status === 'loading' && <p className="muted">Loading…</p>}
      {sheets.status === 'error' && <p className="notice notice-error">Could not open storage: {sheets.error.message}</p>}

      {sheets.status === 'success' && sheets.data.length === 0 && (
        <div className="empty">
          <h2>No studysheets yet</h2>
          <p className="muted">Create one for your next exam, or import a <code>{FILE_EXTENSION}</code> file.</p>
        </div>
      )}

      {sheets.status === 'success' && sheets.data.length > 0 && (
        <ul className="sheet-grid">
          {sheets.data.map((sheet) => (
            <SheetTile key={sheet.id} sheet={sheet} onExport={() => onExport(sheet)} onDelete={() => onDelete(sheet)} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface SheetTileProps {
  sheet: StudysheetSummary;
  onExport: () => void;
  onDelete: () => void;
}

function SheetTile({ sheet, onExport, onDelete }: SheetTileProps) {
  const canStudy = sheet.cardCount > 0;

  return (
    <li className="sheet-tile">
      <a className="sheet-tile-main" href={hrefFor({ name: 'edit', sheetId: sheet.id })}>
        <h2 className="sheet-tile-title">{sheet.title}</h2>
        {sheet.description && <p className="sheet-tile-description">{sheet.description}</p>}
        <p className="sheet-tile-meta">
          {sheet.cardCount} card{sheet.cardCount === 1 ? '' : 's'} · Updated {formatDate(sheet.updatedAt)}
        </p>
      </a>

      <div className="sheet-tile-actions">
        {canStudy ? (
          <>
            <a className="btn btn-primary btn-sm" href={hrefFor({ name: 'study', sheetId: sheet.id, direction: 'term' })}>
              Study
            </a>
            <a className="btn btn-secondary btn-sm" href={hrefFor({ name: 'study', sheetId: sheet.id, direction: 'definition' })}>
              Study reversed
            </a>
          </>
        ) : (
          <a className="btn btn-secondary btn-sm" href={hrefFor({ name: 'edit', sheetId: sheet.id })}>
            Add cards
          </a>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExport} aria-label={`Export ${sheet.title}`}>
          Export
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={onDelete} aria-label={`Delete ${sheet.title}`}>
          Delete
        </button>
      </div>
    </li>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
