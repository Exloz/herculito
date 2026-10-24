import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { CommandMenu } from './CommandMenu';
import { THEMES } from '../theme/themes';

beforeEach(() => {
  window.localStorage.clear();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

function setup(isAdmin = false) {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  render(<ThemeProvider><CommandMenu isAdmin={isAdmin} onNavigate={onNavigate} onClose={onClose} /></ThemeProvider>);
  return { onNavigate, onClose, input: screen.getByRole('combobox', { name: 'Buscar acciones' }) };
}

describe('command navigation', () => {
  it('searches without accents and opens the filtered destination with Enter', () => {
    const { input, onNavigate, onClose } = setup();
    fireEvent.change(input, { target: { value: 'evolucion' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('progress');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('wraps keyboard selection and runs the selected theme action', () => {
    const { input, onNavigate } = setup();
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const lastTheme = THEMES[THEMES.length - 1];
    expect(input.getAttribute('aria-activedescendant')).toBe(`command-theme-${lastTheme.id}`);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(document.documentElement.dataset.theme).toBe(lastTheme.id);
    expect(window.localStorage.getItem('herculito-theme')).toBe(lastTheme.id);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('finds and applies a named theme without changing destination', () => {
    const { input, onNavigate } = setup();
    fireEvent.change(input, { target: { value: 'bosque' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(document.documentElement.dataset.theme).toBe('forest');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not run a stale selection after a query has no results', () => {
    const { input, onNavigate, onClose } = setup();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.change(input, { target: { value: 'no-such-command' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('option')).toBeNull();
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows administration only to an admin', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'admin' } });
    expect(screen.queryByRole('option')).toBeNull();
    cleanup();
    const admin = setup(true);
    fireEvent.change(admin.input, { target: { value: 'admin' } });
    fireEvent.keyDown(admin.input, { key: 'Enter' });
    expect(admin.onNavigate).toHaveBeenCalledWith('admin');
  });

  it('closes with Escape, unlocks scrolling and returns focus to its trigger', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return <ThemeProvider><button onClick={() => setOpen(true)}>Abrir acciones</button>
        {open && <CommandMenu isAdmin={false} onNavigate={vi.fn()} onClose={() => setOpen(false)} />}
      </ThemeProvider>;
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir acciones' });
    trigger.focus();
    fireEvent.click(trigger);
    const input = screen.getByRole('combobox', { name: 'Buscar acciones' });
    expect(document.activeElement).toBe(input);
    expect(document.body.classList.contains('dialog-open')).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.classList.contains('dialog-open')).toBe(false);
  });
});
