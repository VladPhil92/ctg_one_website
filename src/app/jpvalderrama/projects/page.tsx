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
      statusText="La ruta queda preparada como archivo oficial de proyectos. Cada caso se incorporará cuando exista información suficiente para describir su problema, proceso, alcance y resultado sin presentar conceptos en desarrollo como productos terminados."
    />
  );
}
