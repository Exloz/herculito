import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TargetFace } from './TargetFace';

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

describe('TargetFace', () => {
  let mockOnScore: (score: number, isGold: boolean) => void;
  let mockOnMiss: () => void;

  beforeEach(() => {
    mockOnScore = vi.fn();
    mockOnMiss = vi.fn();
  });

  describe('rendering', () => {
    it('renders the SVG target face', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const svg = screen.getByRole('img', { name: /diana de tiro con arco/i });
      expect(svg).toBeInTheDocument();
    });

    it('renders the miss button', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      expect(missButton).toBeInTheDocument();
      expect(missButton).toHaveTextContent('Miss');
    });

    it('renders X in the center', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      expect(screen.getByText('X')).toBeInTheDocument();
    });
  });

  describe('score selection via X button', () => {
    it('calls onScore with score 10 and isGold=true when clicking X', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro \(X\)/i });
      fireEvent.click(xButton);
      
      expect(mockOnScore).toHaveBeenCalledWith(10, true);
    });
  });

  describe('score selection via target hit testing', () => {
    it('maps a click in the 9 ring to score 9', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);

      const svg = screen.getByRole('img', { name: /diana de tiro con arco/i });
      mockSvgBounds(svg);
      fireEvent.click(svg, { clientX: 230, clientY: 200 });

      expect(mockOnScore).toHaveBeenCalledWith(9, false);
    });

    it('maps a click in the 7 ring to score 7', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);

      const svg = screen.getByRole('img', { name: /diana de tiro con arco/i });
      mockSvgBounds(svg);
      fireEvent.click(svg, { clientX: 270, clientY: 200 });

      expect(mockOnScore).toHaveBeenCalledWith(7, false);
    });
  });

  describe('keyboard accessibility for X button', () => {
    it('calls onScore with score 10 and isGold=true when pressing Enter on X', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro \(X\)/i });
      fireEvent.keyDown(xButton, { key: 'Enter' });
      
      expect(mockOnScore).toHaveBeenCalledWith(10, true);
    });

    it('calls onScore with score 10 and isGold=true when pressing Space on X', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro \(X\)/i });
      fireEvent.keyDown(xButton, { key: ' ' });
      
      expect(mockOnScore).toHaveBeenCalledWith(10, true);
    });
  });

  describe('disabled state', () => {
    it('does not call onScore when disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      fireEvent.click(xButton);
      
      expect(mockOnScore).not.toHaveBeenCalled();
    });

    it('does not call onMiss when disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      fireEvent.click(missButton);
      
      expect(mockOnMiss).not.toHaveBeenCalled();
    });

    it('miss button is disabled when prop is true', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      expect(missButton).toBeDisabled();
    });

    it('X button has tabIndex -1 when disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      expect(xButton).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label on SVG', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label', 'Diana de tiro con arco');
    });

    it('X button has aria-label', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      expect(screen.getByRole('button', { name: /diez de oro \(X\)/i })).toBeInTheDocument();
    });

    it('miss button has aria-label', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      expect(missButton).toBeInTheDocument();
    });

    it('X button has role button', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro/i });
      expect(xButton).toHaveAttribute('role', 'button');
    });
  });

  describe('miss functionality', () => {
    it('calls onMiss when clicking miss button', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      fireEvent.click(missButton);
      
      expect(mockOnMiss).toHaveBeenCalled();
    });

    it('does not call onScore when clicking miss', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      fireEvent.click(missButton);
      
      expect(mockOnScore).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation for X', () => {
    it('calls onScore for X when pressing Enter', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);

      const xButton = screen.getByRole('button', { name: /diez de oro \(X\)/i });
      fireEvent.keyDown(xButton, { key: 'Enter' });

      expect(mockOnScore).toHaveBeenCalledWith(10, true);
    });
  });
});
