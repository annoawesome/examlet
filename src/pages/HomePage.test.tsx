import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithRepository } from '../test/renderWithRepository';
import { HomePage } from './HomePage';

const validFile = JSON.stringify({
  format: 'examlet.studysheet',
  version: 1,
  exportedAt: '2026-10-31T00:00:00.000Z',
  studysheet: {
    title: 'Modern Algebra Exam 2',
    description: '',
    cards: [{ term: 'Group', definition: 'A set with an associative operation, identity, and inverses.' }],
  },
});

describe('HomePage', () => {
  it('shows an empty state', async () => {
    renderWithRepository(<HomePage />);

    expect(await screen.findByText('No studysheets yet')).toBeInTheDocument();
  });

  it('imports a .studysheet.json file and lists it', async () => {
    const user = userEvent.setup();
    const { repository } = renderWithRepository(<HomePage />);
    await screen.findByText('No studysheets yet');

    const file = new File([validFile], 'algebra.studysheet.json', { type: 'application/json' });
    await user.upload(screen.getByTestId('import-input'), file);

    expect(await screen.findByRole('heading', { name: 'Modern Algebra Exam 2' })).toBeInTheDocument();
    expect(screen.getByText(/1 card ·/)).toBeInTheDocument();
    expect(await repository.listSummaries()).toHaveLength(1);
  });

  it('reports invalid files', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderWithRepository(<HomePage />);
    await screen.findByText('No studysheets yet');

    await user.upload(screen.getByTestId('import-input'), new File(['{"nope":1}'], 'bad.json'));

    expect(await screen.findByRole('alert')).toHaveTextContent('not an Examlet studysheet');
  });
});
