import type { Locale } from './translations';

type Pair = { en: string; es: string };

const PAIRS: Pair[] = [
  { en: 'Each batch publishes its', es: 'Cada lote publica su' },
  { en: 'own snapshot', es: 'propio snapshot' },
  { en: 'Costs, prices, taxes and commercial parameters are fixed per batch in the database. We do not display filler figures when there is no published batch with complete economics yet.', es: 'Costos, precios, impuestos y parámetros comerciales se fijan por lote en la base de datos. No mostramos cifras de relleno cuando todavía no existe un lote publicado con economía completa.' },
  { en: 'There is currently no batch economics snapshot available for publication. When Production OS enables a batch, this section will read directly from its persisted values and identify the batch code used as reference.', es: 'En este momento no hay un snapshot económico de lote disponible para publicación. Cuando Production OS habilite un lote, esta sección se alimentará directamente de sus valores persistidos y quedará identificada con el código del lote utilizado como referencia.' },
  { en: 'B2B price', es: 'Precio B2B' },
  { en: 'The result depends on the batch’s effective commercial mix.', es: 'El resultado depende de la mezcla comercial efectiva del lote.' },
  { en: 'For snapshot', es: 'Para el snapshot' },
  { en: ', the simplified contribution per bottle is', es: ', la contribución simplificada por botella es' },
  { en: 'in the owned-location scenario and', es: 'en el escenario de punto propio y' },
  { en: 'in B2B', es: 'en B2B' },
  { en: 'between both scenarios', es: 'entre ambos escenarios' },
  { en: '. Settlement does not use this comparison: it is calculated with revenue, taxes, commercial costs, production costs and adjustments actually recorded for the batch.', es: '. La liquidación no usa esta comparación: se calcula con los ingresos, impuestos, costos comerciales, costos de producción y ajustes efectivamente registrados para el lote.' },
  { en: 'Source: persisted snapshot of', es: 'Fuente: snapshot persistido de' },
  { en: '. This view is explanatory and does not constitute guaranteed returns. Historical batch values are not recalculated with later master-catalog presets.', es: '. Esta vista es explicativa y no constituye una rentabilidad garantizada. Los valores históricos del lote no se recalculan con presets posteriores del catálogo maestro.' },

  { en: 'Simulator', es: 'Simulador' },
  { en: 'Participation simulator', es: 'Simulador de participación' },
  { en: 'Adjust the number of cases to explore a participation scenario. If there is a batch open for funding, the calculation uses its real economics snapshot; while none exists, an explicitly identified illustrative reference scenario is used.', es: 'Ajusta el número de cajas para explorar una participación. Si existe un lote con financiación abierta, el cálculo usa su snapshot económico real; mientras no exista uno, se utiliza un escenario ilustrativo de referencia claramente identificado.' },
  { en: 'Illustrative reference scenario', es: 'Escenario ilustrativo de referencia' },
  { en: 'There is no batch open for funding yet. To keep the simulator useful, we show the previously published illustrative reference scenario. It is not a current offer and does not replace the economics of the batch you eventually select for investment.', es: 'Todavía no hay un lote con financiación abierta. Para que el simulador siga siendo útil, mostramos el escenario ilustrativo de referencia previamente publicado. No representa una oferta vigente ni sustituye los valores económicos del lote que finalmente selecciones para invertir.' },
  { en: 'Scenario basis', es: 'Base del escenario' },
  { en: 'Illustrative reference · no open batch', es: 'Referencia ilustrativa · sin lote abierto' },
  { en: 'Estimated required capital', es: 'Capital estimado requerido' },
  { en: 'Projected sales · illustrative', es: 'Ventas proyectadas · ilustrativo' },
  { en: 'Net distributable profit · illustrative', es: 'Utilidad neta distribuible · ilustrativo' },
  { en: 'Projected participant share · illustrative', es: 'Participación proyectada · ilustrativo' },
  { en: 'There is no active financial formula for this batch. Capital, revenue and contribution are shown, but participant share and ROI are not calculated.', es: 'No existe una fórmula financiera activa para este lote. Se muestran capital, ingresos y contribución, pero no se calcula participación ni ROI del participante.' },
  { en: 'The simulator is informational. When an open batch exists, its persisted costs and prices automatically replace the reference profile. A real order never uses the illustrative figures on this page: PostgreSQL calculates capital exclusively from the economics snapshot of the selected batch. The current minimum investment is', es: 'El simulador es informativo. Cuando exista un lote abierto, sus costos y precios persistidos sustituyen automáticamente el perfil de referencia. Una orden real nunca usa las cifras ilustrativas de esta página: PostgreSQL calcula el capital exclusivamente desde el snapshot económico del lote seleccionado. La inversión mínima vigente es de' },

  { en: 'Batch-snapshot simulator', es: 'Simulador por snapshot de lote' },
  { en: 'Explore scenarios built with costs, prices and rates stored in a real batch that is open for funding. The platform no longer uses a fixed projected return or a capital-per-case value written in the frontend.', es: 'Explora escenarios construidos con costos, precios y tasas almacenados en un lote real con financiación abierta. La plataforma ya no utiliza una rentabilidad proyectada fija ni un capital por caja escrito en el frontend.' },
  { en: 'There are no funding-open batches with a complete economics snapshot. The simulator remains disabled to avoid showing figures that do not come from a real opportunity published in the database.', es: 'No hay lotes con financiación abierta y snapshot económico completo. El simulador permanece deshabilitado para evitar mostrar cifras que no provengan de una oportunidad real publicada en la base de datos.' },
  { en: 'Published batch', es: 'Lote publicado' },
  { en: 'Equivalent cases', es: 'Cajas equivalentes' },
  { en: 'Eq. bottles', es: 'Botellas eq.' },
  { en: 'Required capital', es: 'Capital requerido' },
  { en: 'Formula', es: 'Fórmula' },
  { en: 'Participant', es: 'Participante' },
  { en: 'No active formula', es: 'No activa' },
  { en: 'There is no active financial formula. Capital, revenue and batch-snapshot contribution are shown, but participant share and ROI are not calculated.', es: 'No existe una fórmula financiera activa. Se muestran capital, ingresos y contribución del snapshot del lote, pero no se calcula participación ni ROI.' },
  { en: 'Boundary scenario · 100% owned location', es: 'Escenario límite · 100% punto propio' },
  { en: 'Boundary scenario · 100% B2B', es: 'Escenario límite · 100% B2B' },
  { en: 'Equivalent gross sales', es: 'Venta bruta equivalente' },
  { en: 'Simplified contribution', es: 'Contribución simplificada' },
  { en: 'Participant share of that contribution', es: 'Participación sobre esa contribución' },
  { en: 'Illustrative ROI on capital', es: 'ROI ilustrativo sobre capital' },
  { en: 'These two scenarios are illustrative boundaries derived exclusively from the batch economics snapshot and, when available, the active financial formula. They do not assume a channel mix or replace settlement. Actual results are calculated using revenue, taxes, production costs, commercial costs and adjustments actually recorded for the batch; each allocation retains the formula version applicable when it is created.', es: 'Estos dos escenarios son límites ilustrativos derivados exclusivamente del snapshot económico del lote y, cuando existe, de la fórmula financiera activa. No presuponen una mezcla de canales ni reemplazan la liquidación. El resultado real se calcula con ingresos, impuestos, costos de producción, costos comerciales y ajustes efectivamente registrados para el lote; cada allocation conserva la versión de fórmula que le corresponda al momento de su creación.' },
  { en: 'Scenarios are estimates and do not constitute guaranteed returns. Actual settlement depends on sales, costs, taxes, adjustments and contractual rules effectively applicable to the batch and to the financial-formula version pinned to each allocation. See', es: 'Los escenarios son estimados y no constituyen una rentabilidad garantizada. La liquidación real depende de las ventas, costos, impuestos, ajustes y reglas contractuales efectivamente aplicables al lote y a la versión de fórmula financiera que quede fijada en cada allocation. Consulta' },
  { en: 'risks', es: 'riesgos' },
  { en: 'and', es: 'y' },
  { en: 'legal terms', es: 'condiciones legales' },
];

