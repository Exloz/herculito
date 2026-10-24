import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { MobileAccountMenu } from './MobileAccountMenu';

vi.mock('../../features/auth/components/ClerkUserButton', () => ({ default: () => <button>Gestionar cuenta</button> }));
afterEach(cleanup);

function setup(isAdmin = false) {
  const onNavigate = vi.fn();
  const onLogout = vi.fn();
  function Harness() {
    const [open, setOpen] = useState(false);
    return <ThemeProvider><button onClick={() => setOpen(true)}>Opciones</button>
      {open && <MobileAccountMenu userName="Alex" isAdmin={isAdmin} onNavigate={onNavigate}
        onLogout={onLogout} onClose={() => setOpen(false)} />}</ThemeProvider>;
  }
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Opciones' });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, onNavigate, onLogout };
}

describe('mobile account sheet', () => {
  it('closes with Escape, restores focus and releases the scroll lock', () => {
    const { trigger, onLogout } = setup();
    expect(screen.getByRole('dialog', { name: 'Tu cuenta' })).toBeTruthy();
    expect(document.body.classList.contains('dialog-open')).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.classList.contains('dialog-open')).toBe(false);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('opens measurements and closes the sheet', () => {
    const { onNavigate } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Mis medidas' }));
    expect(onNavigate).toHaveBeenCalledWith('profile');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps administration available to mobile admins only', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Administración' })).toBeNull();
    cleanup();
    const { onNavigate } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'Administración' }));
    expect(onNavigate).toHaveBeenCalledWith('admin');
  });

  it('changes appearance without signing out and signs out only on request', () => {
    const { onLogout } = setup();
    fireEvent.change(screen.getByRole('combobox', { name: 'Apariencia' }), { target: { value: 'light' } });
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
