import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import BulkItemUpload from '../components/BulkItemUpload';
import * as api from '../lib/api';

vi.mock('../lib/api');

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function makeFile(name: string): File {
  return new File(['fake-bytes'], name, { type: 'image/jpeg' });
}

function renderBulk(onDone = vi.fn(), onBack = vi.fn()) {
  return render(<BulkItemUpload closetId="closet_1" onDone={onDone} onBack={onBack} />, { wrapper });
}

async function selectFiles(files: File[]) {
  const input = screen.getByTestId('bulk-file-input');
  await userEvent.upload(input, files);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.uploadPhoto).mockResolvedValue({ key: 'items/key.jpg', url: 'https://example.com/key.jpg' });
  vi.mocked(api.createClosetItem).mockResolvedValue({
    id: 'item_new',
    closetId: 'closet_1',
    name: 'New Item',
    photoUrl: null,
    category: 'tops',
    color: null,
    climate: null,
    size: null,
    brand: null,
    notes: null,
    pricePaid: null,
    createdAt: new Date().toISOString(),
  });
});

describe('BulkItemUpload', () => {
  it('creates one queue card per selected file', async () => {
    vi.mocked(api.suggestItemMetadata).mockResolvedValue({ suggestionsAvailable: true, suggestion: null, reason: 'x' });

    renderBulk();
    await selectFiles([makeFile('a.jpg'), makeFile('b.jpg'), makeFile('c.jpg')]);

    expect(screen.getByTestId('bulk-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-card-2')).toBeInTheDocument();
  });

  it('pre-fills fields from returned suggestions', async () => {
    vi.mocked(api.suggestItemMetadata).mockResolvedValue({
      suggestionsAvailable: true,
      suggestion: {
        name: 'Blue Oxford Shirt',
        category: 'tops',
        color: 'blue',
        brand: 'Uniqlo',
        climate: 'temperate',
        confidence: 0.9,
      },
    });

    renderBulk();
    await selectFiles([makeFile('a.jpg')]);

    const card = screen.getByTestId('bulk-card-0');
    await waitFor(() => {
      expect(within(card).getByLabelText('Name 0')).toHaveValue('Blue Oxford Shirt');
    });
    expect(within(card).getByLabelText('Brand 0')).toHaveValue('Uniqlo');
    expect(within(card).getByLabelText('Category 0')).toHaveValue('tops');
    expect(within(card).getByLabelText('Colour 0')).toHaveValue('blue');
    expect(within(card).getByLabelText('Climate band 0')).toHaveValue('temperate');
  });

  it('lets edits override suggestions in the created payload', async () => {
    vi.mocked(api.suggestItemMetadata).mockResolvedValue({
      suggestionsAvailable: true,
      suggestion: {
        name: 'Blue Oxford Shirt',
        category: 'tops',
        color: 'blue',
        brand: 'Uniqlo',
        climate: 'temperate',
        confidence: 0.9,
      },
    });

    renderBulk();
    await selectFiles([makeFile('a.jpg')]);

    const card = screen.getByTestId('bulk-card-0');
    await waitFor(() => expect(within(card).getByLabelText('Name 0')).toHaveValue('Blue Oxford Shirt'));

    const nameInput = within(card).getByLabelText('Name 0');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Corrected Name');

    await userEvent.click(within(card).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(api.createClosetItem).toHaveBeenCalled());
    expect(api.createClosetItem).toHaveBeenCalledWith(
      'closet_1',
      expect.objectContaining({ name: 'Corrected Name', brand: 'Uniqlo', category: 'tops' })
    );
  });

  it('shows an editable blank card with a fallback note when the suggestion fails / is low-confidence', async () => {
    vi.mocked(api.suggestItemMetadata).mockResolvedValue({
      suggestionsAvailable: true,
      suggestion: null,
      reason: 'Low-confidence suggestion',
    });

    renderBulk();
    await selectFiles([makeFile('a.jpg')]);

    const card = screen.getByTestId('bulk-card-0');
    await waitFor(() => expect(within(card).getByRole('note')).toHaveTextContent(/couldn.t suggest/i));
    expect(within(card).getByLabelText('Name 0')).toHaveValue('');
  });

  it('does not call createClosetItem until a card is explicitly confirmed', async () => {
    vi.mocked(api.suggestItemMetadata).mockResolvedValue({
      suggestionsAvailable: true,
      suggestion: {
        name: 'Blue Oxford Shirt',
        category: 'tops',
        color: 'blue',
        brand: 'Uniqlo',
        climate: 'temperate',
        confidence: 0.9,
      },
    });

    renderBulk();
    await selectFiles([makeFile('a.jpg')]);

    const card = screen.getByTestId('bulk-card-0');
    await waitFor(() => expect(within(card).getByLabelText('Name 0')).toHaveValue('Blue Oxford Shirt'));

    expect(api.createClosetItem).not.toHaveBeenCalled();
  });

  it('discards a card without ever creating an item', async () => {
    vi.mocked(api.suggestItemMetadata).mockResolvedValue({ suggestionsAvailable: true, suggestion: null, reason: 'x' });

    renderBulk();
    await selectFiles([makeFile('a.jpg')]);

    const card = screen.getByTestId('bulk-card-0');
    await userEvent.click(within(card).getByRole('button', { name: /discard/i }));

    expect(screen.queryByTestId('bulk-card-0')).not.toBeInTheDocument();
    expect(api.createClosetItem).not.toHaveBeenCalled();
  });

  it('keeps a failed card in the queue on partial failure', async () => {
    vi.mocked(api.suggestItemMetadata).mockResolvedValue({
      suggestionsAvailable: true,
      suggestion: {
        name: 'Item One',
        category: 'tops',
        color: null,
        brand: null,
        climate: null,
        confidence: 0.9,
      },
    });
    vi.mocked(api.createClosetItem).mockRejectedValueOnce(new Error('server exploded'));

    renderBulk();
    await selectFiles([makeFile('a.jpg')]);

    const card = screen.getByTestId('bulk-card-0');
    await waitFor(() => expect(within(card).getByLabelText('Name 0')).toHaveValue('Item One'));

    await userEvent.click(within(card).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(within(card).getByText(/server exploded/i)).toBeInTheDocument());
    // Card stays in the queue, still editable, ready to retry.
    expect(screen.getByTestId('bulk-card-0')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
