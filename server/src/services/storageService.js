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
