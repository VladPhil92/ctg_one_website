import Image from 'next/image';
import { ArrowRight, CalendarDays, Clock3, MapPin, Ticket } from 'lucide-react';
import { JPValderramaFooter, JPValderramaHeader } from '@/components/jpvalderrama/JPValderramaShell';
import { TalkRegistrationForm } from '@/components/jpvalderrama/TalkRegistrationForm';

const eventDetails = [
  { label: 'Fecha', value: '17 de septiembre', icon: CalendarDays },
  { label: 'Hora', value: '7:00 p. m.', icon: Clock3 },
  { label: 'Duración', value: '45 minutos', icon: Clock3 },
  { label: 'Modalidad', value: 'Google Meet', icon: MapPin },
  { label: 'Ticket', value: '$10.000', icon: Ticket },
] as const;

export default function ValderramaTalksPage() {
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: '¿Filosofía o Dinero? — El arte de comer papel',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'VirtualLocation', name: 'Google Meet' },
    organizer: { '@type': 'Person', name: 'Juan Pablo Valderrama Pino', url: 'https://ctgone.com/jpvalderrama' },
    offers: { '@type': 'Offer', price: '10000', priceCurrency: 'COP', url: 'https://ctgone.com/jpvalderrama/talks#inscripcion' },
  };

  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f] selection:bg-[#6f0d12] selection:text-[#fffaf2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }} />
      <a href="#contenido" className="sr-only z-[100] rounded bg-[#6f0d12] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <JPValderramaHeader active="talks" />

      <div id="contenido">
        <section className="border-b border-[#6f0d12]/10">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12 lg:py-24">
            <div className="overflow-hidden border border-[#6f0d12]/14 bg-[#fbf7f1] p-3 shadow-[0_24px_70px_rgba(72,35,24,.06)]">
              <Image src="/api/jpvalderrama/assets/waveform" alt="Lenguaje visual Valderrama Talks" width={1536} height={512} priority unoptimized className="h-auto w-full" sizes="(max-width: 1024px) 92vw, 610px" />
            </div>
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Valderrama Talks · Voz · Formación · Conversación</p>
              <h1 className="mt-4 font-serif text-5xl leading-[.98] tracking-[-.035em] text-[#17110e] sm:text-6xl lg:text-[4.7rem]">Ideas complejas, conversaciones que pueden transformar.</h1>
              <div className="mt-6 flex items-center gap-3" aria-hidden="true"><span className="h-px w-24 bg-[#6f0d12]" /><span className="h-2 w-2 rounded-full bg-[#6f0d12]" /></div>
              <p className="mt-7 max-w-2xl font-serif text-lg leading-8 text-[#564a42] sm:text-xl">Conferencias, clases y conversaciones de JP Valderrama para conectar filosofía, educación, cultura, tecnología y experiencia práctica con públicos diversos.</p>
              <a href="#conferencia" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Ver próxima conferencia <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section id="conferencia" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
            <div className="grid overflow-hidden border border-[#6f0d12]/16 bg-[#fbf7f1] lg:grid-cols-[.9fr_1.1fr]">
              <div className="relative bg-[#efe3d7] p-5 sm:p-8">
                <Image src="/api/jpvalderrama/assets/conference-poster" alt="Afiche oficial de la conferencia ¿Filosofía o Dinero? — El arte de comer papel" width={1536} height={1536} unoptimized className="mx-auto h-auto w-full max-w-[610px]" sizes="(max-width: 1024px) 90vw, 610px" />
              </div>
              <div className="p-7 sm:p-10 lg:p-12">
                <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">Conferencia destacada</p>
                <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-.025em] text-[#17110e] sm:text-5xl">¿Filosofía o Dinero?</h2>
                <p className="mt-3 font-serif text-2xl italic text-[#6f0d12]">El arte de comer papel</p>
                <p className="mt-6 font-serif text-[16px] leading-8 text-[#564a42]">Una conversación sobre formación humanística, trabajo, expectativas sociales, valor económico y la vieja pregunta por aquello para lo que sirve estudiar filosofía.</p>
                <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                  {eventDetails.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex gap-3 border-t border-[#6f0d12]/12 pt-4"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#6f0d12]" aria-hidden="true" /><div><dt className="text-[10px] font-bold uppercase tracking-[.16em] text-[#665950]">{label}</dt><dd className="mt-1 font-serif text-[16px] text-[#241a15]">{value}</dd></div></div>
                  ))}
                </dl>
                <div className="mt-8 flex flex-wrap gap-3"><a href="#inscripcion" className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Inscribirme <ArrowRight className="h-4 w-4" aria-hidden="true" /></a><a href="https://wa.me/573186428218" className="inline-flex min-h-12 items-center rounded-sm border border-[#6f0d12]/40 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Consultar por WhatsApp</a></div>
              </div>
            </div>
          </div>
        </section>

        <section id="inscripcion" className="scroll-mt-24 border-y border-[#6f0d12]/10 bg-[#efe3d7] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start lg:px-12">
            <div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Registro operativo</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">Inscripción digital a Valderrama Talks.</h2><p className="mt-6 font-serif text-[17px] leading-8 text-[#564a42]">La inscripción queda almacenada de manera persistente para gestionar asistencia y comunicaciones relacionadas con el evento. No necesitas crear una cuenta de CTG One para registrarte.</p><div className="mt-7 border-l border-[#6f0d12]/35 pl-5 text-sm leading-7 text-[#665950]"><p><strong className="text-[#3c3029]">Importante:</strong> registrarte no equivale a pagar el ticket. Esta fase no solicita datos financieros ni ejecuta cobros.</p></div></div>
            <TalkRegistrationForm />
          </div>
        </section>

        <section className="py-16 sm:py-20"><div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12"><div className="grid gap-8 border border-[#6f0d12]/14 bg-[#fbf7f1] p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center"><div className="max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Programación</p><h2 className="mt-3 font-serif text-3xl text-[#17110e] sm:text-4xl">Un catálogo público que crecerá con fechas confirmadas.</h2><p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">“¿Filosofía o Dinero?” es la primera conferencia publicada en esta plataforma. Nuevas charlas, clases y ciclos aparecerán aquí cuando su programación y contenido estén confirmados.</p></div><a href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-[#6f0d12]/40 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Proponer una charla <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div></div></section>
      </div>
      <JPValderramaFooter />
    </main>
  );
}
