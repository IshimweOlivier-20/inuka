// File storage for student documents, profile photos and images in lessons/articles.
//   STORAGE_DRIVER=local (default) — files in backend/uploads/ (development, or one small server)
//   STORAGE_DRIVER=s3             — Amazon S3, or any S3-compatible service with S3_ENDPOINT (Supabase Storage, R2). Uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
//                                   AWS_REGION and AWS_S3_BUCKET. The bucket stays PRIVATE: the backend reads the
//                                   files and sends them (documents only to their owner, photos/images to everyone).
// Keys are the same for both: "<userId>/<uuid>.<ext>" for documents, "photos/<uuid>.<ext>", "media/<uuid>.<ext>".
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/errorHandler.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');
const useS3 = () => (process.env.STORAGE_DRIVER || 'local').toLowerCase() === 's3';
const TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
export const contentTypeOf = (key) => TYPES[key.split('.').pop().toLowerCase()] || 'application/octet-stream';

// ---------- S3 ----------
let s3 = null;
async function s3Client() {
  if (!s3) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1', ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }) });
  }
  return s3;
}
const bucket = () => {
  if (!process.env.AWS_S3_BUCKET) throw new Error('AWS_S3_BUCKET is not set in backend/.env');
  return process.env.AWS_S3_BUCKET;
};

// A storage failure becomes a clear message for the person, and the real reason goes to the server log (Render → Logs).
function storageError(e, action) {
  const code = e.$metadata?.httpStatusCode;
  const name = e.Code || e.name || 'Error';
  console.error(`File storage ${action} failed: ${name} (${code || 'no response'}) ${e.message || ''}`.trim());
  let hint = 'Check the S3 settings (S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET).';
  if (/NoSuchBucket/i.test(name)) hint = `The bucket "${process.env.AWS_S3_BUCKET}" does not exist. Check AWS_S3_BUCKET.`;
  else if (/InvalidAccessKeyId|SignatureDoesNotMatch|AccessDenied|Forbidden/i.test(name) || code === 403 || code === 401) hint = 'The storage keys were refused. Create new S3 access keys and update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.';
  else if (!code || code >= 500 || /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(`${name} ${e.message}`)) hint = 'The storage service did not answer. If you use Supabase, the free project may be paused: open supabase.com and press "Restore project".';
  console.error(`File storage hint: ${hint}`);
  return new HttpError(503, 'Files cannot be saved or opened right now. Please try again later. (The INUKA team has been told in the server log.)');
}

// ---------- Low-level: put / get / delete ----------
async function put(key, buffer, contentType) {
  if (useS3()) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    try {
      await (await s3Client()).send(new PutObjectCommand({
        Bucket: bucket(), Key: key, Body: buffer, ContentType: contentType || contentTypeOf(key),
        // AWS S3: encrypt at rest. S3-compatible services (Supabase Storage, Cloudflare R2) encrypt by default and may refuse this header.
        ...(!process.env.S3_ENDPOINT && { ServerSideEncryption: 'AES256' }),
      }));
    } catch (e) { throw storageError(e, 'upload'); }
    return;
  }
  await mkdir(dirname(join(root, key)), { recursive: true });
  await writeFile(join(root, key), buffer);
}

async function get(key) {
  if (useS3()) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    try {
      const out = await (await s3Client()).send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
      return Buffer.from(await out.Body.transformToByteArray());
    } catch (e) {
      if (e.name === 'NoSuchKey' || (e.$metadata?.httpStatusCode === 404 && !/NoSuchBucket/i.test(e.Code || e.name))) return null;
      throw storageError(e, 'read');
    }
  }
  try { return await readFile(join(root, key)); } catch { return null; }
}

async function del(key) {
  try {
    if (useS3()) {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await (await s3Client()).send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    } else await unlink(join(root, key));
  } catch { /* already gone */ }
}

// ---------- Student documents (private) ----------
export async function saveFile(userId, file) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  const key = `${userId}/${randomUUID()}.${ext}`;
  await put(key, file.buffer, file.mimetype);
  return key;
}
export async function readStoredFile(key) {
  const buf = await get(key);
  if (!buf) throw new HttpError(404, 'This file could not be found. Please upload it again.');
  return buf;
}
export const deleteFile = (key) => del(key);

// ---------- Profile photos (public) ----------
// Served at /api/public/photos/<name>. Profile photos are meant to be seen (mentor cards, avatars).
const PHOTO_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const PHOTO_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function savePhoto(file) {
  const name = `${randomUUID()}.${PHOTO_EXT[file.mimetype]}`;
  await put(`photos/${name}`, file.buffer, file.mimetype);
  return `/api/public/photos/${name}`;
}
export async function deletePhoto(url) {
  const name = url?.split('/').pop();
  if (name && PHOTO_NAME.test(name)) await del(`photos/${name}`);
}

// ---------- Images inside lessons and articles (uploaded by admins from the text editor) ----------
const MEDIA_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
export const MEDIA_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

export async function saveMedia(file) {
  const name = `${randomUUID()}.${MEDIA_EXT[file.mimetype]}`;
  await put(`media/${name}`, file.buffer, file.mimetype);
  return `/api/public/media/${name}`;
}

// ---------- Course files (lesson audio, worksheets, question images), uploaded by admins ----------
export const COURSE_FILE_NAME = /^[0-9a-f-]{36}\.(mp3|m4a|aac|ogg|wav|webm|pdf|docx|pptx|xlsx|jpg|png|webp|gif)$/;
export async function saveCourseFile(file, ext) {
  const name = `${randomUUID()}.${ext}`;
  await put(`files/${name}`, file.buffer, file.mimetype);
  return `/api/public/files/${name}`;
}
export async function deleteCourseFile(url) {
  const name = url?.split('/').pop();
  if (name && COURSE_FILE_NAME.test(name)) await del(`files/${name}`);
}

// Reads a public image ("photos" or "media" folder) for /api/public/photos|media/<name>. null if missing.
export const readPublicImage = (folder, name) => get(`${folder}/${name}`);

// ---------- Files in student–mentor messages (private: only the two people in the conversation) ----------
export async function saveChatFile(conversationId, file, ext) {
  const key = `chat/${conversationId}/${randomUUID()}.${ext}`;
  await put(key, file.buffer, file.mimetype);
  return key;
}

// Startup check (index.js): says in the log whether file storage works, so a paused or misconfigured store is noticed early.
export async function checkStorage() {
  if (!useS3()) return { ok: true, driver: 'local' };
  try {
    const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
    await (await s3Client()).send(new HeadBucketCommand({ Bucket: bucket() }));
    return { ok: true, driver: 's3' };
  } catch (e) {
    storageError(e, 'check');
    return { ok: false, driver: 's3' };
  }
}
