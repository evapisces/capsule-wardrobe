import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME ?? 'capsule-wardrobe-photos';

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function getSignedReadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
}
