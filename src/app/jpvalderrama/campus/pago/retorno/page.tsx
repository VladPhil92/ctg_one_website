import type { Metadata } from 'next';
import { ArrowRight, Clock3, ShieldCheck } from 'lucide-react';
import { JPValderramaFooter, JPValderramaHeader } from '@/components/jpvalderrama/JPValderramaShell';

export const metadata: Metadata = {
  title: 'Verificación de pago | JP Valderrama Education | CTG One',
  description: 'Estado de verificación de una compra educativa realizada desde CTG One.',
  robots: { index: false, follow: false },
};

export default function EducationPaymentReturnPage() {
  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f]">
      <JPValderramaHeader active="campus" />
      <section className="mx-auto max-w-[960px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-8 sm:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#6f0d12]/20 text-[#6f0d12]">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-7 text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Pago enviado · verificación en curso</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight tracking-[-.03em] sm:text-5xl">Estamos confirmando la transacción con el proveedor.</h1>
          <p className="mt-6 max-w-3xl font-serif text-[17px] leading-8 text-[#665950]">Volver desde la pasarela no equivale a una aprobación. CTG One activa el servicio o contenido únicamente después de recibir y validar el evento firmado del proveedor de pagos.</p>

          <div className="mt-8 flex gap-3 border-y border-[#6f0d12]/12 py-6 text-sm leading-7 text-[#564a42]">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#6f0d12]" aria-hidden="true" />
            <p>Consulta <strong>Mi aprendizaje</strong> para ver el estado autoritativo de la orden. Si el proveedor confirmó el pago, el acceso o la contratación aparecerán allí después del settlement.</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/dashboard/educacion" className="inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Ver mi orden <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            <a href="/jpvalderrama/campus" className="inline-flex min-h-12 items-center gap-2 border border-[#6f0d12]/30 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Volver al Campus <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>
        </div>
      </section>
      <JPValderramaFooter />
    </main>
  );
}
