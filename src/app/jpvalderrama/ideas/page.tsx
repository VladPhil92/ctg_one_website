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
      statusTitle="El archivo editorial comienza aquí."
      statusText="Esta ruta es el índice canónico de Valderrama Ideas. Los textos aparecerán cuando exista una pieza editorial terminada y revisada; no publicaremos entradas vacías ni un catálogo ficticio para aparentar volumen."
    />
  );
}
