import { ArrowRight, BookOpenText, GraduationCap, Search } from 'lucide-react';
import { EducationAxisCatalog } from '@/components/jpvalderrama/EducationAxisCatalog';
import { JPSubbrandLanding } from '@/components/jpvalderrama/JPValderramaShell';
import { IDEAS_VISUAL_SRC } from '@/data/jpvalderrama-visuals/ideas-src';

const cards = [
  {
    title: 'Filosofía y sociedad',
    text: 'Ensayos y preguntas sobre vida pública, ética, comunidad, cultura y los conceptos con los que interpretamos nuestro tiempo.',
  },
  {
    title: 'Educación y cultura',
    text: 'Reflexiones sobre aprendizaje, lectura, escritura, escuela, formación humana y pensamiento crítico en contextos contemporáneos.',
  },
  {
    title: 'Tecnología y humanidades',
    text: 'Análisis de inteligencia artificial, transformación digital y emprendimiento desde preguntas filosóficas, educativas y sociales.',
  },
] as const;

const layers = [
  { icon: Search, title: 'Pregunta', text: 'Cada pieza parte de un problema explícito y de fuentes identificables, no de volumen editorial artificial.' },
  { icon: BookOpenText, title: 'Publicación', text: 'Los ensayos, notas y recursos públicos funcionan como archivo intelectual abierto y como puerta de entrada temática.' },
  { icon: GraduationCap, title: 'Profundización', text: 'Cuando una idea justifica una experiencia formativa, se convierte en curso o recurso dentro del Campus y se sigue desde Mi aprendizaje.' },
] as const;

export default function ValderramaIdeasPage() {
  return (
    <JPSubbrandLanding
      active="ideas"
      image={IDEAS_VISUAL_SRC}
      imageAlt="Identidad original Valderrama Ideas"
      eyebrow="Valderrama Ideas · Ensayo · Análisis · Pensamiento"
      headline="Ideas para pensar el presente con rigor."
      intro="Valderrama Ideas es el archivo editorial de JP Valderrama: un espacio para formular preguntas, construir argumentos y conectar filosofía, educación, tecnología, empresa y cultura."
      cards={cards}
      statusTitle="Un archivo editorial que crece con evidencia, no con páginas vacías."
      statusText="Esta ruta es el índice canónico de Valderrama Ideas. Los textos aparecerán cuando exista una pieza editorial terminada y revisada. Los cursos y recursos asociados se publican como ofertas independientes y conservan su acceso dentro del dashboard educativo."
    >
      <section className="border-y border-[#6f0d12]/10 bg-[#efe3d7] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Arquitectura editorial</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-[#17110e] sm:text-5xl">De una pregunta pública a una experiencia de aprendizaje.</h2>
            <p className="mt-5 font-serif text-[17px] leading-8 text-[#665950]">Ideas no debe convertirse en una tienda ni en un blog de relleno. Su función es ordenar el pensamiento y permitir que las piezas que ameriten estudio profundo escalen hacia cursos, guías y recursos educativos.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {layers.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="border border-[#6f0d12]/14 bg-[#fbf7f1] p-7">
                <div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#6f0d12]" aria-hidden="true" /><span className="font-serif text-xl text-[#6f0d12]/45">0{index + 1}</span></div>
                <h3 className="mt-5 font-serif text-2xl text-[#17110e]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665950]">{text}</p>
              </article>
            ))}
          </div>
          <a href="/jpvalderrama/campus" className="mt-7 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">Explorar todo el Campus <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>

      <EducationAxisCatalog axis="ideas" title="Ideas que ya pueden estudiarse" intro="Aquí aparecen únicamente cursos y recursos publicados. El contenido público puede leerse sin compra; una experiencia formativa con seguimiento requiere cuenta para conservar matrícula, entitlement y progreso." />
    </JPSubbrandLanding>
  );
}
