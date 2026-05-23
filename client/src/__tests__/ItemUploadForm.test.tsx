import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import ItemUploadForm from '../components/ItemUploadForm';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('ItemUploadForm', () => {
  it('renders required fields', () => {
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('disables save when name is empty', () => {
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('enables save when name is filled', async () => {
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/name/i), 'Blue Top');
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
  });
});
