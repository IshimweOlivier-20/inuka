// File storage. Development uses the local disk; production will switch to S3 (STORAGE_DRIVER=s3).
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

export async function saveFile(userId, file) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  const key = `${userId}/${randomUUID()}.${ext}`;
  await mkdir(join(root, userId), { recursive: true });
  await writeFile(join(root, key), file.buffer);
  return key;
}

export const readStoredFile = (key) => readFile(join(root, key));

export async function deleteFile(key) {
  try { await unlink(join(root, key)); } catch { /* already gone */ }
}

// ---------- Profile photos ----------
// Saved in uploads/photos/ with a random name and served at /api/public/photos/<name>.
// Profile photos are meant to be seen (mentor cards, avatars), unlike vault documents, which stay private.
const PHOTO_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const PHOTO_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const photoDir = join(root, 'photos');

export async function savePhoto(file) {
  const name = `${randomUUID()}.${PHOTO_EXT[file.mimetype]}`;
  await mkdir(photoDir, { recursive: true });
  await writeFile(join(photoDir, name), file.buffer);
  return `/api/public/photos/${name}`;
}

export async function deletePhoto(url) {
  const name = url?.split('/').pop();
  if (name && PHOTO_NAME.test(name)) await deleteFile(join('photos', name));
}
