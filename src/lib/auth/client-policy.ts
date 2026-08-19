import { z } from 'zod';
import type { Locale } from '@/i18n/translations';

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_REQUIREMENTS = [
  { id: 'length', test: (value: string) => value.length >= PASSWORD_MIN_LENGTH },
  { id: 'lowercase', test: (value: string) => /[a-z]/.test(value) },
  { id: 'uppercase', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'number', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/\d/)
  .regex(/[^A-Za-z0-9]/);

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function passwordRequirementCopy(locale: Locale) {
  if (locale === 'es') {
    return {
      title: 'Tu contraseña debe incluir:',
      length: `${PASSWORD_MIN_LENGTH} o más caracteres`,
      lowercase: 'una letra minúscula',
      uppercase: 'una letra mayúscula',
      number: 'un número',
      symbol: 'un símbolo',
    } as const;
  }

  return {
    title: 'Your password must include:',
    length: `${PASSWORD_MIN_LENGTH} or more characters`,
    lowercase: 'one lowercase letter',
    uppercase: 'one uppercase letter',
    number: 'one number',
    symbol: 'one symbol',
  } as const;
}

export function strongPasswordError(value: string, locale: Locale) {
  const copy = passwordRequirementCopy(locale);
  const failing = PASSWORD_REQUIREMENTS.find((requirement) => !requirement.test(value));
  if (!failing) return null;

  const message = copy[failing.id];
  return locale === 'es'
    ? `La contraseña debe incluir ${message}.`
    : `The password must include ${message}.`;
}

type AuthOperation = 'login' | 'signup' | 'recovery' | 'password-update';

type SupabaseLikeError = {
  code?: string;
  name?: string;
  message?: string;
  status?: number;
};

function errorCode(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const candidate = error as SupabaseLikeError;
  return `${candidate.code ?? candidate.name ?? ''}`.toLowerCase();
}

export function authErrorMessage(error: unknown, locale: Locale, operation: AuthOperation) {
  const code = errorCode(error);
  const es = locale === 'es';

  if (code.includes('invalid_credentials')) {
    return es
      ? 'El correo o la contraseña no son correctos.'
      : 'The email or password is incorrect.';
  }
  if (code.includes('email_not_confirmed')) {
    return es
      ? 'Confirma tu correo antes de iniciar sesión.'
      : 'Confirm your email before signing in.';
  }
  if (code.includes('weak_password')) {
    return es
      ? 'La contraseña no cumple la política de seguridad. Usa una contraseña nueva y más robusta.'
      : 'The password does not meet the security policy. Choose a new, stronger password.';
  }
  if (code.includes('same_password')) {
    return es
      ? 'La nueva contraseña debe ser diferente de la actual.'
      : 'Your new password must be different from your current password.';
  }
  if (code.includes('email_address_invalid')) {
    return es ? 'Ingresa un correo electrónico válido.' : 'Enter a valid email address.';
  }
  if (code.includes('signup_disabled')) {
    return es
      ? 'La creación de cuentas está temporalmente deshabilitada.'
      : 'Account creation is temporarily disabled.';
  }
  if (code.includes('captcha_failed')) {
    return es
      ? 'No pudimos validar la protección antiabuso. Actualiza la página e inténtalo de nuevo.'
      : 'We could not validate the anti-abuse check. Refresh the page and try again.';
  }
  if (code.includes('over_email_send_rate_limit') || code.includes('over_request_rate_limit')) {
    return es
      ? 'Se realizaron demasiados intentos. Espera un momento antes de volver a intentarlo.'
      : 'Too many attempts were made. Wait a moment before trying again.';
  }
  if (code.includes('user_already_exists')) {
    return es
      ? 'No pudimos completar el registro con esos datos. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.'
      : 'We could not complete registration with those details. If you already have an account, sign in or recover your password.';
  }

  if (operation === 'login') {
    return es
      ? 'No pudimos iniciar sesión. Revisa tus datos e inténtalo nuevamente.'
      : 'We could not sign you in. Check your details and try again.';
  }
  if (operation === 'signup') {
    return es
      ? 'No pudimos crear la cuenta en este momento. Inténtalo nuevamente más tarde.'
      : 'We could not create the account right now. Try again later.';
  }
  if (operation === 'recovery') {
    return es
      ? 'No pudimos enviar el enlace de recuperación. Inténtalo nuevamente en unos minutos.'
      : 'We could not send the recovery link. Try again in a few minutes.';
  }

  return es
    ? 'No pudimos actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.'
    : 'We could not update the password. Request a new link and try again.';
}
