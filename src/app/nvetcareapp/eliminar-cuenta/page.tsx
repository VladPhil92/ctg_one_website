import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { AccountDeletionPublicForm } from './account-deletion-public-form';

export const metadata: Metadata = {
  title: 'Eliminar cuenta | Nvet Care',
  description: 'Recurso público para solicitar la eliminación de una cuenta de Nvet Care.',
  alternates: { canonical: 'https://ctgone.com/nvetcareapp/eliminar-cuenta' },
};

export default function NvetDeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF8] px-4 py-10 text-[#0D1B2A] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Link href="/nvetcareapp" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#44505B] hover:text-[#237754]">
          <ArrowLeft className="h-4 w-4" /> Volver a Nvet Care
        </Link>
        <header className="my-6 rounded-[2rem] border border-red-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2 text-red-700"><Trash2 className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Privacidad y cuenta</span></div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.035em]">Eliminar una cuenta Nvet Care</h1>
          <p className="mt-3 text-sm leading-6 text-[#5B6670]">
            Este recurso funciona sin tener instalada la app y sin iniciar sesión. Si ya estás autenticado, también puedes revisar primero tus obligaciones abiertas desde Perfil y cuenta.
          </p>
        </header>
        <AccountDeletionPublicForm />
      </div>
    </main>
  );
}
