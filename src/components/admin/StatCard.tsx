import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, href, highlight }) => {
  const content = (
    <div
      className="group relative h-full overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all duration-300"
      style={{
        background: highlight
          ? 'linear-gradient(145deg, rgba(201,169,98,.10), rgba(255,255,255,.018))'
          : 'linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.012))',
        borderColor: highlight ? 'rgba(201,169,98,.32)' : 'rgba(255,255,255,.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.025), 0 16px 40px rgba(0,0,0,.16)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="text-[8px] font-mono tracking-[.16em] text-text-dim">LIVE</span>
        <span className={`h-1.5 w-1.5 rounded-full ${highlight ? 'bg-accent shadow-[0_0_12px_rgba(201,169,98,.75)]' : 'bg-white/20'}`} />
      </div>
      <p className="text-2xl sm:text-3xl font-outfit font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[9px] uppercase tracking-[0.15em] text-text-dim">{label}</p>
      {href && <p className="mt-5 text-[8px] uppercase tracking-[.14em] text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">Abrir detalle →</p>}
    </div>
  );

  if (href) {
    return <a href={href} className="block h-full hover:-translate-y-0.5 transition-transform duration-300">{content}</a>;
  }

  return content;
};
