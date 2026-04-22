import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnPicker } from '@/components/chart-area/ColumnPicker';

describe('ColumnPicker', () => {
  it('renders the label and the placeholder option', () => {
    render(<ColumnPicker label="X Axis" value="" columns={['a', 'b']} onChange={() => {}} />);
    expect(screen.getByText('X Axis:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('fires onChange with the selected column', () => {
    const onChange = vi.fn();
    render(<ColumnPicker label="Y" value="" columns={['a', 'b']} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
