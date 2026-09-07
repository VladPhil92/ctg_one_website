import { ArrowRight, FileSearch, Layers3, Route, Wrench } from 'lucide-react';
import { EducationAxisCatalog } from '@/components/jpvalderrama/EducationAxisCatalog';
import { JPSubbrandLanding } from '@/components/jpvalderrama/JPValderramaShell';

const cards = [
  {
    title: 'Investigación aplicada',
    text: 'Preguntas y marcos teóricos transformados en diagnósticos, metodologías y soluciones que puedan probarse en contextos educativos, sociales u organizacionales.',
  },
  {
    title: 'EdTech y producto',
    text: 'Diseño y desarrollo de herramientas digitales que conectan aprendizaje, inteligencia artificial, experiencia de usuario y necesidades operativas reales.',
  },
  {
    title: 'Diseño interdisciplinario',
    text: 'Proyectos donde filosofía, educación, escritura, tecnología y emprendimiento se combinan para construir nuevas experiencias, servicios o sistemas.',
  },
] as const;

const projectPath = [
  { icon: FileSearch, title: 'Diagnóstico', text: 'Se define el problema, los usuarios, la evidencia disponible y las restricciones antes de ofrecer una solución.' },
  { icon: Route, title: 'Diseño de alcance', text: 'Objetivos, entregables, cronograma, responsabilidades y criterios de éxito quedan explícitos en una propuesta.' },
  { icon: Wrench, title: 'Construcción', text: 'La intervención puede combinar investigación, formación, diseño de servicio, contenidos o tecnología según el caso.' },
  { icon: Layers3, title: 'Evidencia y continuidad', text: 'El resultado se documenta y, cuando corresponde, se convierte en recurso, programa o caso publicable.' },
] as const;

export default function ValderramaProjectsPage() {
  return (
    <JPSubbrandLanding
      active="projects"
      image="/jpvalderrama/projects.webp"
      imageAlt="Logo Valderrama Projects"
      eyebrow="Valderrama Projects · Investigación · Diseño · Construcción"
      headline="Ideas que se convierten en sistemas, productos y acción."
      intro="Valderrama Projects es el laboratorio aplicado de JP Valderrama: el punto donde investigación, educación, tecnología y emprendimiento dejan de ser categorías separadas y pasan a construir soluciones concretas."
      cards={cards}
      statusTitle="Portafolio basado en evidencia, no en promesas."
      statusText="Cada caso se incorpora cuando existe información suficiente para describir problema, proceso, alcance y resultado. Los servicios a medida permanecen separados del checkout de productos con precio fijo y comienzan siempre por un brief verificable."
    >
      <section className="border-y border-[#6f0d12]/10 bg-[#17110e] px-5 py-16 text-[#fffaf2] sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d8b56a]">Ruta de contratación</p><h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Un proyecto no se compra como un ticket.</h2></div>
            <p className="max-w-2xl font-serif text-[17px] leading-8 text-[#d7ccc3] lg:justify-self-end">El valor depende del problema, el alcance y los entregables. Por eso Projects usa un flujo de solicitud y propuesta antes de cualquier contratación, en lugar de inventar un precio uniforme.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {projectPath.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="border border-white/10 bg-white/[.035] p-6"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#d8b56a]" aria-hidden="true" /><span className="font-serif text-xl text-[#d8b56a]/55">0{index + 1}</span></div><h3 className="mt-5 font-serif text-xl">{title}</h3><p className="mt-3 text-sm leading-7 text-[#c9bdb4]">{text}</p></article>
            ))}
          </div>
          <a href="/jpvalderrama/campus#instituciones" className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#d8b56a] px-6 text-[10px] font-bold uppercase tracking-[.14em] text-[#17110e]">Plantear un proyecto <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>

      <EducationAxisCatalog axis="projects" title="Programas publicados" intro="Si un proyecto evoluciona hacia un programa con alcance y condiciones estandarizadas, aparecerá aquí. Hasta entonces, la ruta responsable es diagnóstico y cotización, no un producto ficticio." />
    </JPSubbrandLanding>
  );
}
