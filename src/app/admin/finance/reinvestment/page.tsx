import { FinanceReinvestmentQueue } from '@/components/inversion/FinanceReinvestmentQueue';

export default function FinanceReinvestmentQueuePage() {
  return (
    <div className="space-y-7">
      <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
        <p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Finance OS</p>
        <h1 className="text-3xl sm:text-5xl font-outfit font-semibold">Reinvestment Rail</h1>
        <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Cola operacional para convertir saldo liquidado en nuevas asignaciones sin alterar la intención económica registrada por el participante.</p>
      </header>
      <FinanceReinvestmentQueue />
    </div>
  );
}
