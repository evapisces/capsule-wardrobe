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

interface R2ErrorLike {
  name?: string;
  Code?: string;
  message?: string;
  $metadata?: { httpStatusCode?: number; requestId?: string };
}

/**
 * Logs everything useful for diagnosing an R2 failure (bucket, key,
 * account, R2's own error code/request id) without ever logging
 * credentials, then rethrows a message that says which step failed and
 * why — so a client-facing "Access Denied" doesn't require digging
 * through logs to know whether it was the PUT or the presign, or which
 * bucket/account was actually being hit.
 */
function logAndRewrap(step: 'upload' | 'sign', key: string, err: unknown): never {
  const e = err as R2ErrorLike;
  console.error(`[r2] ${step} failed`, {
    bucket: BUCKET,
    key,
    accountId: process.env.R2_ACCOUNT_ID,
    hasAccessKeyId: !!process.env.R2_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
    errorName: e?.name,
    errorCode: e?.Code,
    httpStatusCode: e?.$metadata?.httpStatusCode,
    requestId: e?.$metadata?.requestId,
    message: e?.message,
  });
  const detail = e?.Code ?? e?.name ?? 'unknown error';
  throw new Error(`R2 ${step} failed (bucket "${BUCKET}"): ${detail} — ${e?.message ?? 'no message'}`);
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  try {
    await r2Client.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
    );
  } catch (err) {
    logAndRewrap('upload', key, err);
  }
}

export async function getSignedReadUrl(key: string): Promise<string> {
  try {
    return await getSignedUrl(
      r2Client,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 3600 }
    );
  } catch (err) {
    logAndRewrap('sign', key, err);
  }
}

/**
 * `ClosetItem.photoUrl` stores the stable R2 object key (e.g.
 * "items/<uuid>.jpg"), not a browsable URL — signed URLs expire (1 hour),
 * so nothing that has to persist across requests can store one directly.
 * Every response that includes a photo must sign a fresh URL at read
 * time. Presigning is pure local HMAC signing (no network round trip to
 * R2), so doing this per-item on every request is cheap.
 */
export async function signPhotoUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key; // already a full URL (legacy/external data)
  return getSignedReadUrl(key);
}

/** Signs `photoUrl` on every item in a list, in parallel. */
export async function signPhotoUrls<T extends { photoUrl: string | null }>(items: T[]): Promise<T[]> {
  return Promise.all(items.map(async (item) => ({ ...item, photoUrl: await signPhotoUrl(item.photoUrl) })));
}
