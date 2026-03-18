import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TargetFace } from './TargetFace';

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

    it('renders all 11 scoring zones', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      // 10 rings + X button + Miss button = 12 buttons total
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThanOrEqual(12);
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

  describe('score values', () => {
    it('calls onScore with score 1 when clicking the outer white ring', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /un punto.*blanco/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(1, false);
    });

    it('calls onScore with score 2', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /dos puntos.*blanco/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(2, false);
    });

    it('calls onScore with score 3', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /tres puntos.*blanco/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(3, false);
    });

    it('calls onScore with score 4', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /cuatro puntos.*negro/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(4, false);
    });

    it('calls onScore with score 5', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /cinco puntos.*negro/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(5, false);
    });

    it('calls onScore with score 6', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /seis puntos.*negro/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(6, false);
    });

    it('calls onScore with score 7', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /siete puntos.*azul/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(7, false);
    });

    it('calls onScore with score 8', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /ocho puntos.*azul/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(8, false);
    });

    it('calls onScore with score 9', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /nueve puntos.*rojo/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(9, false);
    });

    it('calls onScore with score 10 and isGold=false when clicking gold ring', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /diez puntos.*oro/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(10, false);
    });

    it('calls onScore with score 10 and isGold=true when clicking X', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro \(X\)/i });
      fireEvent.click(xButton);
      
      expect(mockOnScore).toHaveBeenCalledWith(10, true);
    });
  });

  describe('isGold flag', () => {
    it('passes isGold=false for scores 1-9', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      // Test score 5 (black ring)
      const score5 = screen.getByRole('button', { name: /cinco puntos/i });
      fireEvent.click(score5);
      expect(mockOnScore).toHaveBeenCalledWith(5, false);

      vi.clearAllMocks();

      // Test score 9 (red ring)
      const score9 = screen.getByRole('button', { name: /nueve puntos/i });
      fireEvent.click(score9);
      expect(mockOnScore).toHaveBeenCalledWith(9, false);
    });

    it('passes isGold=false for regular 10 (gold ring)', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /diez puntos.*oro/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).toHaveBeenCalledWith(10, false);
    });

    it('passes isGold=true for X (center)', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const xButton = screen.getByRole('button', { name: /diez de oro \(X\)/i });
      fireEvent.click(xButton);
      
      expect(mockOnScore).toHaveBeenCalledWith(10, true);
    });
  });

  describe('disabled state', () => {
    it('does not call onScore when disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const ring = screen.getByRole('button', { name: /un punto/i });
      fireEvent.click(ring);
      
      expect(mockOnScore).not.toHaveBeenCalled();
    });

    it('does not call onMiss when disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      fireEvent.click(missButton);
      
      expect(mockOnMiss).not.toHaveBeenCalled();
    });

    it('rings have disabled cursor style', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const ring = screen.getByRole('button', { name: /un punto/i });
      expect(ring).toHaveClass('cursor-not-allowed');
    });

    it('miss button is disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);
      
      const missButton = screen.getByRole('button', { name: /fallo/i });
      expect(missButton).toBeDisabled();
    });

    it('rings are not focusable when disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} disabled={true} />);

      const ring = screen.getByRole('button', { name: /un punto \(blanco\)/i });
      // When disabled, tabIndex should be -1
      expect(ring).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label on SVG', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label', 'Diana de tiro con arco');
    });

    it('rings have aria-label', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      // Check specific ring labels exist
      expect(screen.getByRole('button', { name: /un punto.*blanco/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /diez puntos.*oro/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /diez de oro \(X\)/i })).toBeInTheDocument();
    });

    it('miss button has aria-label', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const missButton = screen.getByRole('button', { name: /fallo.*0 puntos/i });
      expect(missButton).toBeInTheDocument();
    });

    it('scoring elements have role button', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      // Get all buttons including rings and miss button
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThanOrEqual(11);
    });

    it('rings are focusable when not disabled', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);

      const ring = screen.getByRole('button', { name: /un punto \(blanco\)/i });
      // SVG elements may not expose tabIndex as attribute, check it's not -1
      const tabIndex = ring.getAttribute('tabindex');
      expect(tabIndex).not.toBe('-1');
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

  describe('keyboard navigation', () => {
    it('calls onScore when pressing Enter on a ring', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /un punto.*blanco/i });
      fireEvent.keyDown(ring, { key: 'Enter' });
      
      expect(mockOnScore).toHaveBeenCalledWith(1, false);
    });

    it('calls onScore when pressing Space on a ring', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);
      
      const ring = screen.getByRole('button', { name: /dos puntos.*blanco/i });
      fireEvent.keyDown(ring, { key: ' ' });
      
      expect(mockOnScore).toHaveBeenCalledWith(2, false);
    });

    it('calls onScore for X when pressing Enter', () => {
      render(<TargetFace onScore={mockOnScore} onMiss={mockOnMiss} />);

      const xButton = screen.getByRole('button', { name: /diez de oro \(X\)/i });
      fireEvent.keyDown(xButton, { key: 'Enter' });

      expect(mockOnScore).toHaveBeenCalledWith(10, true);
    });
  });
});
