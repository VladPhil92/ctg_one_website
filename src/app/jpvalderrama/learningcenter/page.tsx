import type { Metadata } from 'next';
import { ArrowRight, BookOpenCheck, GraduationCap, Home, Languages, Monitor, School, UsersRound } from 'lucide-react';
import { EducationFamilyServiceRequest } from '@/components/jpvalderrama/EducationFamilyServiceRequest';
import { JPValderramaFooter, JPValderramaHeader } from '@/components/jpvalderrama/JPValderramaShell';

const title = 'Valderrama Learning Center | Tutorías privadas | CTG One';
const description = 'Tutorías privadas, refuerzo, preparación de exámenes y acompañamiento académico en modalidad virtual o a domicilio para estudiantes y familias.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: 'https://ctgone.com/jpvalderrama/learningcenter',
  },
  openGraph: {
    title,
    description,
    url: 'https://ctgone.com/jpvalderrama/learningcenter',
    siteName: 'CTG One',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

const services = [
  ['Tutorías privadas', 'Matemáticas, Física, Ciencias, Inglés, Sociales y Español.', UsersRound],
  ['Refuerzo académico', 'Acompañamiento para fortalecer fundamentos y desempeño escolar.', BookOpenCheck],
  ['Preparación académica', 'Preparación de exámenes, exposiciones, trabajos y entregas.', GraduationCap],
  ['Educación bilingüe', 'Profesores bilingües con experiencia en colegios IB y Calendario B.', Languages],
] as const;

export default function ValderramaLearningCenterPage() {
  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f]">
      <JPValderramaHeader active="learning center" />
      <section className="border-b border-[#6f0d12]/10">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-12 lg:py-24">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#6f0d12]">JP Valderrama · Educación privada para familias</p>
            <h1 className="mt-5 font-serif text-5xl leading-[.96] tracking-[-.035em] sm:text-6xl lg:text-[4.8rem]">Valderrama Learning Center</h1>
            <p className="mt-7 max-w-3xl font-serif text-xl leading-9 text-[#564a42]">Tutorías privadas, refuerzo, preparación de exámenes y acompañamiento académico en modalidad virtual o a domicilio.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#solicitud" className="inline-flex min-h-12 items-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Solicitar tutoría <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              <a href="/dashboard/educacion" className="inline-flex min-h-12 items-center gap-2 border border-[#6f0d12]/35 px-6 text-xs font-bold uppercase tracking-[.13em] text-[#6f0d12]">Mi aprendizaje <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          </div>
          <aside className="border border-[#6f0d12]/16 bg-[#fbf7f1] p-8">
            <School className="h-7 w-7 text-[#6f0d12]" aria-hidden="true" />
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Educación de élite en tu hogar</p>
            <h2 className="mt-3 font-serif text-3xl">Una línea de servicios diferenciada.</h2>
            <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">Learning Center concentra el servicio académico directo para estudiantes y familias. La solicitud no es un checkout: primero definimos estudiante, objetivo, modalidad y disponibilidad; después se formaliza alcance y cotización.</p>
          </aside>
        </div>
      </section>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <h2 className="font-serif text-4xl sm:text-5xl">Servicios educativos privados</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {services.map(([serviceTitle, text, Icon]) => <article key={serviceTitle} className="border border-[#6f0d12]/14 bg-[#fbf7f1] p-7"><Icon className="h-5 w-5 text-[#6f0d12]" aria-hidden="true" /><h3 className="mt-5 font-serif text-2xl">{serviceTitle}</h3><p className="mt-3 font-serif text-[16px] leading-7 text-[#665950]">{text}</p></article>)}
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="border border-[#6f0d12]/14 bg-[#efe3d7] p-7"><Home className="h-5 w-5 text-[#6f0d12]" aria-hidden="true" /><h3 className="mt-4 font-serif text-2xl">A domicilio</h3><p className="mt-3 text-sm leading-7 text-[#665950]">Acompañamiento privado en el hogar según área, grado, objetivo académico y cobertura disponible.</p></article>
            <article className="border border-[#6f0d12]/14 bg-[#efe3d7] p-7"><Monitor className="h-5 w-5 text-[#6f0d12]" aria-hidden="true" /><h3 className="mt-4 font-serif text-2xl">Virtual</h3><p className="mt-3 text-sm leading-7 text-[#665950]">Continuidad académica y flexibilidad para familias dentro o fuera de la ciudad.</p></article>
          </div>
        </div>
      </section>

      <section id="solicitud" className="scroll-mt-24 border-y border-[#6f0d12]/10 bg-[#efe3d7] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Ruta para familias</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">Cuéntanos qué necesita el estudiante.</h2>
            <p className="mt-6 font-serif text-[17px] leading-8 text-[#665950]">La solicitud queda asociada a la cuenta CTG One y aparece después en Mi aprendizaje. El flujo correcto es diagnóstico → disponibilidad → alcance y cotización → contratación; enviar este formulario no genera cobros.</p>
          </div>
          <EducationFamilyServiceRequest />
        </div>
      </section>
      <JPValderramaFooter />
    </main>
  );
}
