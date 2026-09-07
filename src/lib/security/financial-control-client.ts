'use client';

type FinancialControlErrorBody = {
  error?: string;
  code?: string;
  mfaPath?: string;
  enrollmentPath?: string;
  challengePath?: string;
};

export type FinancialControlResult = {
  error: { message: string } | null;
};

function currentReturnPath() {
  if (typeof window === 'undefined') return '/dashboard';
  return `${window.location.pathname}${window.location.search}`;
}

function safeLocalPath(candidate: string | undefined, fallback: string) {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback;
  }
  return candidate;
}

function redirectToMfa(candidatePath: string | undefined, returnPath: string) {
  const mfaPath = safeLocalPath(candidatePath, '/dashboard/seguridad/mfa');
  const separator = mfaPath.includes('?') ? '&' : '?';
  window.location.assign(`${mfaPath}${separator}next=${encodeURIComponent(returnPath)}`);
}

function redirectForStepUp(body: FinancialControlErrorBody) {
  if (typeof window === 'undefined') return false;
  const returnPath = currentReturnPath();

  if (body.code === 'FINANCIAL_MFA_ENROLLMENT_REQUIRED') {
    redirectToMfa(body.enrollmentPath, returnPath);
    return true;
  }

  if (body.code === 'FINANCIAL_MFA_CHALLENGE_REQUIRED') {
    redirectToMfa(body.challengePath, returnPath);
    return true;
  }

  // Backward-compatible handling for the staged Phase 5C response shape.
  if (body.code === 'FINANCIAL_MFA_REQUIRED') {
    redirectToMfa(body.mfaPath, returnPath);
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
