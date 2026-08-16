'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2, Cpu, Home, Palette, Scale, Wallet, ArrowUpRight, type LucideIcon } from 'lucide-react';

type Status = 'LIVE' | 'PARTIAL' | 'IN DEVELOPMENT' | 'ROADMAP';

type Unit = {
  name: string;
  icon: string;
  focusEs: string;
  focusEn: string;
  status: Status;
  href?: string;
};

const iconMap: Record<string, React.ReactNode> = {
  hotel: <Building2 size={24} strokeWidth={1.5} />,
  building: <Home size={24} strokeWidth={1.5} />,
  cpu: <Cpu size={24} strokeWidth={1.5} />,
  nvetcare: <Image src="/images/logo/nvet-care-icon.png" alt="Nvet Care" width={46} height={36} className="object-contain" />,
  valderrama: <Image src="/images/logo/valderrama-icon.png" alt="Valderrama International School" width={31} height={36} className="object-contain" />,
  bechara: <Image src="/images/logo/bechara-icon.png" alt="Bechara Real Estate" width={26} height={36} className="object-contain" />,
  ctgone: <Image src="/images/logo/ctg-one-coin-icon.png" alt="CTG One Technology" width={36} height={36} className="object-contain" />,
  pisao: <Image src="/images/logo/pisao-gastrobar-icon.png" alt="PISÁO Gastrobar" width={46} height={36} className="object-contain" />,
  craftbeer: <Image src="/images/logo/ctg-craft-beer-icon.png" alt="CTG Craft Beer" width={34} height={36} className="object-contain" />,
  guestlogistics: <Image src="/images/logo/guest-logistics-icon.png" alt="Guest Logistics Concierge" width={35} height={36} className="object-contain" />,
  oralgreen: <Image src="/images/logo/oralgreen-icon.png" alt="Oralgreen" width={50} height={30} className="object-contain" />,
  scale: <Scale size={24} strokeWidth={1.5} />,
  palette: <Palette size={24} strokeWidth={1.5} />,
  wallet: <Wallet size={24} strokeWidth={1.5} />,
};

const units: Unit[] = [
  { name: 'Valderrama International School', icon: 'valderrama', status: 'ROADMAP', focusEs: 'Sistemas académicos, analítica de aprendizaje y asistencia educativa con IA como línea futura.', focusEn: 'Academic systems, learning analytics, and AI-assisted education as a future technology line.' },
  { name: 'CTG Suites', icon: 'hotel', status: 'ROADMAP', focusEs: 'Operación hotelera, reservas, perfiles de huéspedes e inteligencia operativa por formalizar.', focusEn: 'Hospitality operations, booking, guest profiles, and operating intelligence to be formalized.' },
  { name: 'Bechara Real Estate', icon: 'bechara', status: 'ROADMAP', focusEs: 'CRM, matching de propiedades, leads y flujos documentales como arquitectura objetivo.', focusEn: 'CRM, property matching, lead intelligence, and document workflows as target architecture.' },
  { name: 'CTG One Technology', icon: 'ctgone', status: 'LIVE', focusEs: 'Capa central: software, identidad, datos, seguridad, CI/CD y arquitectura compartida.', focusEn: 'Core layer: software, identity, data, security, CI/CD, and shared architecture.', href: '/services' },
  { name: 'Nvet Care', icon: 'nvetcare', status: 'IN DEVELOPMENT', focusEs: 'Marketplace veterinario, agenda, despacho y pagos como producto en desarrollo.', focusEn: 'Veterinary marketplace, scheduling, dispatch, and payments as a product in development.' },
  { name: 'Oralgreen', icon: 'oralgreen', status: 'ROADMAP', focusEs: 'Digitalización clínica, agenda, historial y experiencia del paciente por definir técnicamente.', focusEn: 'Clinical digitization, scheduling, records, and patient experience awaiting technical definition.' },
  { name: 'Legalyst Consultores', icon: 'scale', status: 'ROADMAP', focusEs: 'Automatización documental, expedientes y asistencia jurídica como posibles líneas futuras.', focusEn: 'Document automation, matter management, and legal assistance as possible future lines.' },
  { name: 'CTG One Design', icon: 'palette', status: 'PARTIAL', focusEs: 'Sistema de diseño, activos de marca y componentes de interfaz reutilizados dentro del ecosistema.', focusEn: 'Design system, brand assets, and reusable interface components across the ecosystem.' },
  { name: 'Vantage Libranza Plus', icon: 'wallet', status: 'IN DEVELOPMENT', focusEs: 'Originación de crédito, expediente, scoring y flujo operativo de libranza en desarrollo.', focusEn: 'Credit origination, case files, scoring, and payroll-loan workflows in development.' },
  { name: 'PISÁO Gastrobar', icon: 'pisao', status: 'PARTIAL', focusEs: 'Presencia digital operativa; inventario, loyalty y analítica quedan como evolución tecnológica.', focusEn: 'Operational digital presence; inventory, loyalty, and analytics remain future evolution.' },
  { name: 'CTG Craft Beer', icon: 'craftbeer', status: 'LIVE', focusEs: 'Lotes, inventario, ledger, ventas y participación mediante CTG Craft Beer Inversión.', focusEn: 'Batches, inventory, ledger, sales, and participation through CTG Craft Beer Investment.', href: '/products' },
  { name: 'Guest Logistics Concierge', icon: 'guestlogistics', status: 'IN DEVELOPMENT', focusEs: 'Orquestación de servicios, perfiles de huéspedes y concierge digital como producto en construcción.', focusEn: 'Service orchestration, guest profiles, and digital concierge as a product under development.' },
];

