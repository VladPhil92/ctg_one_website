export const ADMIN_PAGE_SIZE = 25;
export const SALES_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 1;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('page must be a positive integer');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new Error(`pageSize must be between 1 and ${MAX_PAGE_SIZE}`);
  }
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function pageCount(totalCount: number, pageSize: number): number {
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) throw new Error('totalCount must be a non-negative integer');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new Error(`pageSize must be between 1 and ${MAX_PAGE_SIZE}`);
  }
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function clampPage(page: number, totalCount: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(totalCount, pageSize));
}
