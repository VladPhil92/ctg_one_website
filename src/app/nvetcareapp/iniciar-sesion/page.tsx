import { Suspense } from 'react';
import { SignInForm } from './sign-in-form';

// Sign-in for the Nvet Care dashboard — its own session, separate from
// ctgone.com's Supabase accounts (ADR-002). Deliberately outside
// /nvetcareapp/dashboard/** so middleware can't loop-redirect it.
// Styled per ADR-004: hardcoded brand-kit hex in Tailwind arbitrary
// values, Poppins inherited from the route layout.
export default function NvetIniciarSesionPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
