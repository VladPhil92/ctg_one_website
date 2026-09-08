import { readFileSync } from 'node:fs';

const partPaths = [1, 2, 3, 4, 5].map(
  (index) => `src/data/dashboardHeroImageParts/part${String(index).padStart(2, '0')}.ts`,
);

const base64 = partPaths
  .map((path) => {
    const source = readFileSync(path, 'utf8');
    const match = source.match(/= '([^']+)';/s);
    if (!match) throw new Error(`Unable to read dashboard hero payload from ${path}`);
    return match[1];
  })
  .join('');

const image = Buffer.from(base64, 'base64');
const ascii = (start, end) => image.subarray(start, end).toString('ascii');

if (ascii(0, 4) !== 'RIFF' || ascii(8, 12) !== 'WEBP') {
  throw new Error('Dashboard hero payload is not a valid WebP RIFF container');
}

if (ascii(12, 16) !== 'VP8 ') {
  throw new Error(`Unexpected WebP chunk type: ${ascii(12, 16)}`);
}

if (!image.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
  throw new Error('Dashboard hero VP8 frame header is invalid');
}

const width = image.readUInt16LE(26) & 0x3fff;
const height = image.readUInt16LE(28) & 0x3fff;

if (width !== 1920 || height !== 1080) {
  throw new Error(`Dashboard hero must be Full HD 1920x1080, received ${width}x${height}`);
}

if (image.byteLength < 50_000) {
  throw new Error(`Dashboard hero payload is unexpectedly small (${image.byteLength} bytes)`);
}

console.log(`Dashboard hero invariant PASS: ${width}x${height}, ${image.byteLength} bytes`);
