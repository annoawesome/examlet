import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { makeCards } from '../test/fixtures';
import { createTestRepository, renderWithRepository } from '../test/renderWithRepository';
import { StudyPage } from './StudyPage';

async function setup(direction: 'term' | 'definition' = 'term', count = 3) {
  const repository = createTestRepository();
  await repository.save({ id: 's1', title: 'Algebra', description: '', createdAt: 0, updatedAt: 0 }, makeCards(count, 's1'));

  renderWithRepository(<StudyPage sheetId="s1" direction={direction} />, repository);
  await screen.findByText(/Card 1 of/);
}

function visibleFace(): HTMLElement {
  return document.querySelector<HTMLElement>('.flashcard-face:not([aria-hidden="true"])')!;
}

describe('StudyPage', () => {
  it('shows the term first, reveals the definition, and scores the session', async () => {
    const user = userEvent.setup();
    await setup('term', 3);

    expect(within(visibleFace()).getByText(/^Term \d$/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Got it/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reveal the definition/ }));
    expect(within(visibleFace()).getByText(/^Definition \d$/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Got it/ }));
    await user.click(screen.getByRole('button', { name: /Reveal definition/ }));
    await user.click(screen.getByRole('button', { name: /Missed it/ }));
    await user.click(screen.getByRole('button', { name: /Reveal definition/ }));
    await user.click(screen.getByRole('button', { name: /Got it/ }));

    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText(/Cards to review/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry 1 missed' })).toBeInTheDocument();
  });

  it('shows the definition first in reverse mode', async () => {
    await setup('definition', 2);

    expect(within(visibleFace()).getByText(/^Definition \d$/)).toBeInTheDocument();
  });

  it('supports keyboard flipping and grading', async () => {
    const user = userEvent.setup();
    await setup('term', 1);

    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: /Got it/ })).toBeInTheDocument();

    await user.keyboard('2');
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Perfect run!')).toBeInTheDocument();
  });

  it('retries only the missed cards', async () => {
    const user = userEvent.setup();
    await setup('term', 2);

    for (const grade of ['1', '2']) {
      await user.keyboard(' ');
      await user.keyboard(grade);
    }
    await user.click(screen.getByRole('button', { name: 'Retry 1 missed' }));

    expect(screen.getByText('Card 1 of 1')).toBeInTheDocument();
  });
});
