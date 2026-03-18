import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(2);
      expect(switches[0]).toHaveAttribute('aria-checked', 'true');
      expect(switches[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('renders the correct number of arrow inputs', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const arrows = screen.getAllByLabelText(/flecha sin puntuar/i);
      expect(arrows).toHaveLength(ARROWS_PER_END);
    });

    it('shows correct arrow counter starting at 1', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText(/Flecha 1 de 6/)).toBeInTheDocument();
    });

    it('shows initial subtotal of 0', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText(/Subtotal:/)).toBeInTheDocument();
      expect(screen.getByText(/0 pts/)).toBeInTheDocument();
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
  });

  describe('toggle between target and numpad', () => {
    it('starts in target mode by default', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toHaveAttribute('aria-checked', 'true');
      expect(switches[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles to numpad mode when clicking keyboard button', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);

      expect(switches[1]).toHaveAttribute('aria-checked', 'true');
      expect(switches[0]).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles back to target mode when clicking target button', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);
      fireEvent.click(switches[0]);

      expect(switches[0]).toHaveAttribute('aria-checked', 'true');
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

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);

      expect(screen.getByRole('button', { name: /siete puntos/i })).toBeInTheDocument();
    });
  });

  describe('score flow from TargetFace', () => {
    it('records score when clicking target ring', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[4]); // Score 5

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('5');
    });

    it('tracks multiple arrows correctly', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[4]);
      fireEvent.click(rings[8]);
      fireEvent.click(rings[0]);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('5');
      expect(arrows[1]).toHaveTextContent('9');
      expect(arrows[2]).toHaveTextContent('1');
    });

    it('marks gold rings correctly', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[9]); // Score 10 (gold)

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveAttribute('aria-label', 'Flecha: 10 puntos');
    });

    it('shows undo button after entering first arrow', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[0]);

      const undoButtons = screen.getAllByText('Deshacer última');
      expect(undoButtons.length).toBeGreaterThan(0);
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

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);

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

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);

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

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);

      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);

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

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);

      expect(localStorage.getItem(STORAGE_KEY)).toBe('numpad');
    });

    it('saves numpad mode to localStorage on toggle', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[1]);
      fireEvent.click(switches[0]);

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

      const switches = screen.getAllByRole('switch');
      expect(switches[1]).toHaveAttribute('aria-checked', 'true');
    });

    it('ignores invalid localStorage values', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-value');

      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toHaveAttribute('aria-checked', 'true');
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

      const rings = screen.getAllByRole('button');
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(rings[i]);
      }

      const confirmButtons = screen.getAllByText('Confirmar tanda');
      expect(confirmButtons.length).toBeGreaterThan(0);
    });

    it('calls onComplete with all arrows when confirming', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(rings[i]);
      }

      const confirmButtons = screen.getAllByText('Confirmar tanda');
      fireEvent.click(confirmButtons[0]);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
      expect(mockOnComplete).toHaveBeenCalledWith([
        { score: 1, isGold: false },
        { score: 2, isGold: false },
        { score: 3, isGold: false },
        { score: 4, isGold: false },
        { score: 5, isGold: false },
        { score: 6, isGold: false },
      ]);
    });

    it('resets state after completing end', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(rings[i]);
      }

      const confirmButtons = screen.getAllByText('Confirmar tanda');
      fireEvent.click(confirmButtons[0]);

      const arrows = screen.getAllByLabelText(/flecha/i);
      expect(arrows[0]).toHaveTextContent('');
    });

    it('shows correct button when not complete', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[0]);
      fireEvent.click(rings[1]);
      fireEvent.click(rings[2]);

      const confirmButtons = screen.queryAllByText('Confirmar tanda');
      expect(confirmButtons).toHaveLength(0);
    });

    it('shows Corregir button when complete instead of Deshacer', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(rings[i]);
      }

      const corregirButtons = screen.getAllByText('Corregir');
      expect(corregirButtons.length).toBeGreaterThan(0);
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

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[4]);
      fireEvent.click(rings[8]);

      const undoButton = screen.getAllByText('Deshacer última');
      fireEvent.click(undoButton[0]);

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

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[4]);
      fireEvent.click(rings[8]);

      expect(screen.getByText(/Flecha 3 de 6/)).toBeInTheDocument();

      const undoButton = screen.getAllByText('Deshacer última');
      fireEvent.click(undoButton[0]);

      expect(screen.getByText(/Flecha 2 de 6/)).toBeInTheDocument();
    });

    it('does not undo when currentIndex is 0', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const undoButtons = screen.queryAllByText('Deshacer última');
      expect(undoButtons).toHaveLength(0);
    });

    it('allows multiple undos', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
        />
      );

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[4]);
      fireEvent.click(rings[8]);
      fireEvent.click(rings[0]);

      const undoButton = screen.getAllByText('Deshacer última');
      fireEvent.click(undoButton[0]);
      fireEvent.click(undoButton[0]);
      fireEvent.click(undoButton[0]);

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

      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toBeDisabled();
    });

    it('does not accept scores when disabled', () => {
      render(
        <EndInput
          arrowsPerEnd={ARROWS_PER_END}
          onComplete={mockOnComplete}
          disabled={true}
        />
      );

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[4]);

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

      const rings = screen.getAllByRole('button');
      for (let i = 0; i < ARROWS_PER_END; i++) {
        fireEvent.click(rings[i]);
      }

      expect(mockOnComplete).not.toHaveBeenCalled();
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

      expect(screen.getByText(/Flecha 1 de 3/)).toBeInTheDocument();

      const rings = screen.getAllByRole('button');
      fireEvent.click(rings[0]);
      fireEvent.click(rings[1]);
      fireEvent.click(rings[2]);

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

      expect(screen.getByText(/Flecha 1 de 12/)).toBeInTheDocument();
    });
  });
});
