import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const sourceUrl = required('SOURCE_SUPABASE_URL');
const sourceKey = required('SOURCE_SUPABASE_SECRET_KEY');
const targetUrl = required('TARGET_SUPABASE_URL');
const targetKey = required('TARGET_SUPABASE_SECRET_KEY');
const backupDir = process.env.RECOVERY_STORAGE_BACKUP_DIR ?? '.recovery-work/storage';
const evidencePath = process.env.RECOVERY_STORAGE_EVIDENCE_PATH ?? '.recovery-work/storage-evidence.json';
const maxObjects = Number(process.env.RECOVERY_STORAGE_MAX_OBJECTS ?? '5000');
const maxBytes = Number(process.env.RECOVERY_STORAGE_MAX_BYTES ?? String(512 * 1024 * 1024));

if (!Number.isInteger(maxObjects) || maxObjects < 1 || maxObjects > 100000) {
  throw new Error('RECOVERY_STORAGE_MAX_OBJECTS must be an integer between 1 and 100000.');
}
if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 10 * 1024 * 1024 * 1024) {
  throw new Error('RECOVERY_STORAGE_MAX_BYTES must be between 1 byte and 10 GiB.');
}

const targetParsed = new URL(targetUrl);
if (!['127.0.0.1', 'localhost', '::1'].includes(targetParsed.hostname)) {
  throw new Error('Recovery Storage target must be loopback/local. Hosted targets are refused by design.');
}
if (new URL(sourceUrl).origin === targetParsed.origin) {
  throw new Error('Source and recovery target must be different environments.');
}

