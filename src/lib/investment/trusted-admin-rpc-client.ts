'use client';

type TrustedAdminOperation =
  | 'production.createLotFromStyle'
  | 'production.updateStyleEconomics'
  | 'inventory.reconcile'
  | 'finance.providerHealth'
  | 'sales.reconcileReturn';

export type TrustedAdminRpcResult<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
};

export async function callTrustedAdminRpc<T = unknown>(
  operation: TrustedAdminOperation,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<TrustedAdminRpcResult<T>> {
  try {
    const response = await fetch('/api/investment/admin/trusted-rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, payload }),
      signal,
    });

    const body = (await response.json()) as { data?: T; error?: string };
    if (!response.ok) {
      return { data: null, error: { message: body.error ?? `Trusted admin request failed (${response.status})` } };
    }

    return { data: (body.data ?? null) as T | null, error: null };
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === 'AbortError') throw caught;
    return {
      data: null,
      error: { message: caught instanceof Error ? caught.message : 'Trusted admin request failed' },
    };
  }
}
