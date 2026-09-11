'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Atom,
  Beaker,
  BrainCircuit,
  Compass,
  Leaf,
  Mountain,
  Orbit,
  Shapes,
  Trees,
} from 'lucide-react';
import phase2 from './worldmakers-phase2.module.css';
import portal from './portal.module.css';

const destinations = [
  {
    id: 'rainforest',
    slug: 'caribbean-rainforest',
    name: 'Caribbean Rainforest',
    short: 'Rainforest',
    status: 'Vertical slice',
    subject: 'Ecología + ciencia',
    copy: 'El bioma de referencia conecta exploración, observación, estado del ecosistema y construcción ecológica con consecuencias visibles.',
    mechanic: 'Observar → intervenir → medir consecuencias',
    icon: Trees,
    x: 19,
    y: 58,
  },
  {
    id: 'infinite-staircase',
    slug: 'vault-infinite-staircase',
    name: 'The Vault of the Infinite Staircase',
    short: 'Infinite Staircase',
    status: 'Adventure candidate',
    subject: 'Matemáticas',
    copy: 'Una torre que se reorganiza exige reconocer patrones, proporciones, equivalencias y restricciones para volver a abrir el camino.',
    mechanic: 'Patrones → construcción → equivalencia',
    icon: Shapes,
    x: 32,
    y: 25,
  },
  {
    id: 'impossible-city',
    slug: 'architects-impossible-city',
    name: 'Architects of the Impossible City',
    short: 'Impossible City',
    status: 'Adventure candidate',
    subject: 'Geometría',
    copy: 'Puentes, cúpulas y plazas flotantes deben volver a encajar mediante simetría, escala, transformaciones, área y volumen.',
    mechanic: 'Diseñar → probar → satisfacer restricciones',
    icon: Mountain,
    x: 48,
    y: 46,
  },
  {
    id: 'alchemist',
    slug: 'alchemists-archipelago',
    name: "The Alchemist's Archipelago",
    short: 'Alchemist Archipelago',
    status: 'Adventure candidate',
    subject: 'Química',
    copy: 'Islas gobernadas por propiedades de la materia permiten investigar mezclas, soluciones, separación, reacciones y conservación.',
    mechanic: 'Predecir → experimentar → revisar',
    icon: Beaker,
    x: 66,
    y: 69,
  },
  {
    id: 'moonforge',
    slug: 'moonforge',
    name: 'The Moonforge',
    short: 'Moonforge',
    status: 'Adventure candidate',
    subject: 'Física',
    copy: 'Una forja lunar rota solo puede recuperarse si las máquinas vuelven a funcionar con fuerzas, energía, circuitos, ondas y movimiento.',
    mechanic: 'Modelar → construir → verificar',
    icon: Orbit,
    x: 76,
    y: 29,
  },
  {
    id: 'living-forest',
    slug: 'forest-thousand-voices',
    name: 'The Forest of a Thousand Voices',
    short: 'Thousand Voices',
    status: 'Adventure candidate',
    subject: 'Ecología',
    copy: 'Un bosque persistente reacciona al agua, la biodiversidad, el hábitat y las decisiones del jugador como un sistema acoplado.',
    mechanic: 'Observar → predecir → restaurar',
    icon: Leaf,
    x: 87,
    y: 54,
  },
  {
    id: 'living-cell',
    slug: 'city-inside-cell',
    name: 'The City Inside a Cell',
    short: 'City Inside a Cell',
    status: 'Adventure candidate',
    subject: 'Biología',
    copy: 'El jugador entra en una célula viva y mantiene en equilibrio energía, transporte, membrana, información, nutrientes y residuos.',
    mechanic: 'Explorar → modelar sistema → reparar',
    icon: Atom,
    x: 56,
    y: 82,
  },
  {
    id: 'ship',
    slug: 'ship-never-same',
    name: 'The Ship That Was Never the Same',
    short: 'The Changing Ship',
    status: 'Adventure candidate',
    subject: 'Filosofía',
    copy: 'Una nave cambia pieza por pieza y obliga a argumentar qué hace que algo siga siendo lo mismo a través del cambio.',
    mechanic: 'Tomar posición → contraejemplo → revisar argumento',
    icon: BrainCircuit,
    x: 39,
    y: 76,
  },
];

export default function WorldExplorer() {
  const [selectedId, setSelectedId] = useState(destinations[0].id);
  const selected = destinations.find((destination) => destination.id === selectedId) ?? destinations[0];
  const SelectedIcon = selected.icon;

  return (
    <div className={phase2.explorerShell}>
      <div className={phase2.mapPanel}>
        <div className={phase2.mapAtmosphere} aria-hidden="true" />
        <div className={phase2.mapGrid} aria-hidden="true" />
        <div className={phase2.mapTitle}>
          <span>WORLD ATLAS // CONCEPT ROUTES</span>
          <strong>Elige una región</strong>
        </div>

        {destinations.map((destination, index) => {
          const Icon = destination.icon;
          const active = destination.id === selected.id;
          return (
            <button
              key={destination.id}
              type="button"
              className={`${phase2.mapPin} ${active ? phase2.mapPinActive : ''}`}
              style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
              onClick={() => setSelectedId(destination.id)}
              aria-pressed={active}
              aria-label={`Explorar ${destination.name}`}
            >
              <span className={phase2.pinPulse} aria-hidden="true" />
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span className={phase2.pinNumber}>{String(index + 1).padStart(2, '0')}</span>
            </button>
          );
        })}

        <div className={phase2.mapLegend}>
          <Compass size={16} aria-hidden="true" />
          <span>Mapa conceptual. Las regiones y aventuras se encuentran en distintos niveles de producción.</span>
        </div>
      </div>

      <div className={phase2.destinationPanel} aria-live="polite">
        <div className={phase2.destinationIcon}><SelectedIcon size={30} aria-hidden="true" /></div>
        <div className={phase2.destinationStatus}>{selected.status}</div>
        <p className={phase2.destinationSubject}>{selected.subject}</p>
        <h3>{selected.name}</h3>
        <p>{selected.copy}</p>
        <div className={phase2.mechanicBox}>
          <span>Loop de aprendizaje</span>
          <strong>{selected.mechanic}</strong>
        </div>
        <Link className={portal.cardLink} href={`/worldmakers/adventures/${selected.slug}`}>
          Abrir ficha de aventura <ArrowRight size={16} />
        </Link>
        <div className={phase2.destinationList}>
          {destinations.map((destination) => (
            <button
              key={destination.id}
              type="button"
              className={destination.id === selected.id ? phase2.destinationListActive : ''}
              onClick={() => setSelectedId(destination.id)}
            >
              {destination.short}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
