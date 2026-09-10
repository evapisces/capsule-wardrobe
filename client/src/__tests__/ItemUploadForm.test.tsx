import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import ItemUploadForm from '../components/ItemUploadForm';
import { installMatchMedia } from './helpers/matchMedia';

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

describe('ItemUploadForm — responsive layout (issue #4)', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => {
    cleanup();
    mm?.restore();
  });

  it('collapses both the photo/fields grid and the inner field grid to one column at mobile', () => {
    mm = installMatchMedia(375);
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });

    expect(screen.getByTestId('upload-photo-grid').style.gridTemplateColumns).toBe('1fr');
    expect(screen.getByTestId('upload-field-grid').style.gridTemplateColumns).toBe('1fr');
  });

  it('collapses the photo/fields grid at tablet but keeps the field grid two-up', () => {
    mm = installMatchMedia(800);
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });

    expect(screen.getByTestId('upload-photo-grid').style.gridTemplateColumns).toBe('1fr');
    expect(screen.getByTestId('upload-field-grid').style.gridTemplateColumns).toBe('1fr 1fr');
  });

  it('keeps the two-column photo/fields split at desktop', () => {
    mm = installMatchMedia(1280);
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });

    expect(screen.getByTestId('upload-photo-grid').style.gridTemplateColumns).toBe('300px 1fr');
    expect(screen.getByTestId('upload-field-grid').style.gridTemplateColumns).toBe('1fr 1fr');
  });

  it('gives inputs a >= 16px font and full-width 44px-tall footer buttons at mobile', () => {
    mm = installMatchMedia(375);
    render(<ItemUploadForm closetId="c1" onSuccess={() => {}} onCancel={() => {}} />, { wrapper });

    expect(screen.getByLabelText(/name/i).style.fontSize).toBe('16px');

    const save = screen.getByRole('button', { name: /save item/i });
    const back = screen.getByRole('button', { name: /back/i });
    expect(save.style.width).toBe('100%');
    expect(save.style.minHeight).toBe('44px');
    expect(back.style.width).toBe('100%');
    expect(back.style.minHeight).toBe('44px');
  });
});
