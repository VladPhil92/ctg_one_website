import type { Locale } from './translations';

type Pair = { en: string; es: string };

const PAIRS: Pair[] = [
  { en: 'Review available batches, their styles, quantities and conditions.', es: 'Revisa los lotes disponibles, sus estilos, cantidades y condiciones.' },
  { en: 'Choose how much to participate and confirm your contribution securely.', es: 'Elige cuánto participar y confirma tu aporte de forma segura.' },
  { en: 'Follow the batch from brewing through packaging.', es: 'Observa el avance del lote desde la elaboración hasta el envasado.' },
  { en: 'Review commercialization through owned locations and the B2B channel.', es: 'Consulta la comercialización en puntos propios y canal B2B.' },
  { en: 'Review revenue, costs, taxes and the final batch result.', es: 'Revisa ingresos, costos, impuestos y resultado final del lote.' },
  { en: 'Decide what to do with your available balance when the process ends.', es: 'Decide qué hacer con tu saldo disponible al finalizar el proceso.' },
  { en: 'The platform connects to a real brewing operation. These styles currently represent the product portfolio that may form part of batches managed through the program.', es: 'La plataforma se conecta con una operación cervecera real. Estos son estilos actualmente representativos del portafolio de producto que puede formar parte de los lotes administrados por el programa.' },
  { en: 'The composition, quantities, costs, availability and economic terms of each batch are disclosed individually in its corresponding record. The presence of a style in this portfolio does not mean it is available in every batch.', es: 'La composición de cada lote, cantidades, costos, disponibilidad y condiciones económicas se informan de manera individual en la ficha correspondiente. La presencia de un estilo en este portafolio no implica que esté disponible en todos los lotes.' },
  { en: 'See all batches', es: 'Ver todos los lotes' },
  { en: 'No batches have been published yet. This program is currently in closed beta.', es: 'Aún no hay lotes publicados. Este programa se encuentra en fase de beta cerrada.' },
  { en: 'Would you like to estimate a participation?', es: '¿Quieres estimar una participación?' },
  { en: 'Use the simulator to see, with illustrative figures, how your participation in a batch could perform. It does not constitute guaranteed returns.', es: 'Usa el simulador para ver, con cifras ilustrativas, cómo se comportaría tu participación en un lote. No constituye una rentabilidad garantizada.' },

  { en: 'Unit economics', es: 'Economía unitaria' },
  { en: 'The channel defines the', es: 'El canal define la' },
  { en: 'opportunity', es: 'oportunidad' },
  { en: 'The same bottle has a very different economic contribution depending on the sales channel. The following values reflect the current commercial parameters provided for the program.', es: 'La misma botella tiene una contribución económica muy distinta según el canal de comercialización. Los valores siguientes reflejan los parámetros comerciales actuales suministrados para el programa.' },
  { en: 'Cost per bottle', es: 'Costo por botella' },
  { en: 'Production', es: 'Producción' },
  { en: 'Label', es: 'Etiqueta' },
  { en: 'Total unit cost', es: 'Costo total unitario' },
  { en: 'Owned locations', es: 'Puntos propios' },
  { en: 'Consumer price', es: 'Precio al consumidor' },
  { en: 'Pre-INC base', es: 'Base antes de INC' },
  { en: 'Advertising · 3.5% on pre-INC base', es: 'Publicidad · 3.5% sobre base sin INC' },
  { en: 'Estimated contribution / bottle', es: 'Contribución estimada / botella' },
  { en: 'Margin on final price', es: 'Margen sobre precio final' },
  { en: 'B2B channel', es: 'Canal B2B' },
  { en: 'Price to other restaurants', es: 'Precio a otros restaurantes' },
  { en: 'Margin on B2B price', es: 'Margen sobre precio B2B' },
  { en: 'Direct sales through owned locations concentrate the greatest economic potential.', es: 'La venta directa en puntos propios concentra el mayor potencial económico.' },
  { en: 'Illustrative calculation using the registered commercial parameters: production cost COP 6,000 + label COP 900; owned-location price COP 18,000 including 8% INC and 3.5% advertising calculated on the pre-INC price; B2B price COP 8,000. Actual batch settlement uses revenue, taxes and costs actually recorded.', es: 'Cálculo ilustrativo con los parámetros comerciales registrados: costo de producción $6.000 + etiqueta $900; precio en puntos propios $18.000 con INC del 8% incluido y 3,5% de publicidad calculado sobre el precio antes de INC; precio B2B $8.000. La liquidación real de un lote se realiza con ingresos, impuestos y costos efectivamente registrados.' },

  { en: 'Investment KYC status:', es: 'Estado KYC de inversión:' },
  { en: 'Not started', es: 'No iniciado' },
  { en: 'Under review', es: 'En revisión' },
  { en: 'Verified', es: 'Verificado' },
  { en: 'Rejected', es: 'Rechazado' },
  { en: 'Requires review', es: 'Requiere revisión' },
  { en: 'See batches', es: 'Ver lotes' },
  { en: 'Amount in COP', es: 'Monto en COP' },
  { en: 'Request', es: 'Solicitar' },
  { en: 'No requests yet.', es: 'Sin solicitudes todavía.' },
  { en: 'You do not have allocations yet. Public participation is not enabled yet (closed beta program).', es: 'Aún no tienes asignaciones. La participación pública todavía no está habilitada (programa en beta cerrada).' },

  { en: 'Complete your identity verification →', es: 'Completa tu verificación de identidad →' },
  { en: 'Resubmit your document →', es: 'Vuelve a enviar tu documento →' },
  { en: 'Review all your deposits and their review status', es: 'Revisa todas tus recargas y su estado de revisión' },
  { en: 'Purchase products and services from the ecosystem using your balance', es: 'Compra productos y servicios del ecosistema con tu saldo' },
  { en: 'In development - Available soon', es: 'En desarrollo - Disponible próximamente' },
  { en: 'Add funds', es: 'Recargar cuenta' },
  { en: 'Payment channels are being configured', es: 'Canales de pago en configuración' },
  { en: 'Top-ups are temporarily disabled. We will not display bank, PSE, Bre-B key or wallet information until it has been configured and verified for production.', es: 'Las recargas están temporalmente deshabilitadas. No mostraremos datos bancarios, PSE, Llave Bre-B o direcciones de wallet hasta que hayan sido configurados y verificados para producción.' },
  { en: 'Back to dashboard', es: 'Volver al panel' },
  { en: 'Top-ups are temporarily disabled while we configure payment channels.', es: 'Las recargas están temporalmente deshabilitadas mientras configuramos los canales de pago.' },

  { en: 'Create account', es: 'Crear cuenta' },
  { en: 'The registration service is not available yet. Please try again later.', es: 'El registro no está disponible todavía. Vuelve a intentarlo más tarde.' },
  { en: 'Enter your email', es: 'Ingresa tu correo electrónico' },
  { en: 'Enter your password', es: 'Ingresa tu contraseña' },
  { en: 'Forgot your password?', es: '¿Olvidaste tu contraseña?' },
  { en: 'Do not have an account?', es: '¿No tienes cuenta?' },
];

const enToEs = new Map(PAIRS.map(({ en, es }) => [en, es]));
const esToEn = new Map(PAIRS.map(({ en, es }) => [es, en]));
const english = new Set(PAIRS.map(({ en }) => en));
const spanish = new Set(PAIRS.map(({ es }) => es));

export function translateExtendedPhrase(value: string, locale: Locale): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (locale === 'es' && spanish.has(trimmed)) return value;
  if (locale === 'en' && english.has(trimmed)) return value;
  const translated = locale === 'es' ? enToEs.get(trimmed) : esToEn.get(trimmed);
  if (!translated) return value;
  const start = value.indexOf(trimmed);
  return `${value.slice(0, start)}${translated}${value.slice(start + trimmed.length)}`;
}