const enToEs = new Map(PAIRS.map(({ en, es }) => [en, es]));
const esToEn = new Map(PAIRS.map(({ en, es }) => [es, en]));
const english = new Set(PAIRS.map(({ en }) => en));
const spanish = new Set(PAIRS.map(({ es }) => es));

function preserveWhitespace(original: string, translated: string) {
  const trimmed = original.trim();
  const start = original.indexOf(trimmed);
  return `${original.slice(0, start)}${translated}${original.slice(start + trimmed.length)}`;
}

function translatePatterns(trimmed: string, locale: Locale): string | null {
  if (locale === 'en') {
    let match = trimmed.match(/^Economía unitaria · (.+)$/);
    if (match) return `Unit economics · ${match[1]}`;

    match = trimmed.match(/^Valores tomados del snapshot económico persistido del lote (.+)\. Los parámetros de otros lotes pueden ser distintos\.$/);
    if (match) return `Values are read from the persisted economics snapshot of batch ${match[1]}. Parameters for other batches may differ.`;

    match = trimmed.match(/^Publicidad · (.+) sobre base sin INC$/);
    if (match) return `Advertising · ${match[1]} on pre-INC base`;

    match = trimmed.match(/^Número de cajas · mínimo (\d+)$/);
    if (match) return `Number of cases · minimum ${match[1]}`;

    match = trimmed.match(/^(\d+) cajas · (\d+) botellas equivalentes$/);
    if (match) return `${match[1]} cases · ${match[2]} bottle equivalents`;

    match = trimmed.match(/^ROI ilustrativo: (.+)$/);
    if (match) return `Illustrative ROI: ${match[1]}`;
  } else {
    let match = trimmed.match(/^Unit economics · (.+)$/);
    if (match) return `Economía unitaria · ${match[1]}`;

    match = trimmed.match(/^Values are read from the persisted economics snapshot of batch (.+)\. Parameters for other batches may differ\.$/);
    if (match) return `Valores tomados del snapshot económico persistido del lote ${match[1]}. Los parámetros de otros lotes pueden ser distintos.`;

    match = trimmed.match(/^Advertising · (.+) on pre-INC base$/);
    if (match) return `Publicidad · ${match[1]} sobre base sin INC`;

    match = trimmed.match(/^Number of cases · minimum (\d+)$/);
    if (match) return `Número de cajas · mínimo ${match[1]}`;

    match = trimmed.match(/^(\d+) cases · (\d+) bottle equivalents$/);
    if (match) return `${match[1]} cajas · ${match[2]} botellas equivalentes`;

    match = trimmed.match(/^Illustrative ROI: (.+)$/);
    if (match) return `ROI ilustrativo: ${match[1]}`;
  }

  return null;
}

export function translateInvestmentEconomicsPhrase(value: string, locale: Locale): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (locale === 'es' && spanish.has(trimmed)) return value;
  if (locale === 'en' && english.has(trimmed)) return value;

  const exact = locale === 'es' ? enToEs.get(trimmed) : esToEn.get(trimmed);
  if (exact) return preserveWhitespace(value, exact);

  const patterned = translatePatterns(trimmed, locale);
  return patterned ? preserveWhitespace(value, patterned) : value;
}
