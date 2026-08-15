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
      className="p-6 rounded-lg border h-full"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: highlight ? 'var(--accent)' : 'var(--border)',
      }}
    >
      <p className="text-2xl font-outfit font-semibold text-white mb-1">{value}</p>
      <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-dim)' }}>
        {label}
      </p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block transition-opacity duration-300 hover:opacity-80">
        {content}
      </a>
    );
  }

  return content;
};
