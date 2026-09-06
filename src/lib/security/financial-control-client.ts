'use client';

type FinancialControlErrorBody = {
  error?: string;
  code?: string;
  mfaPath?: string;
};

export type FinancialControlResult = {
  error: { message: string } | null;
};

function currentReturnPath() {
  if (typeof window === 'undefined') return '/dashboard';
  return `${window.location.pathname}${window.location.search}`;
}

function redirectForStepUp(body: FinancialControlErrorBody) {
  if (typeof window === 'undefined') return false;
  const returnPath = currentReturnPath();

  if (body.code === 'FINANCIAL_MFA_REQUIRED') {
    const mfaPath = body.mfaPath?.startsWith('/') ? body.mfaPath : '/dashboard/seguridad/mfa';
    window.location.assign(`${mfaPath}?next=${encodeURIComponent(returnPath)}`);
    return true;
  }

  if (body.code === 'FINANCIAL_STEP_UP_REQUIRED') {
    window.location.assign(`/iniciar-sesion?next=${encodeURIComponent(returnPath)}`);
    return true;
  }

  return false;
}

export async function runFinancialControl(
  payload: Record<string, unknown>,
): Promise<FinancialControlResult> {
  try {
    const response = await fetch('/api/investment/admin/financial-control', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as FinancialControlErrorBody | null;
      if (body && redirectForStepUp(body)) {
        return { error: { message: 'Se requiere verificación adicional para continuar.' } };
      }
      return { error: { message: body?.error ?? 'No se pudo completar la operación financiera' } };
    }

    return { error: null };
  } catch {
    return { error: { message: 'No se pudo conectar con el control financiero' } };
  }
}
