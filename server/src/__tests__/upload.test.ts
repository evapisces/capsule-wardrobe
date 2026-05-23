import request from 'supertest';
import { createApp } from '../app';
import { uploadToR2, getSignedReadUrl } from '../lib/r2';
import path from 'path';
import fs from 'fs';

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue(undefined),
  getSignedReadUrl: jest.fn().mockResolvedValue('https://r2.example.com/signed-url'),
  BUCKET: 'test-bucket',
}));

const app = createApp();

describe('POST /api/upload', () => {
  it('uploads a file and returns key + url', async () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test.jpg');
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));

    const res = await request(app)
      .post('/api/upload')
      .attach('photo', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('key');
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.key).toBe('string');
    expect(uploadToR2).toHaveBeenCalled();
    expect(getSignedReadUrl).toHaveBeenCalledWith(res.body.key);

    fs.rmSync(testImagePath);
  });
});
