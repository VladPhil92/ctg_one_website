export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#030303] px-4 pb-20 pt-24 text-white" aria-live="polite" aria-busy="true">
      <div className="mx-auto w-full max-w-7xl animate-pulse space-y-5">
        <div className="h-48 rounded-[26px] border border-white/[.08] bg-white/[.025]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[18px] border border-white/[.07] bg-white/[.02]" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
          <div className="h-72 rounded-[22px] border border-white/[.07] bg-white/[.02]" />
          <div className="h-72 rounded-[22px] border border-white/[.07] bg-white/[.02]" />
        </div>
        <span className="sr-only">Cargando CTG One Personal OS</span>
      </div>
    </div>
  );
}
