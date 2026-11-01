import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAutosave } from './useAutosave';

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useAutosave', () => {
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('saves pending edits as soon as the page is hidden', async () => {
    const save = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useAutosave(save, 60_000));

    act(() => result.current.schedule('draft'));
    expect(save).not.toHaveBeenCalled();

    await act(async () => setVisibility('hidden'));

    expect(save).toHaveBeenCalledWith('draft');
  });

  it('saves pending edits on pagehide', async () => {
    const save = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useAutosave(save, 60_000));

    act(() => result.current.schedule('draft'));
    await act(async () => window.dispatchEvent(new Event('pagehide')));

    expect(save).toHaveBeenCalledWith('draft');
  });

  it('does nothing when the page becomes visible', async () => {
    const save = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useAutosave(save, 60_000));

    act(() => result.current.schedule('draft'));
    await act(async () => setVisibility('visible'));

    expect(save).not.toHaveBeenCalled();
  });
});
