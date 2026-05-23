import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CapsuleTray from '../components/CapsuleTray';
import type { Capsule } from '@capsule/shared';

const mockCapsule: Capsule = {
  id: 'cap_1',
  userId: 'user_1',
  name: 'Japan Trip',
  description: null,
  createdAt: new Date().toISOString(),
  items: [
    {
      id: 'item_1', closetId: 'c1', name: 'White Shirt',
      photoUrl: null, category: 'tops', color: null,
      climate: null, size: null, brand: null, notes: null,
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('CapsuleTray', () => {
  it('renders capsule name', () => {
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={() => {}} onAddClick={() => {}} />);
    expect(screen.getByText('Japan Trip')).toBeInTheDocument();
  });

  it('renders items', () => {
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={() => {}} onAddClick={() => {}} />);
    expect(screen.getByTitle('White Shirt')).toBeInTheDocument();
  });

  it('calls onRemoveItem when × is clicked', async () => {
    const onRemove = vi.fn();
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={onRemove} onAddClick={() => {}} />);
    await userEvent.click(screen.getByLabelText('Remove White Shirt'));
    expect(onRemove).toHaveBeenCalledWith('item_1');
  });

  it('calls onAddClick when + is clicked', async () => {
    const onAdd = vi.fn();
    render(<CapsuleTray capsule={mockCapsule} onRemoveItem={() => {}} onAddClick={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: /add item/i }));
    expect(onAdd).toHaveBeenCalled();
  });
});
