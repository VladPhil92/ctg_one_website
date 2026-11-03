import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BookOpenCheck, CalendarDays, ShieldCheck, Smartphone, UsersRound } from 'lucide-react';

const title = 'Valderrama Learning Center App | CTG One';
const description = 'Conexión educativa para familias, adultos y tutores especializados. Entorno de demostración sin reservas reales.';
export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://ctgone.com/valderrama-learning-center' },
  openGraph: { title, description, url: 'https://ctgone.com/valderrama-learning-center', type: 'website' },
};
const features = [
  { icon: UsersRound, title: 'Busca especialistas', content: 'Filtra perfiles ficticios por asignatura, nivel educativo y modalidad.' },
  { icon: CalendarDays, title: 'Agenda una tutoría', content: 'Simula solicitudes, disponibilidad, aceptación y reprogramación.' },
  { icon: BookOpenCheck, title: 'Verifica la experiencia', content: 'Una valoración requiere finalizar una clase y revisión antes de publicarse.' },
  { icon: ShieldCheck, title: 'Protege al estudiante', content: 'Las alertas suspenden automáticamente el proceso, sin aprobación de menores por defecto.' },
];
export default function LearningCenterMarketplacePage() {
  return <main className="min-h-screen bg-[#f3f7f4] text-[#14313c]">
    <div className="bg-[#102d39] px-6 py-3 text-center text-xs font-bold tracking-wide text-[#c7e8e0]">
      CTG ONE · PRELANZAMIENTO · SIN CLASES, CUENTAS NI PAGOS REALES
    </div>
    <div className="mx-auto max-w-6xl px-6 py-8">
      <nav className="flex flex-wrap items-center justify-between gap-5 text-sm">
        <Link href="/" className="font-bold tracking-[.12em]">CTG ONE</Link>
        <Link href="/jpvalderrama/learningcenter" className="text-[#246b62] underline underline-offset-4">Tutorías privadas actuales</Link>
      </nav>
      <section className="grid gap-10 py-16 md:grid-cols-[1.3fr_.7fr] md:items-center md:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#197c74]">VALDERRAMA LEARNING CENTER APP</p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-6xl">Conectamos talento docente y aprendizaje.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5b757b]">Una nueva plataforma para familias, estudiantes universitarios y personas adultas que buscan profesores especializados. Desarrollamos primero el producto, sus procesos y sus garantías de protección.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/valderrama-learning-center/index.html" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#133b48] px-6 py-4 text-sm font-bold text-white">
              Ver catálogo de ejemplo <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/valderrama-learning-center/demo/index.html" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#8dc5b8] px-6 py-4 text-sm font-bold text-[#126559]">
              Probar reservas simuladas <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <aside className="rounded-3xl border border-[#b9d7ce] bg-[#e5f4ed] p-8">
          <ShieldCheck size={33} className="text-[#137e70]" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-bold">Sin proveedores conectados</h2>
          <p className="mt-4 leading-7 text-[#4b7072]">Los docentes, horarios, valoraciones y alertas son ficticios. La verificación de identidad, antecedentes, tutela, consentimientos y controles humanos debe operar antes de cualquier reserva real con menores.</p>
        </aside>
      </section>
      <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({icon: Icon,title: heading,content}) => <article key={heading} className="rounded-2xl border border-[#dce9e3] bg-white p-6">
          <Icon className="h-7 w-7 text-[#16867b]" aria-hidden="true" />
          <h3 className="mt-5 text-lg font-bold">{heading}</h3>
          <p className="mt-3 text-sm leading-6 text-[#5b727a]">{content}</p>
        </article>)}
      </section>
      <section className="mb-14 rounded-3xl border border-[#b9d7ce] bg-white p-7 md:p-10">
        <div className="flex items-start gap-4">
          <Smartphone size={32} className="shrink-0 text-[#137e70]" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#197c74]">Un producto · Tres plataformas</p>
            <h2 className="mt-3 text-2xl font-extrabold">Web, Android e iOS sincronizados</h2>
            <p className="mt-3 max-w-3xl leading-7 text-[#5b727a]">El producto está diseñado para compartir identidad educativa, docentes, agenda y progreso mediante una API central. La base React Native/Expo ya incluye un laboratorio local de reservas ficticias sincronizadas con una interfaz web mediante Node.js y SQLite. La siguiente fase ya incluye cuentas de prueba, sesiones revocables y agendas privadas en el mismo backend local. La validación de identidad real, la sincronización productiva, los binarios instalables y la publicación en tiendas continúan pendientes.</p>
            <p className="mt-3 text-xs font-semibold text-[#8a6a26]">Las aplicaciones aún no están disponibles en Google Play ni App Store.</p>
          </div>
        </div>
      </section>
      <footer className="border-t border-[#d5e3dd] py-8 text-sm leading-6 text-[#6b848a]">
        Subdominio previsto: valderramalearnigncenter.ctgone.com. Su activación necesita hosting, DNS y certificado TLS.
      </footer>
    </div>
  </main>;
}
