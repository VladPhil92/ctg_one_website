export default function EducationOperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <nav aria-label="Operaciones educativas" className="fixed bottom-5 right-5 z-50 flex gap-1 rounded-2xl border border-white/10 bg-black/90 p-1.5 shadow-2xl backdrop-blur">
        <a href="/dashboard/educacion/operaciones" className="inline-flex min-h-10 items-center rounded-xl px-3 text-[9px] font-bold uppercase tracking-[.13em] text-white/65 hover:bg-white/[.06] hover:text-white">Conciliación</a>
        <a href="/dashboard/educacion/operaciones/ciclo" className="inline-flex min-h-10 items-center rounded-xl px-3 text-[9px] font-bold uppercase tracking-[.13em] text-white/65 hover:bg-white/[.06] hover:text-white">Ciclo de vida</a>
      </nav>
    </>
  );
}