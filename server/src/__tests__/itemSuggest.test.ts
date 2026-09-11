import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app';
import { loginAs } from './helpers/auth';

const app = createApp();
const USER_ID = 'user_suggest';
let authCookie: string;

const testImagePath = path.join(__dirname, 'fixtures', 'suggest-test.jpg');

beforeAll(async () => {
  authCookie = await loginAs(USER_ID);
  fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
  fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));
});

afterAll(() => {
  fs.rmSync(testImagePath, { force: true });
});

const ORIGINAL_ENV = { ...process.env };

function setVisionEnv(overrides: Partial<Record<string, string>>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

function mockChatCompletion(content: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
  };
}

describe('POST /api/items/suggest', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    setVisionEnv({ VISION_SUGGESTIONS_ENABLED: 'true', VISION_API_KEY: 'test-key' });
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns a validated suggestion on the happy path', async () => {
    fetchSpy.mockResolvedValue(
      mockChatCompletion({
        name: 'Blue Oxford Shirt',
        category: 'tops',
        color: 'blue',
        brand: 'Uniqlo',
        climate: 'temperate',
        confidence: 0.92,
      })
    );

    const res = await request(app)
      .post('/api/items/suggest')
      .set('Cookie', authCookie)
      .attach('photo', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body.suggestionsAvailable).toBe(true);
    expect(res.body.suggestion).toEqual({
      name: 'Blue Oxford Shirt',
      category: 'tops',
      color: 'blue',
      brand: 'Uniqlo',
      climate: 'temperate',
      confidence: 0.92,
    });
  });

  it('drops an invalid category/climate from the model instead of passing it through', async () => {
    fetchSpy.mockResolvedValue(
      mockChatCompletion({
        name: 'Mystery Item',
        category: 'spacesuit', // hallucinated — not a real ItemCategory
        color: 'silver',
        brand: null,
        climate: 'arctic', // hallucinated — not a real Climate
        confidence: 0.9,
      })
    );

    const res = await request(app)
      .post('/api/items/suggest')
      .set('Cookie', authCookie)
      .attach('photo', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body.suggestion.category).toBeNull();
    expect(res.body.suggestion.climate).toBeNull();
    expect(res.body.suggestion.name).toBe('Mystery Item');
  });

  it('falls back gracefully (non-500) when the provider errors', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const res = await request(app)
      .post('/api/items/suggest')
      .set('Cookie', authCookie)
      .attach('photo', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body.suggestionsAvailable).toBe(true);
    expect(res.body.suggestion).toBeNull();
    expect(res.body.reason).toBeTruthy();
  });

  it('falls back gracefully when the suggestion confidence is too low', async () => {
    fetchSpy.mockResolvedValue(
      mockChatCompletion({
        name: 'Blurry Item',
        category: 'tops',
        color: null,
        brand: null,
        climate: null,
        confidence: 0.1,
      })
    );

    const res = await request(app)
      .post('/api/items/suggest')
      .set('Cookie', authCookie)
      .attach('photo', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBeNull();
    expect(res.body.reason).toBeTruthy();
  });

  it('returns 503 with suggestionsAvailable: false when the flag is off', async () => {
    setVisionEnv({ VISION_SUGGESTIONS_ENABLED: 'false', VISION_API_KEY: 'test-key' });

    const res = await request(app)
      .post('/api/items/suggest')
      .set('Cookie', authCookie)
      .attach('photo', testImagePath);

    expect(res.status).toBe(503);
    expect(res.body.suggestionsAvailable).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 503 with suggestionsAvailable: false when the key is missing', async () => {
    setVisionEnv({ VISION_SUGGESTIONS_ENABLED: 'true', VISION_API_KEY: '' });

    const res = await request(app)
      .post('/api/items/suggest')
      .set('Cookie', authCookie)
      .attach('photo', testImagePath);

    expect(res.status).toBe(503);
    expect(res.body.suggestionsAvailable).toBe(false);
  });

  it('returns 401 without a session', async () => {
    const res = await request(app).post('/api/items/suggest').send({ key: 'items/some-key.jpg' });
    expect(res.status).toBe(401);
  });
});
