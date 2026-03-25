import { useRef } from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogA11y } from './useDialogA11y';

const DialogHarness = ({ label }: { label: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref);

  return (
    <div ref={ref} role="dialog" aria-label={label} tabIndex={-1}>
      <button type="button">{label}</button>
    </div>
  );
};

describe('useDialogA11y', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.paddingRight = '12px';

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 240,
    });

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000,
    });

    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 980,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores body styles on close', () => {
    const { unmount } = render(<DialogHarness label="Dialog principal" />);

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('20px');
    expect(document.body.classList.contains('dialog-open')).toBe(true);

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.paddingRight).toBe('12px');
    expect(document.body.classList.contains('dialog-open')).toBe(false);
  });

  it('keeps the body locked until the last stacked dialog closes', () => {
    const { rerender, unmount } = render(
      <>
        <DialogHarness label="Dialog padre" />
        <DialogHarness label="Dialog hijo" />
      </>
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('20px');
    expect(document.body.classList.contains('dialog-open')).toBe(true);

    rerender(<DialogHarness label="Dialog padre" />);

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('20px');
    expect(document.body.classList.contains('dialog-open')).toBe(true);

    unmount();

    expect(document.body.classList.contains('dialog-open')).toBe(false);
  });
});
