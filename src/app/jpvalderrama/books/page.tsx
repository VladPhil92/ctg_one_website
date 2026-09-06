import { ArrowRight, BookMarked, FileCheck2, LibraryBig, PenLine } from 'lucide-react';
import { EducationAxisCatalog } from '@/components/jpvalderrama/EducationAxisCatalog';
import { JPSubbrandLanding } from '@/components/jpvalderrama/JPValderramaShell';

const cards = [
  {
    title: 'Manuscritos',
    text: 'Proyectos de escritura de largo aliento que requieren arquitectura conceptual, investigación, edición y una voz autoral consistente.',
  },
  {
    title: 'Investigación',
    text: 'Trabajo bibliográfico y argumentativo para convertir preguntas filosóficas y educativas en cuerpos de conocimiento desarrollados con rigor.',
  },
  {
    title: 'Edición y publicación',
    text: 'Diseño de rutas editoriales, revisión, preparación de materiales y construcción gradual de un catálogo verificable de obras y recursos.',
  },
] as const;

const lifecycle = [
  { icon: PenLine, title: 'Manuscrito', text: 'Una obra en desarrollo se presenta como proceso editorial, nunca como libro disponible.' },
  { icon: FileCheck2, title: 'Edición verificable', text: 'La obra pasa por revisión, preparación y definición de formato antes de habilitar una oferta comercial.' },
  { icon: BookMarked, title: 'Publicación', text: 'Solo una edición realmente disponible entra al catálogo con precio, formato y condiciones explícitas.' },
  { icon: LibraryBig, title: 'Acceso y biblioteca', text: 'Las ediciones digitales o recursos asociados pueden quedar vinculados a la cuenta mediante entitlement; la logística física se habilitará solo cuando exista fulfillment real.' },
] as const;

export default function ValderramaBooksPage() {
  return (
    <JPSubbrandLanding
      active="books"
      image="/jpvalderrama/books.webp"
      imageAlt="Logo Valderrama Books"
      eyebrow="Valderrama Books · Libros · Investigación · Publicación"
      headline="Escritura de largo aliento para ideas que deben permanecer."
      intro="Valderrama Books reúne la dimensión editorial e investigativa de JP Valderrama: manuscritos, libros, ensayos extensos y recursos que requieren tiempo, documentación y desarrollo conceptual."
      cards={cards}
      statusTitle="Un catálogo que crecerá con obra real."
      statusText="Esta página no inventa títulos ni publicaciones inexistentes. Cada obra entra al catálogo únicamente cuando existe una edición verificable y una modalidad real de entrega."
    >
      <section className="border-y border-[#6f0d12]/10 bg-[#efe3d7] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-6 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Ciclo editorial</p><h2 className="mt-3 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">Del manuscrito a una edición que realmente puede comprarse.</h2></div>
            <p className="max-w-2xl font-serif text-[17px] leading-8 text-[#665950] lg:justify-self-end">Books distingue proceso editorial de disponibilidad comercial. Un manuscrito puede ser público como proyecto, pero solo una edición publicada, con formato y entrega definidos, entra al checkout.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lifecycle.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="border border-[#6f0d12]/14 bg-[#fbf7f1] p-6"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#6f0d12]" aria-hidden="true" /><span className="font-serif text-xl text-[#6f0d12]/45">0{index + 1}</span></div><h3 className="mt-5 font-serif text-xl text-[#17110e]">{title}</h3><p className="mt-3 text-sm leading-7 text-[#665950]">{text}</p></article>
            ))}
          </div>
          <a href="#oferta" className="mt-7 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">Ver publicaciones disponibles <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>

      <EducationAxisCatalog axis="books" title="Biblioteca y ediciones disponibles" intro="Las publicaciones con precio fijo utilizan el mismo checkout educativo de CTG One. Una edición digital puede habilitar acceso en la biblioteca del usuario; una edición física solo se ofrecerá cuando la operación de entrega esté realmente disponible." />
    </JPSubbrandLanding>
  );
}
