import { JPValderramaFooter, JPValderramaHeader } from '@/components/jpvalderrama/JPValderramaShell';
import { EducationCampusClient } from '@/components/jpvalderrama/EducationCampusClient';

export default function EducationCampusPage() {
  return (
    <main className="min-h-screen bg-[#f7f0e7] text-[#19130f] selection:bg-[#6f0d12] selection:text-[#fffaf2]">
      <a href="#contenido" className="sr-only z-[100] rounded bg-[#6f0d12] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <JPValderramaHeader active="campus" />
      <div id="contenido">
        <EducationCampusClient />
      </div>
      <JPValderramaFooter />
    </main>
  );
}
