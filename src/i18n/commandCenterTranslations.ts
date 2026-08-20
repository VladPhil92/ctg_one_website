import type { Locale } from './translations';

type Pair = { en: string; es: string };

const PAIRS: Pair[] = [
  { en: 'Core online', es: 'Núcleo en línea' },
  { en: 'System', es: 'Sistema' },
  { en: 'ONLINE', es: 'EN LÍNEA' },
  { en: 'NODE 08/08', es: 'NODO 08/08' },
  { en: 'LINK STABLE', es: 'ENLACE ESTABLE' },
  { en: 'LIVE PRODUCT / CASE-001', es: 'PRODUCTO OPERATIVO / CASO-001' },
  { en: 'Physical production layer', es: 'Capa de producción física' },
  { en: 'CTG/CORE-01', es: 'CTG/NÚCLEO-01' },
  { en: 'NET 08/08', es: 'RED 08/08' },
  { en: 'SYNC 100', es: 'SINCR. 100' },
];

const enToEs = new Map(PAIRS.map(({ en, es }) => [en, es]));
const esToEn = new Map(PAIRS.map(({ en, es }) => [es, en]));
const english = new Set(PAIRS.map(({ en }) => en));
const spanish = new Set(PAIRS.map(({ es }) => es));

export function translateCommandCenterPhrase(value: string, locale: Locale): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  if (locale === 'es' && spanish.has(trimmed)) return value;
  if (locale === 'en' && english.has(trimmed)) return value;

  const exact = locale === 'es' ? enToEs.get(trimmed) : esToEn.get(trimmed);
  if (exact) {
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${exact}${value.slice(start + trimmed.length)}`;
  }

  const moduleMatch = trimmed.match(/^(MODULE|MÓDULO)-(\d{2})$/);
  if (moduleMatch) {
    const translated = `${locale === 'es' ? 'MÓDULO' : 'MODULE'}-${moduleMatch[2]}`;
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${translated}${value.slice(start + trimmed.length)}`;
  }

  return value;
}
