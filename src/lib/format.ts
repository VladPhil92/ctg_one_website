// Money is always stored/passed around as integer cents — this is the
// only place it gets formatted for display, to keep the conversion in
// one spot.
export function formatCents(cents: number, currency: string = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
