import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PresetNumericInput } from './PresetNumericInput';

describe('PresetNumericInput', () => {
  it('renders the label and the current numeric value', () => {
    render(
      <PresetNumericInput
        label="Distancia"
        value={70}
        onChange={vi.fn()}
        presets={[18, 25, 70]}
      />
    );

    expect(screen.getByLabelText('Distancia')).toHaveValue(70);
  });

  it('emits the typed value when it is within the allowed range', () => {
    const onChange = vi.fn();
    render(
      <PresetNumericInput
        label="Distancia"
        value={70}
        onChange={onChange}
        presets={[18, 25, 70]}
        min={1}
        max={200}
      />
    );

    fireEvent.change(screen.getByLabelText('Distancia'), { target: { value: '45' } });
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it('clamps the typed value to the configured minimum', () => {
    const onChange = vi.fn();
    render(
      <PresetNumericInput
        label="Flechas por tanda"
        value={6}
        onChange={onChange}
        presets={[3, 6]}
        min={1}
        max={12}
      />
    );

    fireEvent.change(screen.getByLabelText('Flechas por tanda'), { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('clamps the typed value to the configured maximum', () => {
    const onChange = vi.fn();
    render(
      <PresetNumericInput
        label="Flechas por tanda"
        value={6}
        onChange={onChange}
        presets={[3, 6]}
        min={1}
        max={12}
      />
    );

    fireEvent.change(screen.getByLabelText('Flechas por tanda'), { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('rounds fractional input to the nearest integer', () => {
    const onChange = vi.fn();
    render(
      <PresetNumericInput
        label="Distancia"
        value={70}
        onChange={onChange}
        presets={[18, 70]}
        min={1}
        max={200}
      />
    );

    fireEvent.change(screen.getByLabelText('Distancia'), { target: { value: '70.7' } });
    expect(onChange).toHaveBeenCalledWith(71);
  });

  it('ignores empty input without firing onChange', () => {
    const onChange = vi.fn();
    render(
      <PresetNumericInput
        label="Distancia"
        value={70}
        onChange={onChange}
        presets={[18, 70]}
      />
    );

    fireEvent.change(screen.getByLabelText('Distancia'), { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores non-numeric input', () => {
    const onChange = vi.fn();
    render(
      <PresetNumericInput
        label="Distancia"
        value={70}
        onChange={onChange}
        presets={[18, 70]}
      />
    );

    fireEvent.change(screen.getByLabelText('Distancia'), { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders one chip per preset and marks the active one', () => {
    render(
      <PresetNumericInput
        label="Distancia"
        value={25}
        onChange={vi.fn()}
        presets={[18, 25, 70]}
        unit="m"
      />
    );

    const chip18 = screen.getByRole('button', { name: '18m' });
    const chip25 = screen.getByRole('button', { name: '25m' });
    const chip70 = screen.getByRole('button', { name: '70m' });

    expect(chip25).toHaveAttribute('aria-pressed', 'true');
    expect(chip18).toHaveAttribute('aria-pressed', 'false');
    expect(chip70).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits the preset value when a chip is clicked', () => {
    const onChange = vi.fn();
    render(
      <PresetNumericInput
        label="Distancia"
        value={25}
        onChange={onChange}
        presets={[18, 25, 70]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '70' }));
    expect(onChange).toHaveBeenCalledWith(70);
  });

  it('exposes the presets through a datalist for browser autocompletion', () => {
    const { container } = render(
      <PresetNumericInput
        label="Distancia"
        value={70}
        onChange={vi.fn()}
        presets={[18, 25, 70]}
      />
    );

    const input = screen.getByLabelText('Distancia');
    const listId = input.getAttribute('list');
    expect(listId).toBeTruthy();

    const datalist = container.querySelector(`datalist#${CSS.escape(listId ?? '')}`);
    expect(datalist).not.toBeNull();
    const options = Array.from(datalist?.querySelectorAll('option') ?? []);
    const values = options.map((opt) => opt.getAttribute('value'));
    expect(values).toEqual(['18', '25', '70']);
  });

  it('omits the chip row when no presets are provided', () => {
    render(
      <PresetNumericInput
        label="Distancia"
        value={70}
        onChange={vi.fn()}
        presets={[]}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Distancia')).toBeInTheDocument();
  });
});
