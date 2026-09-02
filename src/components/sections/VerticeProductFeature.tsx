'use client';

import React from 'react';
import { ArrowUpRight, BarChart3, Landmark, Network, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';

const VERTICE_URL = 'https://vertice.ctgone.com';

export const VerticeProductFeature: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const capabilities = [
    {
      icon: Landmark,
      title: es ? 'Participación ciudadana' : 'Civic participation',
      copy: es ? 'Reportes, propuestas, deliberación y seguimiento desde una sola experiencia.' : 'Reports, proposals, deliberation and follow-up in one experience.',
    },
    {
      icon: BarChart3,
      title: es ? 'Inteligencia cívica' : 'Civic intelligence',
      copy: es ? 'Datos, reputación y visualizaciones para convertir actividad ciudadana en evidencia.' : 'Data, reputation and visualizations that turn civic activity into evidence.',
    },
    {
      icon: ShieldCheck,
      title: es ? 'Identidad y confianza' : 'Identity and trust',
      copy: es ? 'Capas de identidad verificable y trazabilidad diseñadas para participación responsable.' : 'Verifiable identity and traceability layers designed for responsible participation.',
    },
  ];

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#07152f] py-20 text-white sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(245,183,0,.16),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(74,144,226,.16),transparent_34%)]" aria-hidden="true" />
      <Container size="large">
        <FadeInSection>
          <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F5B700]/25 bg-[#F5B700]/[0.07] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F5B700]">
                <Network size={14} aria-hidden="true" /> CTG One Connected App · Beta
              </div>
              <h2 className="font-outfit text-4xl font-semibold leading-[1.01] tracking-[-0.045em] sm:text-5xl md:text-6xl">
                VÉRTICE OS
              </h2>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#8FB9F0]">
                {es ? 'Inteligencia ciudadana' : 'Civic intelligence'}
              </p>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                {es
                  ? 'VÉRTICE OS es la plataforma cívica conectada de CTG One: infraestructura digital para informar, participar, proponer, vigilar y seguir resultados con datos y trazabilidad.'
                  : 'VÉRTICE OS is CTG One’s connected civic platform: digital infrastructure to inform, participate, propose, oversee and follow results with data and traceability.'}
              </p>
              <a
                href={VERTICE_URL}
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5B700] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[#07152f] transition hover:-translate-y-0.5 hover:bg-[#FFD044]"
              >
                {es ? 'Abrir VÉRTICE' : 'Open VÉRTICE'}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>

            <div className="rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">VÉRTICE / CIVIC OS</p>
                  <p className="mt-2 font-outfit text-xl font-semibold">{es ? 'Infraestructura cívica conectada' : 'Connected civic infrastructure'}</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#F5B700]/25 bg-[#F5B700]/[0.08] text-[#F5B700]">
                  <Landmark size={19} aria-hidden="true" />
                </span>
              </div>

              <div className="grid gap-3">
                {capabilities.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="rounded-2xl border border-white/[0.07] bg-black/10 p-5">
                    <div className="flex gap-4">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#8FB9F0]">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{title}</h3>
                        <p className="mt-1.5 text-xs leading-5 text-white/45">{copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[10px] leading-5 text-white/35">
                {es
                  ? 'La integración de identidad entre CTG One y VÉRTICE se despliega por fases; las sesiones permanecen aisladas hasta completar la federación segura.'
                  : 'Identity integration between CTG One and VÉRTICE is being deployed in phases; sessions remain isolated until secure federation is completed.'}
              </p>
            </div>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
