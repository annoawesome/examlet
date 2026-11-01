import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MathText } from './MathText';

describe('MathText', () => {
  it('renders LaTeX with KaTeX', () => {
    const { container } = render(<MathText text="Let $x^2$ be" />);

    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).toContain('Let');
  });

  it('escapes HTML in plain text', () => {
    const { container } = render(<MathText text="<img src=x onerror=alert(1)>" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('does not crash on invalid LaTeX', () => {
    const { container } = render(<MathText text="$\\frac{1}{$" />);

    expect(container.querySelector('.katex-error, .katex')).not.toBeNull();
  });

  it('refuses untrusted commands like \\href', () => {
    const { container } = render(<MathText text="$\\href{javascript:alert(1)}{x}$" />);

    expect(container.querySelector('a')).toBeNull();
  });
});
