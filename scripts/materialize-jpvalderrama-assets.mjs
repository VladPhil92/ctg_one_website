import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SOURCE_DIR = path.join(process.cwd(), 'assets', 'jpvalderrama-hd');
const TARGET_DIR = path.join(process.cwd(), 'public', 'jpvalderrama');

const assets = [
  { name: 'brand', parts: 3, bytes: 16670, sha256: '54254de9695e7d6b8f3a81f9bbdc1f233330a9dc1fbb297ee7a3485f52cbe04c' },
  { name: 'conference', parts: 12, bytes: 125920, sha256: '0c0d4fdefc585b3720399f96e7081b0a59352cae49d3604a2c889ab8d5e4a36b' },
  { name: 'ideas', parts: 3, bytes: 29456, sha256: 'e2a713989a1d040b7fd730286d74f72764d64315b30f59ab9cc5c7902f4068f0' },
];

await mkdir(TARGET_DIR, { recursive: true });

for (const asset of assets) {
  const encodedParts = [];
  for (let index = 0; index < asset.parts; index += 1) {
    const partPath = path.join(SOURCE_DIR, `${asset.name}.${String(index).padStart(2, '0')}.b64`);
    encodedParts.push((await readFile(partPath, 'utf8')).replace(/\s+/g, ''));
  }

  const binary = Buffer.from(encodedParts.join(''), 'base64');
  const digest = createHash('sha256').update(binary).digest('hex');

  if (binary.length !== asset.bytes || digest !== asset.sha256) {
    throw new Error(
      `[jpvalderrama-assets] Integrity failure for ${asset.name}: bytes=${binary.length}/${asset.bytes}, sha256=${digest}/${asset.sha256}`,
    );
  }

  const outputPath = path.join(TARGET_DIR, `${asset.name}.webp`);
  await writeFile(outputPath, binary);
  console.log(`[jpvalderrama-assets] restored ${asset.name}.webp (${binary.length} bytes)`);
}
