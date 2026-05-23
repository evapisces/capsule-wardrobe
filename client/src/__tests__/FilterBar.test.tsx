import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from '../components/FilterBar';

describe('FilterBar', () => {
  it('renders category, color, climate controls', () => {
    render(<FilterBar filters={{}} onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/color/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /climate/i })).toBeInTheDocument();
  });

  it('calls onChange with updated category', async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{}} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'tops');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ category: 'tops' }));
  });

  it('calls onChange with updated color text', async () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{}} onChange={onChange} />);
    // Type a single character — controlled input with static prop fires once per keystroke
    await userEvent.type(screen.getByPlaceholderText(/color/i), 'b');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ color: 'b' }));
  });
});
