import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EndInput } from './EndInput';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] || null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

const STORAGE_KEY = 'herculito:archery:inputMode';

const mockSvgBounds = (svg: Element) => {
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: 400,
      height: 400,
      top: 0,
      left: 0,
      right: 400,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
};

describe('EndInput', () => {
  let mockOnComplete: (arrows: { score: number; isGold: boolean }[]) => void;
  let mockOnCancel: () => void;

  beforeEach(() => {
    mockOnComplete = vi.fn();
    mockOnCancel = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const ARROWS_PER_END = 6;

  describe('initial rendering', () => {
    it('renders with default target mode', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      // Now uses role="radio" instead of "switch"
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
      expect(radios[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('renders the correct number of arrow inputs', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows).toHaveLength(ARROWS_PER_END);
    });

    it('shows correct arrow counter starting at 1', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      // New format: "Flecha X" without "de Y"
      expect(screen.getByText(/Flecha 1/)).toBeInTheDocument();
    });

    it('shows initial subtotal', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      // New format: shows just the number with "pts"
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('pts')).toBeInTheDocument();
    });

    it('does not show undo button initially', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.queryByRole('button', { name: /deshacer/i })).not.toBeInTheDocument();
    });

    it('does not expose empty arrows as clickable buttons', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.queryByRole('button', { name: /flecha sin puntuar/i })).not.toBeInTheDocument();
    });
  });

  describe('toggle between target and numpad', () => {
    it('starts in target mode by default', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
      expect(radios[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles to numpad mode when clicking keyboard button', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);

      const radios = screen.getAllByRole('radio');
      expect(radios[1]).toHaveAttribute('aria-checked', 'true');
      expect(radios[0]).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles back to target mode when clicking target button', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);
      
      const targetButton = screen.getByRole('radio', { name: /diana/i });
      fireEvent.click(targetButton);

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    });

    it('renders TargetFace when in target mode', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const targetSvg = screen.getByRole('img', { name: /diana de tiro con arco/i });
      expect(targetSvg).toBeInTheDocument();
    });

    it('renders ScoreNumpad when in numpad mode', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);

      expect(screen.getByRole('button', { name: /siete puntos/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation between toggle options', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const targetButton = screen.getByRole('radio', { name: /diana/i });
      fireEvent.keyDown(targetButton, { key: 'ArrowRight' });

      expect(screen.getByRole('radio', { name: /teclado/i })).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('score flow from TargetFace', () => {
    it('records score when clicking X button', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      // Click the X button
      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('X');
    });

    it('tracks multiple arrows correctly', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      
      // Click again for next arrow
      fireEvent.click(xButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('X');
      expect(arrows[1]).toHaveTextContent('X');
    });

    it('shows undo button after entering first arrow', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);

      const undoButtons = screen.getAllByText('Deshacer');
      expect(undoButtons.length).toBeGreaterThan(0);
    });

    it('maps SVG hits to the expected ring scores', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const svg = screen.getByRole('img', { name: /diana de tiro con arco/i });
      mockSvgBounds(svg);

      fireEvent.click(svg, { clientX: 230, clientY: 200 });
      fireEvent.click(svg, { clientX: 270, clientY: 200 });

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('9');
      expect(arrows[1]).toHaveTextContent('7');
    });

    it('supports keyboard shortcut D for a regular 10', () => {
      const { container } = render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const shortcutHost = container.querySelector('.end-input-container > div[tabindex="-1"]');
      expect(shortcutHost).not.toBeNull();

      fireEvent.keyDown(shortcutHost as Element, { key: 'd' });

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('10');
    });
  });

  describe('editing existing arrows', () => {
    it('allows editing an earlier arrow without losing completion flow', () => {
      render(
        <EndInput
          arrowsPerEnd={3}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      fireEvent.click(xButton);
      fireEvent.click(xButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      fireEvent.click(arrows[1]);

      expect(screen.getByText(/Editando flecha 2/i)).toBeInTheDocument();

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);
      fireEvent.click(screen.getByRole('button', { name: /siete puntos/i }));

      expect(arrows[1]).toHaveTextContent('7');
      expect(screen.getByRole('button', { name: /confirmar tanda/i })).toBeInTheDocument();
    });
  });

  describe('score flow from ScoreNumpad', () => {
    it('records score when clicking numpad button', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);

      const numpadButton = screen.getByRole('button', { name: /siete puntos/i });
      fireEvent.click(numpadButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('7');
    });

    it('handles miss in numpad mode', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);

      const missButton = screen.getByRole('button', { name: /fallo/i });
      fireEvent.click(missButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('0');
    });

    it('handles X (10 gold) in numpad mode', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('X');
    });

    it('handles regular 10 in numpad mode', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);

      const tenButton = screen.getByRole('button', { name: /diez puntos/i });
      fireEvent.click(tenButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('10');
    });
  });

  describe('localStorage persistence', () => {
    it('saves target mode to localStorage on toggle', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);

      expect(localStorage.getItem(STORAGE_KEY)).toBe('numpad');
    });

    it('saves numpad mode to localStorage on toggle', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const keyboardButton = screen.getByRole('radio', { name: /teclado/i });
      fireEvent.click(keyboardButton);
      
      const targetButton = screen.getByRole('radio', { name: /diana/i });
      fireEvent.click(targetButton);

      expect(localStorage.getItem(STORAGE_KEY)).toBe('target');
    });

    it('loads saved mode from localStorage on mount', () => {
      localStorage.setItem(STORAGE_KEY, 'numpad');

      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const radios = screen.getAllByRole('radio');
      expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    });

    it('ignores invalid localStorage values', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-value');

      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('complete end and reset state', () => {
    it('shows complete button when all arrows are entered', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(xButton);
      }

      const confirmButtons = screen.getAllByText('Confirmar tanda');
      expect(confirmButtons.length).toBeGreaterThan(0);
    });

    it('calls onComplete with all arrows when confirming', async () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(xButton);
      }

      const confirmButtons = screen.getAllByText('Confirmar tanda');
      fireEvent.click(confirmButtons[0]);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });

      // All arrows should be X (10 gold)
      const expectedArrows = Array(ARROWS_PER_END).fill(null).map(() => ({ score: 10, isGold: true }));
      expect(mockOnComplete).toHaveBeenCalledWith(expectedArrows);
    });

    it('resets state after completing end', async () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(xButton);
      }

      const confirmButtons = screen.getAllByText('Confirmar tanda');
      fireEvent.click(confirmButtons[0]);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByLabelText(/Flecha activa, sin puntuar/i)).toBeInTheDocument();
    });

    it('shows Corregir button when complete', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(xButton);
      }

      const corregirButtons = screen.getAllByText('Corregir');
      expect(corregirButtons.length).toBeGreaterThan(0);
    });

    it('preserves arrows if onComplete fails', async () => {
      const failingOnComplete = vi.fn().mockRejectedValue(new Error('save failed'));

      render(
        <EndInput
          arrowsPerEnd={3}
          onComplete={failingOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      fireEvent.click(xButton);
      fireEvent.click(xButton);

      fireEvent.click(screen.getByRole('button', { name: /confirmar tanda/i }));

      expect(await screen.findByText(/No se pudo guardar la tanda/i)).toBeInTheDocument();

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('X');
      expect(arrows[1]).toHaveTextContent('X');
      expect(arrows[2]).toHaveTextContent('X');
    });
  });

  describe('undo functionality', () => {
    it('undoes last arrow when clicking undo', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      fireEvent.click(xButton);

      const undoButton = screen.getByText('Deshacer');
      fireEvent.click(undoButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[1]).toHaveTextContent('');
    });

    it('moves back to previous arrow after undo', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      fireEvent.click(xButton);

      expect(screen.getByText(/Flecha 3/)).toBeInTheDocument();

      const undoButton = screen.getByText('Deshacer');
      fireEvent.click(undoButton);

      expect(screen.getByText(/Flecha 2/)).toBeInTheDocument();
    });

    it('does not undo when currentIndex is 0', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const undoButtons = screen.queryAllByText('Deshacer');
      expect(undoButtons).toHaveLength(0);
    });

    it('allows multiple undos', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      fireEvent.click(xButton);
      fireEvent.click(xButton);

      const undoButton = screen.getByText('Deshacer');
      fireEvent.click(undoButton);
      fireEvent.click(undoButton);
      fireEvent.click(undoButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('');
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
          disabled={true}
        />
      );

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toBeDisabled();
    });

    it('does not accept scores when disabled', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
          disabled={true}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('');
    });

    it('does not call onComplete when disabled', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
          disabled={true}
        />
      );

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(xButton);
      }

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('scopes keyboard shortcuts to the focused end input', () => {
      const { container } = render(
        <div>
          <EndInput arrowsPerEnd={3} onComplete={mockOnComplete} />
          <EndInput arrowsPerEnd={3} onComplete={mockOnComplete} />
        </div>
      );

      const shortcutHosts = container.querySelectorAll('.end-input-container > div[tabindex="-1"]');
      expect(shortcutHosts).toHaveLength(2);

      fireEvent.keyDown(shortcutHosts[0], { key: '7' });

      const firstArrows = shortcutHosts[0].querySelectorAll('[aria-label*="Flecha"]');
      const secondArrows = shortcutHosts[1].querySelectorAll('[aria-label*="Flecha"]');

      expect(firstArrows[0]).toHaveTextContent('7');
      expect(secondArrows[0]).not.toHaveTextContent('7');
    });

    it('shows cancel button when provided and disabled', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
          disabled={true}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('cancel functionality', () => {
    it('renders cancel button when onCancel is provided', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not render cancel button when onCancel is not provided', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });
  });

  describe('custom arrowsPerEnd', () => {
    it('works with 3 arrows per end', () => {
      render(
        <EndInput
          arrowsPerEnd={3}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText(/Flecha 1/)).toBeInTheDocument();

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      fireEvent.click(xButton);
      fireEvent.click(xButton);

      const confirmButtons = screen.getAllByText('Confirmar tanda');
      expect(confirmButtons.length).toBeGreaterThan(0);
    });

    it('works with 12 arrows per end (recurve)', () => {
      render(
        <EndInput
          arrowsPerEnd={12}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText(/Flecha 1/)).toBeInTheDocument();
    });
  });
});
