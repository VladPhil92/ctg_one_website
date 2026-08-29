import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const IDENTIFIER = String.raw`(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)`;
const COPY_HEADER = new RegExp(
  String.raw`^\s*COPY\s+(${IDENTIFIER})(?:\.(${IDENTIFIER}))?\s*(?:\([^)]*\))?\s+FROM\s+stdin;\s*$`,
  'i',
);
const COPY_TERMINATOR = /^\s*\\\.\s*$/;
const STORAGE_QUALIFIED_REFERENCE = /(?:"storage"|\bstorage)\s*\./i;
const STORAGE_SEARCH_PATH = /\bsearch_path\b[^;]*\bstorage\b/i;
const COMMENT_OR_BLANK = /^\s*(?:--.*)?$/;

function normalizeIdentifier(identifier) {
  if (!identifier) return null;
  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier.slice(1, -1).replaceAll('""', '"');
  }
  return identifier;
}

function copyTarget(match) {
  if (!match[2]) return { schema: null, table: normalizeIdentifier(match[1]) };
  return {
    schema: normalizeIdentifier(match[1]),
    table: normalizeIdentifier(match[2]),
  };
}

export function sanitizeRecoveryDataDump(source) {
  const usesCrLf = source.includes('\r\n');
  const newline = usesCrLf ? '\r\n' : '\n';
  const hadTrailingNewline = source.endsWith('\n');
  const lines = source.split(/\r?\n/);
  if (hadTrailingNewline) lines.pop();

  const output = [];
  let removedStorageCopyBlocks = 0;
  let removedStorageStatements = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const copyMatch = COPY_HEADER.exec(line);

    if (copyMatch) {
      const { schema } = copyTarget(copyMatch);
      const isStorageCopy = schema?.toLowerCase() === 'storage';
      if (!isStorageCopy) output.push(line);

      let terminated = false;
      for (index += 1; index < lines.length; index += 1) {
        const copyLine = lines[index];
        if (COPY_TERMINATOR.test(copyLine)) {
          terminated = true;
          if (!isStorageCopy) output.push(copyLine);
          break;
        }
        if (!isStorageCopy) output.push(copyLine);
      }

      if (!terminated) {
        throw new Error(`Recovery data dump contains an unterminated COPY block near line ${index + 1}.`);
      }
      if (isStorageCopy) removedStorageCopyBlocks += 1;
      continue;
    }

    if (COMMENT_OR_BLANK.test(line)) {
      output.push(line);
      continue;
    }

    if (STORAGE_QUALIFIED_REFERENCE.test(line) || STORAGE_SEARCH_PATH.test(line)) {
      // The data dump is allowed to restore Auth and application data, but managed
      // Storage metadata is recovered separately through the Storage API. Plain
      // pg_dump data output can also contain sequence/setval statements, so remove
      // any remaining Storage-scoped statement rather than replaying provider-owned
      // metadata into a potentially different local Storage schema version.
      if (/^\s*(?:SELECT|SET)\b/i.test(line)) {
        removedStorageStatements += 1;
        continue;
      }
      throw new Error(
        `Recovery data dump contains unsupported managed Storage SQL outside a COPY block at line ${index + 1}.`,
      );
    }

    output.push(line);
  }

  const sanitized = output.join(newline) + (hadTrailingNewline ? newline : '');

  // Defensive second pass over SQL statement lines only. Non-Storage COPY payloads
  // are deliberately not inspected because user data may legitimately contain the
  // text "storage." and must never be treated as SQL.
  const verifyLines = sanitized.split(/\r?\n/);
  for (let index = 0; index < verifyLines.length; index += 1) {
    const line = verifyLines[index];
    const copyMatch = COPY_HEADER.exec(line);
    if (copyMatch) {
      const { schema } = copyTarget(copyMatch);
      if (schema?.toLowerCase() === 'storage') {
        throw new Error('Managed Storage COPY block remained after recovery dump sanitization.');
      }
      for (index += 1; index < verifyLines.length && !COPY_TERMINATOR.test(verifyLines[index]); index += 1) {
        // Skip COPY payload while verifying SQL-only boundaries.
      }
      continue;
    }
    if (COMMENT_OR_BLANK.test(line)) continue;
    if (STORAGE_QUALIFIED_REFERENCE.test(line) || STORAGE_SEARCH_PATH.test(line)) {
      throw new Error('Managed Storage SQL remained after recovery dump sanitization.');
    }
  }

  return {
    text: sanitized,
    removedStorageCopyBlocks,
    removedStorageStatements,
  };
}

export async function sanitizeRecoveryDataDumpFile(filePath) {
  const absolutePath = resolve(filePath);
  const source = await readFile(absolutePath, 'utf8');
  const result = sanitizeRecoveryDataDump(source);
  const temporaryPath = join(dirname(absolutePath), `.sanitize-${process.pid}-${Date.now()}.sql`);

  try {
    await writeFile(temporaryPath, result.text, { encoding: 'utf8', mode: 0o600 });
    await rename(temporaryPath, absolutePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return result;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && pathToFileURL(invokedPath).href === import.meta.url) {
  const filePath = process.argv[2] ?? process.env.RECOVERY_DATABASE_DATA_DUMP;
  if (!filePath) {
    throw new Error('Pass the recovery data dump path as argv[2] or RECOVERY_DATABASE_DATA_DUMP.');
  }

  const result = await sanitizeRecoveryDataDumpFile(filePath);
  console.log(
    `Recovery data dump sanitizer: removed ${result.removedStorageCopyBlocks} managed Storage COPY block(s) and ${result.removedStorageStatements} Storage statement(s).`,
  );
}
