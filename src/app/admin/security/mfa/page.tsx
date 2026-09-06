import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FinanceMfaPanel } from './FinanceMfaPanel';

export default async function FinanceMfaSecurityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/iniciar-sesion');

  const { data: investmentProfile } = await supabase
    .from('investment_participant_profiles')
    .select('investment_role')
    .eq('user_id', user.id)
    .maybeSingle();

  const investmentRole = investmentProfile?.investment_role ?? null;
  if (investmentRole !== 'SUPER_ADMIN' && investmentRole !== 'FINANCE_ADMIN') {
    redirect('/admin');
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-3xl border border-white/[.08] bg-white/[.025] p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[.24em] text-accent">Finance OS · Security</p>
        <h1 className="mt-3 font-outfit text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Autenticación multifactor
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-text-dim">
          Protege las operaciones financieras privilegiadas con un factor TOTP. El QR y el secreto de
          enrolamiento permanecen entre este navegador y Supabase Auth; CTG One no los registra en sus
          endpoints, logs ni journal financiero.
        </p>
      </div>

      <FinanceMfaPanel />
    </section>
  );
}
