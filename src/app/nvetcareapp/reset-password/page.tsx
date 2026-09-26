import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NvetResetPasswordForm } from '@/components/nvet/NvetResetPasswordForm';

export const metadata: Metadata = {
  title: 'Restablecer contraseña | Nvet Care',
  robots: { index: false, follow: false },
};

export default function NvetResetPasswordPage() {
  return <Suspense fallback={null}><NvetResetPasswordForm /></Suspense>;
}
