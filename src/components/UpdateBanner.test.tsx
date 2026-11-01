import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UpdateBanner } from './UpdateBanner';

describe('UpdateBanner', () => {
  it('reloads or dismisses on request', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    render(<UpdateBanner onReload={onReload} onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toHaveTextContent('A new version of Examlet is ready.');

    await user.click(screen.getByRole('button', { name: 'Later' }));
    expect(onDismiss).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledOnce();
  });
});