const statusStyle: Record<Status, string> = {
  LIVE: 'border-accent/30 text-accent',
  PARTIAL: 'border-white/[0.10] text-text-secondary',
  'IN DEVELOPMENT': 'border-white/[0.08] text-text-dim',
  ROADMAP: 'border-white/[0.06] text-text-dim',
};

export const EcosystemSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <section id="ecosystem" className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden bg-bg-secondary">
      <div className="absolute inset-0 pointer-events-none opacity-[0.12]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      <Container className="relative z-10">
        <FadeInSection>
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-16 items-end mb-14 sm:mb-18 md:mb-20">
            <div>
              <Badge variant="accent" className="mb-6">{es ? 'Ecosistema · Laboratorios operativos' : 'Ecosystem · Operating laboratories'}</Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold tracking-[-0.035em] leading-[1.05]">
                <span className="text-white">{es ? 'Negocios reales.' : 'Real businesses.'}</span><br />
                <span className="text-accent">{es ? 'Madurez tecnológica visible.' : 'Visible technology maturity.'}</span>
              </h1>
            </div>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">
              {es
                ? 'Las doce unidades son entornos donde CTG One puede identificar problemas y construir tecnología, pero no todas poseen hoy el mismo nivel de implementación. Esta vista separa producto real, trabajo parcial, desarrollo activo y roadmap.'
                : 'The twelve units are environments where CTG One can identify problems and build technology, but they do not all have the same implementation maturity today. This view separates real product, partial work, active development, and roadmap.'}
            </p>
          </div>
        </FadeInSection>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {units.map((unit, index) => (
            <FadeInSection key={unit.name} delay={0.025 + index * 0.025}>
              <div className="group relative h-full min-h-[245px] p-6 sm:p-7 rounded-xl border border-white/[0.055] bg-black/20 hover:border-accent/20 transition-colors duration-500">
                <div className="flex items-start justify-between gap-4 mb-7">
                  <span className="text-accent flex items-center h-10">{iconMap[unit.icon]}</span>
                  <span className={`text-[7px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusStyle[unit.status]}`}>{unit.status}</span>
                </div>
                <h3 className="text-sm sm:text-base font-outfit font-medium text-white mb-3">{unit.name}</h3>
                <p className="text-[11px] sm:text-xs text-text-dim leading-relaxed">{es ? unit.focusEs : unit.focusEn}</p>
                {unit.href && (
                  <Link href={unit.href} className="absolute bottom-6 right-6 w-8 h-8 rounded-full border border-white/[0.07] flex items-center justify-center group-hover:border-accent/30 transition-colors">
                    <ArrowUpRight size={13} className="text-text-dim group-hover:text-accent" />
                  </Link>
                )}
              </div>
            </FadeInSection>
          ))}
        </div>
      </Container>
    </section>
  );
};
