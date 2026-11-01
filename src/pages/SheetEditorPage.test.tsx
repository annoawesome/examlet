import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { NEW_SHEET_ID, hrefFor } from '../lib/routes';
import { createTestRepository, renderWithRepository } from '../test/renderWithRepository';
import { SheetEditorPage } from './SheetEditorPage';

describe('SheetEditorPage', () => {
  beforeEach(() => {
    window.location.hash = hrefFor({ name: 'edit', sheetId: NEW_SHEET_ID });
  });

  it('autosaves a new sheet and its cards to IndexedDB', async () => {
    const user = userEvent.setup();
    const { repository } = renderWithRepository(<SheetEditorPage sheetId={NEW_SHEET_ID} />);

    await user.type(screen.getByLabelText('Title'), 'Modern Algebra Exam 2');
    const [term] = screen.getAllByLabelText('Term');
    const [definition] = screen.getAllByLabelText('Definition');
    await user.type(term!, 'Group');
    await user.type(definition!, 'Closed, associative, identity, inverses');

    await screen.findByText('All changes saved', {}, { timeout: 2000 });

    const [summary] = await repository.listSummaries();
    expect(summary).toMatchObject({ title: 'Modern Algebra Exam 2', cardCount: 1 });
    await waitFor(() => expect(window.location.hash).toBe(hrefFor({ name: 'edit', sheetId: summary!.id })));
  });

  it('edits an existing sheet', async () => {
    const user = userEvent.setup();
    const repository = createTestRepository();
    await repository.save({ id: 's1', title: 'Old title', description: '', createdAt: 0, updatedAt: 0 }, []);

    renderWithRepository(<SheetEditorPage sheetId="s1" />, repository);
    const title = await screen.findByDisplayValue('Old title');

    await user.clear(title);
    await user.type(title, 'New title');
    await screen.findByText('All changes saved', {}, { timeout: 2000 });

    expect((await repository.get('s1'))?.sheet.title).toBe('New title');
  });

  it('shows a not-found state for unknown sheets', async () => {
    renderWithRepository(<SheetEditorPage sheetId="missing" />);

    expect(await screen.findByText('Studysheet not found')).toBeInTheDocument();
  });
});
