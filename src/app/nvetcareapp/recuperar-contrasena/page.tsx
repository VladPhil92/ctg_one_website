import type { Metadata } from 'next';
import { PasswordRecoveryForm } from './password-recovery-form';

export const metadata: Metadata = {
  title: 'Recuperar contraseña | Nvet Care',
  description: 'Recuperación de acceso para cuentas locales de Nvet Care.',
  robots: { index: false, follow: false },
};

export default function NvetPasswordRecoveryPage() {
  return <PasswordRecoveryForm />;
}
