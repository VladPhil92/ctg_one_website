export type EcosystemProcess = {
  slug: string;
  labelEs: string;
  labelEn: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  stepsEs: string[];
  stepsEn: string[];
  businessUnitIds: string[];
  primaryHref?: string;
  primaryLabelEs?: string;
  primaryLabelEn?: string;
};

export const ECOSYSTEM_PROCESSES: EcosystemProcess[] = [
  {
    slug: 'ai',
    labelEs: 'Estrategia de IA',
    labelEn: 'AI Strategy',
    titleEs: 'IA gobernada por evidencia, datos y contexto operativo.',
    titleEn: 'AI governed by evidence, data, and operating context.',
    descriptionEs:
      'Esta capa concentra la estrategia de inteligencia artificial de CTG One: conocimiento contextual, evaluación reproducible, automatización y futuros agentes. La madurez pública se mantiene separada de la visión hasta que exista evidencia operativa suficiente.',
    descriptionEn:
      'This layer concentrates CTG One’s artificial-intelligence strategy: contextual knowledge, reproducible evaluation, automation, and future agents. Public maturity remains separate from vision until sufficient operating evidence exists.',
    stepsEs: ['Contexto y datos autorizados', 'Recuperación y razonamiento', 'Validación de evidencia', 'Automatización gobernada'],
    stepsEn: ['Authorized context and data', 'Retrieval and reasoning', 'Evidence validation', 'Governed automation'],
    businessUnitIds: [],
    primaryHref: '/ai',
    primaryLabelEs: 'Explorar plataforma de IA',
    primaryLabelEn: 'Explore AI platform',
  },
  {
    slug: 'commerce',
    labelEs: 'Comercio',
    labelEn: 'Commerce',
    titleEs: 'Procesos comerciales sin mezclar productos especializados.',
    titleEn: 'Commercial processes without mixing specialized products.',
    descriptionEs:
      'Comercio representa capacidades transversales de demanda, clientes, seguimiento, inventario y analítica. CTG Craft Beer Inversión se mantiene fuera de esta categoría para evitar confundir su proceso especializado con futuros servicios comerciales.',
    descriptionEn:
      'Commerce represents cross-cutting capabilities for demand, customers, follow-up, inventory, and analytics. CTG Craft Beer Investment remains outside this category so its specialized process is not confused with future commercial services.',
    stepsEs: ['Captura de demanda', 'Gestión comercial', 'Operación e inventario', 'Analítica y mejora'],
    stepsEn: ['Demand capture', 'Commercial management', 'Operations and inventory', 'Analytics and improvement'],
    businessUnitIds: ['realestate', 'gastrobar'],
  },
  {
    slug: 'hospitality',
    labelEs: 'Hospitalidad',
    labelEn: 'Hospitality',
    titleEs: 'Una capa de operación para huéspedes, reservas y servicios.',
    titleEn: 'An operating layer for guests, bookings, and services.',
    descriptionEs:
      'Hospitalidad agrupa los procesos de alojamiento y concierge donde identidad, reservas, solicitudes, proveedores y experiencia del huésped pueden converger sobre infraestructura compartida.',
    descriptionEn:
      'Hospitality groups lodging and concierge processes where identity, bookings, requests, providers, and guest experience can converge on shared infrastructure.',
    stepsEs: ['Reserva o solicitud', 'Perfil de huésped', 'Orquestación del servicio', 'Seguimiento operativo'],
    stepsEn: ['Booking or request', 'Guest profile', 'Service orchestration', 'Operating follow-up'],
    businessUnitIds: ['hospitality', 'guestlogistics'],
  },
  {
    slug: 'education',
    labelEs: 'Educación',
    labelEn: 'Education',
    titleEs: 'Datos académicos y seguimiento como proceso continuo.',
    titleEn: 'Academic data and tracking as a continuous process.',
    descriptionEs:
      'Educación organiza el flujo entre estudiantes, contenidos, progreso, seguimiento y comunicación. La plataforma académica compartida sigue como arquitectura objetivo hasta contar con implementación verificable.',
    descriptionEn:
      'Education organizes the flow between students, content, progress, tracking, and communication. The shared academic platform remains target architecture until implementation is verifiable.',
    stepsEs: ['Perfil académico', 'Plan y contenidos', 'Seguimiento de progreso', 'Analítica educativa'],
    stepsEn: ['Academic profile', 'Plan and content', 'Progress tracking', 'Learning analytics'],
    businessUnitIds: ['education'],
  },
  {
    slug: 'health',
    labelEs: 'Salud',
    labelEn: 'Health',
    titleEs: 'Procesos de atención con privacidad y trazabilidad.',
    titleEn: 'Care processes with privacy and traceability.',
    descriptionEs:
      'Salud agrupa contextos clínicos y veterinarios donde agenda, identidad, atención y datos sensibles requieren controles específicos. Cada producto conserva su propia madurez y alcance.',
    descriptionEn:
      'Health groups clinical and veterinary contexts where scheduling, identity, care, and sensitive data require specific controls. Each product retains its own maturity and scope.',
    stepsEs: ['Solicitud o agenda', 'Identidad y contexto', 'Prestación del servicio', 'Registro y seguimiento'],
    stepsEn: ['Request or scheduling', 'Identity and context', 'Service delivery', 'Record and follow-up'],
    businessUnitIds: ['veterinary', 'dental'],
  },
  {
    slug: 'legal',
    labelEs: 'Legal',
    labelEn: 'Legal',
    titleEs: 'Expedientes, documentos y conocimiento jurídico trazable.',
    titleEn: 'Traceable matters, documents, and legal knowledge.',
    descriptionEs:
      'Legal modela expedientes, documentos, tareas y conocimiento como flujos estructurados. Automatización documental e IA jurídica permanecen sujetas a su evidencia de implementación.',
    descriptionEn:
      'Legal models matters, documents, tasks, and knowledge as structured workflows. Document automation and legal AI remain subject to implementation evidence.',
    stepsEs: ['Apertura del asunto', 'Documentos y tareas', 'Seguimiento del expediente', 'Cierre y conocimiento reutilizable'],
    stepsEn: ['Matter intake', 'Documents and tasks', 'Matter tracking', 'Closure and reusable knowledge'],
    businessUnitIds: ['legal'],
  },
  {
    slug: 'beer',
    labelEs: 'Cerveza',
    labelEn: 'Craft Beer',
    titleEs: 'Capital, producción física, inventario y liquidación en un solo proceso.',
    titleEn: 'Capital, physical production, inventory, and settlement in one process.',
    descriptionEs:
      'Cerveza identifica específicamente el caso CTG Craft Beer y su plataforma de inversión por lotes. El flujo conecta financiación, producción, inventario, ventas y liquidación con trazabilidad transaccional, manteniendo la plataforma en beta controlada mientras los accesos públicos permanecen restringidos.',
    descriptionEn:
      'Craft Beer specifically identifies the CTG Craft Beer case and its batch-investment platform. The flow connects funding, production, inventory, sales, and settlement with transactional traceability while the platform remains in controlled beta and public access stays restricted.',
    stepsEs: ['Financiación del lote', 'Producción y embotellado', 'Inventario y ventas', 'Liquidación y trazabilidad'],
    stepsEn: ['Batch funding', 'Production and bottling', 'Inventory and sales', 'Settlement and traceability'],
    businessUnitIds: ['craftbeer'],
    primaryHref: '/inversion',
    primaryLabelEs: 'Abrir CTG Craft Beer Inversión',
    primaryLabelEn: 'Open CTG Craft Beer Investment',
  },
  {
    slug: 'fintech',
    labelEs: 'Fintech',
    labelEn: 'Fintech',
    titleEs: 'Originación y trazabilidad financiera con controles explícitos.',
    titleEn: 'Financial origination and traceability with explicit controls.',
    descriptionEs:
      'Fintech representa procesos financieros como originación, expediente, elegibilidad, seguridad y trazabilidad. Las capacidades de scoring o automatización financiera solo se presentan según su estado real de implementación.',
    descriptionEn:
      'Fintech represents financial processes such as origination, case files, eligibility, security, and traceability. Scoring or financial automation capabilities are presented only according to their actual implementation state.',
    stepsEs: ['Solicitud', 'Expediente y elegibilidad', 'Validación y decisión', 'Seguimiento trazable'],
    stepsEn: ['Application', 'Case file and eligibility', 'Validation and decision', 'Traceable follow-up'],
    businessUnitIds: ['credits'],
  },
];

export function getEcosystemProcess(slug: string) {
  return ECOSYSTEM_PROCESSES.find((process) => process.slug === slug);
}
