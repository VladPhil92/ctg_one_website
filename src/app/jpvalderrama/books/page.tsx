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
      statusText="Esta página no inventa títulos ni publicaciones inexistentes. Funcionará como catálogo oficial a medida que cada manuscrito, libro o recurso editorial alcance un estado verificable de publicación o disponibilidad."
    />
  );
}
