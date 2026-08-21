export type TechnologyStatus = 'LIVE' | 'PARTIAL' | 'IN DEVELOPMENT' | 'ROADMAP';

export type TechnologyCapability = {
  nameEs: string;
  nameEn: string;
  status: TechnologyStatus;
};

export type EcosystemTechnologyUnit = {
  id: string;
  name: string;
  icon: string;
  businessEs: string;
  businessEn: string;
  operatingProblemEs: string;
  operatingProblemEn: string;
  currentStateEs: string;
  currentStateEn: string;
  status: TechnologyStatus;
  capabilities: TechnologyCapability[];
  osModules: string[];
  href?: string;
};

export const ECOSYSTEM_TECHNOLOGY_UNITS: EcosystemTechnologyUnit[] = [
  {
    id: 'education',
    name: 'Valderrama International School',
    icon: 'valderrama',
    businessEs: 'Educación y tutorías',
    businessEn: 'Education and tutoring',
    operatingProblemEs: 'Centralizar estudiantes, progreso académico, contenidos, seguimiento y comunicación sin fragmentar la operación.',
    operatingProblemEn: 'Centralize students, academic progress, content, tracking, and communication without fragmenting operations.',
    currentStateEs: 'La unidad opera como negocio real, pero la plataforma académica compartida aún no está implementada como producto CTG One.',
    currentStateEn: 'The unit operates as a real business, but a shared academic platform has not yet been implemented as a CTG One product.',
    status: 'ROADMAP',
    capabilities: [
      { nameEs: 'Perfiles académicos', nameEn: 'Academic profiles', status: 'ROADMAP' },
      { nameEs: 'Analítica de aprendizaje', nameEn: 'Learning analytics', status: 'ROADMAP' },
      { nameEs: 'Asistencia educativa con IA', nameEn: 'AI-assisted education', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'AI', 'Analytics'],
  },
  {
    id: 'hospitality',
    name: 'CTG Suites',
    icon: 'hotel',
    businessEs: 'Hospitalidad y alojamiento',
    businessEn: 'Hospitality and lodging',
    operatingProblemEs: 'Unificar reservas, huéspedes, inventario operativo, incidencias y experiencia postventa.',
    operatingProblemEn: 'Unify bookings, guests, operating inventory, incidents, and post-stay experience.',
    currentStateEs: 'Existe operación hotelera, pero la capa tecnológica común de hospitalidad sigue pendiente de formalización.',
    currentStateEn: 'Hospitality operations exist, but the shared hospitality technology layer is still awaiting formalization.',
    status: 'ROADMAP',
    capabilities: [
      { nameEs: 'Reservas', nameEn: 'Bookings', status: 'ROADMAP' },
      { nameEs: 'Perfiles de huéspedes', nameEn: 'Guest profiles', status: 'ROADMAP' },
      { nameEs: 'Inteligencia operativa', nameEn: 'Operating intelligence', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'Automation', 'Analytics'],
  },
  {
    id: 'realestate',
    name: 'Bechara Real Estate',
    icon: 'bechara',
    businessEs: 'Bienes raíces',
    businessEn: 'Real estate',
    operatingProblemEs: 'Gestionar leads, propiedades, matching, seguimiento comercial y documentos de manera trazable.',
    operatingProblemEn: 'Manage leads, properties, matching, commercial follow-up, and documents with traceability.',
    currentStateEs: 'La operación comercial existe; CRM, matching y flujos documentales forman parte de la arquitectura objetivo.',
    currentStateEn: 'Commercial operations exist; CRM, matching, and document workflows remain part of the target architecture.',
    status: 'ROADMAP',
    capabilities: [
      { nameEs: 'CRM inmobiliario', nameEn: 'Real estate CRM', status: 'ROADMAP' },
      { nameEs: 'Matching de propiedades', nameEn: 'Property matching', status: 'ROADMAP' },
      { nameEs: 'Flujos documentales', nameEn: 'Document workflows', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'Automation', 'Documents'],
  },
  {
    id: 'tech',
    name: 'CTG One Technology',
    icon: 'ctgone',
    businessEs: 'Tecnología e infraestructura',
    businessEn: 'Technology and infrastructure',
    operatingProblemEs: 'Construir una capa tecnológica común que evite que cada unidad tenga que empezar desde cero.',
    operatingProblemEn: 'Build a shared technology layer so each business unit does not have to start from zero.',
    currentStateEs: 'Es la capa central actualmente operativa: software, identidad, datos, seguridad, CI/CD y arquitectura compartida.',
    currentStateEn: 'This is the currently operational core layer: software, identity, data, security, CI/CD, and shared architecture.',
    status: 'LIVE',
    capabilities: [
      { nameEs: 'Software y plataformas', nameEn: 'Software and platforms', status: 'LIVE' },
      { nameEs: 'Identidad y datos', nameEn: 'Identity and data', status: 'LIVE' },
      { nameEs: 'AI runtime', nameEn: 'AI runtime', status: 'IN DEVELOPMENT' },
    ],
    osModules: ['Identity', 'Data', 'Security', 'Infrastructure', 'AI'],
    href: '/services',
  },
  {
    id: 'veterinary',
    name: 'Nvet Care',
    icon: 'nvetcare',
    businessEs: 'Marketplace veterinario',
    businessEn: 'Veterinary marketplace',
    operatingProblemEs: 'Coordinar demanda, disponibilidad profesional, agenda, despacho y pagos de servicios domiciliarios.',
    operatingProblemEn: 'Coordinate demand, professional availability, scheduling, dispatch, and payments for home visits.',
    currentStateEs: 'Producto en desarrollo con arquitectura orientada a marketplace, agenda, despacho y pagos.',
    currentStateEn: 'Product in development with marketplace, scheduling, dispatch, and payments as the target architecture.',
    status: 'IN DEVELOPMENT',
    capabilities: [
      { nameEs: 'Marketplace', nameEn: 'Marketplace', status: 'IN DEVELOPMENT' },
      { nameEs: 'Agenda y despacho', nameEn: 'Scheduling and dispatch', status: 'IN DEVELOPMENT' },
      { nameEs: 'Pagos integrados', nameEn: 'Integrated payments', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'Payments', 'Automation'],
  },
  {
    id: 'dental',
    name: 'Oralgreen',
    icon: 'oralgreen',
    businessEs: 'Odontología',
    businessEn: 'Dental care',
    operatingProblemEs: 'Digitalizar agenda, pacientes, historia operativa y experiencia de servicio manteniendo privacidad clínica.',
    operatingProblemEn: 'Digitize scheduling, patients, operational records, and service experience while preserving clinical privacy.',
    currentStateEs: 'La operación clínica existe; la plataforma tecnológica específica aún debe definirse y priorizarse.',
    currentStateEn: 'Clinical operations exist; the dedicated technology platform still needs to be defined and prioritized.',
    status: 'ROADMAP',
    capabilities: [
      { nameEs: 'Agenda clínica', nameEn: 'Clinical scheduling', status: 'ROADMAP' },
      { nameEs: 'Perfil de paciente', nameEn: 'Patient profile', status: 'ROADMAP' },
      { nameEs: 'Flujos de atención', nameEn: 'Care workflows', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'Security', 'Automation'],
  },
  {
    id: 'legal',
    name: 'Legalyst Consultores',
    icon: 'scale',
    businessEs: 'Servicios jurídicos',
    businessEn: 'Legal services',
    operatingProblemEs: 'Controlar expedientes, documentos, tareas, trazabilidad y conocimiento jurídico sin dispersión.',
    operatingProblemEn: 'Control matters, documents, tasks, traceability, and legal knowledge without fragmentation.',
    currentStateEs: 'Los servicios operan; automatización documental y asistencia jurídica siguen como oportunidades de producto.',
    currentStateEn: 'Services operate today; document automation and legal assistance remain product opportunities.',
    status: 'ROADMAP',
    capabilities: [
      { nameEs: 'Expedientes digitales', nameEn: 'Digital matters', status: 'ROADMAP' },
      { nameEs: 'Automatización documental', nameEn: 'Document automation', status: 'ROADMAP' },
      { nameEs: 'Asistencia jurídica con IA', nameEn: 'AI legal assistance', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Documents', 'Automation', 'AI'],
  },
  {
    id: 'credits',
    name: 'Vantage Libranza Plus',
    icon: 'wallet',
    businessEs: 'Crédito por libranza',
    businessEn: 'Payroll lending',
    operatingProblemEs: 'Estructurar originación, expediente, elegibilidad, seguimiento y trazabilidad de solicitudes.',
    operatingProblemEn: 'Structure origination, case files, eligibility, follow-up, and request traceability.',
    currentStateEs: 'La arquitectura de producto está en desarrollo; scoring y automatización financiera no se presentan como productivos.',
    currentStateEn: 'Product architecture is in development; scoring and financial automation are not presented as production capabilities.',
    status: 'IN DEVELOPMENT',
    capabilities: [
      { nameEs: 'Originación', nameEn: 'Origination', status: 'IN DEVELOPMENT' },
      { nameEs: 'Expediente digital', nameEn: 'Digital case file', status: 'IN DEVELOPMENT' },
      { nameEs: 'Scoring', nameEn: 'Scoring', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'Documents', 'Security'],
  },
  {
    id: 'gastrobar',
    name: 'PISÁO Gastrobar',
    icon: 'pisao',
    businessEs: 'Restaurante y gastrobar',
    businessEn: 'Restaurant and gastrobar',
    operatingProblemEs: 'Conectar presencia digital, demanda, clientes, inventario y analítica comercial con la operación física.',
    operatingProblemEn: 'Connect digital presence, demand, customers, inventory, and commercial analytics with physical operations.',
    currentStateEs: 'Existe presencia digital operativa; inventario, loyalty y analítica compartida aún no están consolidados en CTG One OS.',
    currentStateEn: 'Operational digital presence exists; inventory, loyalty, and shared analytics are not yet consolidated in CTG One OS.',
    status: 'PARTIAL',
    capabilities: [
      { nameEs: 'Presencia digital', nameEn: 'Digital presence', status: 'LIVE' },
      { nameEs: 'Loyalty compartido', nameEn: 'Shared loyalty', status: 'ROADMAP' },
      { nameEs: 'Analítica de demanda', nameEn: 'Demand analytics', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Rewards', 'Analytics', 'Inventory'],
  },
  {
    id: 'craftbeer',
    name: 'CTG Craft Beer',
    icon: 'craftbeer',
    businessEs: 'Producción y comercialización de cerveza artesanal',
    businessEn: 'Craft beer production and commercialization',
    operatingProblemEs: 'Conectar capital, lotes físicos, producción, inventario, ventas y liquidaciones con trazabilidad transaccional.',
    operatingProblemEn: 'Connect capital, physical batches, production, inventory, sales, and settlements with transactional traceability.',
    currentStateEs: 'CTG Craft Beer Inversión es el caso de tecnología aplicada más completo del ecosistema, pero permanece en beta controlada y no se presenta como una plataforma de inversión pública abierta.',
    currentStateEn: 'CTG Craft Beer Investment is the ecosystem’s most complete applied technology case, but it remains a controlled beta and is not presented as an open public investment platform.',
    status: 'PARTIAL',
    capabilities: [
      { nameEs: 'Lotes e inventario', nameEn: 'Batches and inventory', status: 'PARTIAL' },
      { nameEs: 'Ledger y asignaciones', nameEn: 'Ledger and allocations', status: 'PARTIAL' },
      { nameEs: 'Liquidaciones automáticas', nameEn: 'Automatic settlements', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'Transactions', 'Security', 'Inventory'],
    href: '/inversion',
  },
  {
    id: 'guestlogistics',
    name: 'Guest Logistics Concierge',
    icon: 'guestlogistics',
    businessEs: 'Concierge y logística de huéspedes',
    businessEn: 'Guest concierge and logistics',
    operatingProblemEs: 'Orquestar solicitudes, proveedores, reservas y comunicación de huéspedes desde un flujo único.',
    operatingProblemEn: 'Orchestrate guest requests, providers, bookings, and communication from a single workflow.',
    currentStateEs: 'Producto en construcción orientado a concierge digital y orquestación de servicios.',
    currentStateEn: 'Product under development focused on digital concierge and service orchestration.',
    status: 'IN DEVELOPMENT',
    capabilities: [
      { nameEs: 'Perfiles de huéspedes', nameEn: 'Guest profiles', status: 'IN DEVELOPMENT' },
      { nameEs: 'Orquestación de servicios', nameEn: 'Service orchestration', status: 'IN DEVELOPMENT' },
      { nameEs: 'Automatización concierge', nameEn: 'Concierge automation', status: 'ROADMAP' },
    ],
    osModules: ['Identity', 'Data', 'Automation', 'Integrations'],
  },
];

export const CTG_ONE_OS_MODULES = [
  'Identity',
  'Data',
  'Security',
  'Transactions',
  'Automation',
  'Integrations',
  'Rewards',
  'Inventory',
  'Analytics',
  'Documents',
  'AI',
  'Infrastructure',
] as const;