const source = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const target = createClient(targetUrl, targetKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const safeBlobName = (bucket, objectPath) =>
  createHash('sha256').update(`${bucket}\0${objectPath}`).digest('hex');

async function listObjectsRecursively(client, bucketId, prefix = '', visited = new Set()) {
  if (visited.has(prefix)) throw new Error(`Storage listing cycle detected in bucket ${bucketId}.`);
  visited.add(prefix);

  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(bucketId).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Unable to list Storage bucket ${bucketId}: ${error.message}`);
    const page = data ?? [];
    for (const item of page) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = item.id == null && item.metadata == null;
      if (isFolder) {
        rows.push(...(await listObjectsRecursively(client, bucketId, objectPath, visited)));
      } else {
        rows.push({ path: objectPath, metadata: item.metadata ?? {} });
      }
    }
    if (page.length < 1000) break;
  }
  visited.delete(prefix);
  return rows;
}

async function clearLocalBucket(bucketId) {
  const objects = await listObjectsRecursively(target, bucketId);
  const names = objects.map((row) => row.path);
  for (let index = 0; index < names.length; index += 100) {
    const { error } = await target.storage.from(bucketId).remove(names.slice(index, index + 100));
    if (error) throw new Error(`Unable to clear local recovery bucket ${bucketId}: ${error.message}`);
  }
}

await rm(backupDir, { recursive: true, force: true });
await mkdir(path.join(backupDir, 'objects'), { recursive: true, mode: 0o700 });

const { data: sourceBuckets, error: sourceBucketsError } = await source.storage.listBuckets();
if (sourceBucketsError) throw new Error(`Unable to list source Storage buckets: ${sourceBucketsError.message}`);

const manifest = { version: 1, createdAt: new Date().toISOString(), buckets: [], objects: [] };
let objectCount = 0;
let totalBytes = 0;

for (const bucket of sourceBuckets ?? []) {
  manifest.buckets.push({
    id: bucket.id,
    name: bucket.name,
    public: Boolean(bucket.public),
    fileSizeLimit: bucket.file_size_limit ?? null,
    allowedMimeTypes: bucket.allowed_mime_types ?? null,
  });

  const objects = await listObjectsRecursively(source, bucket.id);
  for (const object of objects) {
    objectCount += 1;
    if (objectCount > maxObjects) {
      throw new Error(`Storage recovery perimeter exceeds RECOVERY_STORAGE_MAX_OBJECTS (${maxObjects}).`);
    }

    const { data: blob, error: downloadError } = await source.storage.from(bucket.id).download(object.path);
    if (downloadError || !blob) {
      throw new Error(`Unable to download a source Storage object from bucket ${bucket.id}: ${downloadError?.message ?? 'empty response'}`);
    }
    const bytes = Buffer.from(await blob.arrayBuffer());
    totalBytes += bytes.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error(`Storage recovery perimeter exceeds RECOVERY_STORAGE_MAX_BYTES (${maxBytes}).`);
    }

    const fileName = safeBlobName(bucket.id, object.path);
    await writeFile(path.join(backupDir, 'objects', fileName), bytes, { mode: 0o600 });
    manifest.objects.push({
      bucketId: bucket.id,
      objectPath: object.path,
      fileName,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      contentType: object.metadata?.mimetype ?? 'application/octet-stream',
    });
  }
}

await writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600 });

const { data: targetBuckets, error: targetBucketsError } = await target.storage.listBuckets();
if (targetBucketsError) throw new Error(`Unable to list recovery-target Storage buckets: ${targetBucketsError.message}`);

const sourceBucketIds = new Set(manifest.buckets.map((bucket) => bucket.id));
const targetBucketIds = new Set((targetBuckets ?? []).map((bucket) => bucket.id));

// Schema replay can materialize local bootstrap buckets. Production is the
// authority for current bucket configuration, so target-only buckets must not
// silently survive the recovery. Supabase intentionally protects direct DML on
// storage schema tables; remove only empty target-only buckets through the
// loopback Storage API.
for (const bucket of targetBuckets ?? []) {
  if (sourceBucketIds.has(bucket.id)) continue;
  const unexpectedObjects = await listObjectsRecursively(target, bucket.id);
  if (unexpectedObjects.length !== 0) {
    throw new Error(`Refusing to remove non-production local bucket ${bucket.id} because it contains objects.`);
  }
  const { error } = await target.storage.deleteBucket(bucket.id);
  if (error) throw new Error(`Unable to remove target-only local recovery bucket ${bucket.id}: ${error.message}`);
  targetBucketIds.delete(bucket.id);
}

for (const bucket of manifest.buckets) {
  const options = {
    public: bucket.public,
    ...(bucket.fileSizeLimit != null ? { fileSizeLimit: bucket.fileSizeLimit } : {}),
    ...(Array.isArray(bucket.allowedMimeTypes) && bucket.allowedMimeTypes.length
      ? { allowedMimeTypes: bucket.allowedMimeTypes }
      : {}),
  };

  if (targetBucketIds.has(bucket.id)) {
    await clearLocalBucket(bucket.id);
    const { error } = await target.storage.updateBucket(bucket.id, options);
    if (error) throw new Error(`Unable to align local recovery bucket ${bucket.id}: ${error.message}`);
  } else {
    const { error } = await target.storage.createBucket(bucket.id, options);
    if (error) throw new Error(`Unable to create local recovery bucket ${bucket.id}: ${error.message}`);
    targetBucketIds.add(bucket.id);
  }
}

const { data: alignedBuckets, error: alignedBucketsError } = await target.storage.listBuckets();
if (alignedBucketsError) throw new Error(`Unable to verify recovery-target Storage buckets: ${alignedBucketsError.message}`);
const alignedBucketIds = [...(alignedBuckets ?? []).map((bucket) => bucket.id)].sort();
const expectedBucketIds = [...sourceBucketIds].sort();
if (JSON.stringify(alignedBucketIds) !== JSON.stringify(expectedBucketIds)) {
  throw new Error('Recovery-target Storage bucket set does not match the production source bucket set.');
}

for (const object of manifest.objects) {
  const bytes = await readFile(path.join(backupDir, 'objects', object.fileName));
  const { error } = await target.storage.from(object.bucketId).upload(object.objectPath, bytes, {
    upsert: true,
    contentType: object.contentType,
  });
  if (error) throw new Error(`Unable to restore an object into local bucket ${object.bucketId}: ${error.message}`);
}

const perBucket = [];
for (const bucket of manifest.buckets) {
  const sourceObjects = manifest.objects.filter((object) => object.bucketId === bucket.id);
  const targetObjects = await listObjectsRecursively(target, bucket.id);
  if (targetObjects.length !== sourceObjects.length) {
    throw new Error(`Restored object count mismatch in local bucket ${bucket.id}.`);
  }

  let verifiedBytes = 0;
  for (const object of sourceObjects) {
    const { data: restoredBlob, error } = await target.storage.from(bucket.id).download(object.objectPath);
    if (error || !restoredBlob) throw new Error(`Unable to verify restored object in bucket ${bucket.id}.`);
    const restoredBytes = Buffer.from(await restoredBlob.arrayBuffer());
    if (sha256(restoredBytes) !== object.sha256) {
      throw new Error(`Restored object checksum mismatch in bucket ${bucket.id}.`);
    }
    verifiedBytes += restoredBytes.byteLength;
  }
  perBucket.push({ bucket: bucket.id, objectCount: sourceObjects.length, bytes: verifiedBytes, public: bucket.public });
}

const aggregateDigest = createHash('sha256')
  .update(
    manifest.objects
      .map((object) => `${object.bucketId}\0${object.objectPath}\0${object.sha256}\0${object.bytes}`)
      .sort()
      .join('\n'),
  )
  .digest('hex');

const evidence = {
  result: 'PASS',
  verifiedAt: new Date().toISOString(),
  sourceBucketCount: manifest.buckets.length,
  sourceObjectCount: manifest.objects.length,
  sourceBytes: totalBytes,
  aggregateDigest,
  buckets: perBucket,
  target: 'ephemeral-loopback-supabase',
};
await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
console.log(`Storage recovery drill PASS: ${evidence.sourceBucketCount} bucket(s), ${evidence.sourceObjectCount} object(s), ${evidence.sourceBytes} byte(s).`);
