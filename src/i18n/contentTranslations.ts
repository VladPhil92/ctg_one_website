import type { Locale } from './translations';

type Pair = { en: string; es: string };

const PAIRS: Pair[] = [
  { en: 'We build applications, platforms, and digital products around the real operational needs of our business units.', es: 'Construimos aplicaciones, plataformas y productos digitales a partir de las necesidades operativas reales de nuestras unidades de negocio.' },
  { en: 'We develop intelligent agents, automated workflows, and decision-support systems that improve execution across the ecosystem.', es: 'Desarrollamos agentes inteligentes, flujos automatizados y sistemas de apoyo a decisiones que mejoran la ejecución en todo el ecosistema.' },
  { en: 'Identity, data, payments, integrations, security, and reusable technology services are designed as a common layer for the ecosystem.', es: 'Identidad, datos, pagos, integraciones, seguridad y servicios tecnológicos reutilizables se diseñan como una capa común para el ecosistema.' },
  { en: 'Technology is built alongside real operations, allowing us to move from problem identification to production deployment with direct feedback.', es: 'La tecnología se construye junto a operaciones reales, lo que nos permite pasar de la identificación del problema al despliegue en producción con retroalimentación directa.' },
  { en: 'We measure how our systems perform inside the businesses and use operational data to refine products, automation, and infrastructure over time.', es: 'Medimos el desempeño de nuestros sistemas dentro de los negocios y usamos datos operativos para perfeccionar productos, automatización e infraestructura de manera continua.' },
  { en: 'Web applications, internal platforms, operational systems, APIs, and digital products engineered for the companies in the CTG One ecosystem.', es: 'Aplicaciones web, plataformas internas, sistemas operativos, APIs y productos digitales diseñados para las empresas del ecosistema CTG One.' },
  { en: 'AI agents, workflow automation, intelligent assistance, and process orchestration designed to reduce friction and improve execution across our operations.', es: 'Agentes de IA, automatización de flujos, asistencia inteligente y orquestación de procesos diseñados para reducir fricción y mejorar la ejecución en nuestras operaciones.' },
  { en: 'Shared architecture for identity, databases, integrations, analytics, payments, security, cloud services, and reusable components across business units.', es: 'Arquitectura compartida para identidad, bases de datos, integraciones, analítica, pagos, seguridad, servicios en la nube y componentes reutilizables entre unidades de negocio.' },
  { en: 'We turn operating needs from hospitality, education, real estate, finance, food, healthcare, and other units into technology products deployed inside the ecosystem.', es: 'Convertimos necesidades operativas de hospitalidad, educación, bienes raíces, finanzas, gastronomía, salud y otras unidades en productos tecnológicos desplegados dentro del ecosistema.' },

  { en: 'Private tutoring in all academic subjects, plus music, dance, and art courses.', es: 'Tutorías privadas en todas las áreas académicas, además de cursos de música, danza y arte.' },
  { en: 'Lodging management in Cartagena and Santa Marta. Hotel Mirador del Castillo (25 rooms) and Apartaestudio 2E.', es: 'Gestión de alojamiento en Cartagena y Santa Marta. Hotel Mirador del Castillo (25 habitaciones) y Apartaestudio 2E.' },
  { en: 'High-end property sales and rentals. Specialized advice for wealth investment and premium housing.', es: 'Venta y arriendo de propiedades de alta gama. Asesoría especializada para inversión patrimonial y vivienda premium.' },
  { en: 'Core technology: proprietary software, AI systems, automation, applications, shared digital infrastructure, CTG One Token, and fintech platforms for the ecosystem.', es: 'Núcleo tecnológico: software propietario, sistemas de IA, automatización, aplicaciones, infraestructura digital compartida, CTG One Token y plataformas fintech para el ecosistema.' },
  { en: 'On-demand veterinary home-visit marketplace for Cartagena. Connects pet owners with verified veterinarians for house calls, with integrated booking and secure split payments.', es: 'Marketplace de servicios veterinarios a domicilio bajo demanda en Cartagena. Conecta propietarios de mascotas con veterinarios verificados, con reservas integradas y pagos divididos de forma segura.' },
  { en: 'Comprehensive dental care based in Sincelejo. Clinical oral health services.', es: 'Atención odontológica integral con sede en Sincelejo. Servicios clínicos de salud oral.' },
  { en: 'Conciliation, legal advice, and trademark registration.', es: 'Conciliación, asesoría jurídica y registro de marcas.' },
  { en: 'Corporate image, branding, and digital marketing. In-house design and marketing team.', es: 'Imagen corporativa, branding y marketing digital. Equipo interno de diseño y mercadeo.' },
  { en: 'Payroll loans for pensioners (Colpensiones, Casur, Cremil, Fiduprevisora) and MEN teachers. Credit app in development.', es: 'Créditos por libranza para pensionados (Colpensiones, Casur, Cremil, Fiduprevisora) y docentes del MEN. Aplicación de crédito en desarrollo.' },
  { en: '"La Casa del Patacón" — casual dining gastrobar in Cartagena with Caribbean identity.', es: '“La Casa del Patacón” — gastrobar de cocina casual en Cartagena con identidad caribeña.' },
  { en: 'Artisanal craft beer brewed in Cartagena — "Cerveza Artesanal" for the ecosystem\'s hospitality venues.', es: 'Cerveza artesanal elaborada en Cartagena para los establecimientos de hospitalidad del ecosistema.' },
  { en: 'SaaS concierge platform coordinating guest logistics, bookings, and services across the hospitality ecosystem.', es: 'Plataforma SaaS de concierge que coordina logística de huéspedes, reservas y servicios en todo el ecosistema de hospitalidad.' },

  { en: 'A loyalty program for people who already trust the ecosystem. Earn recognition for the relationships you build with us, and redeem it across every business unit.', es: 'Un programa de lealtad para quienes ya confían en el ecosistema. Obtén reconocimiento por la relación que construyes con nosotros y redímelo en cualquiera de nuestras unidades de negocio.' },
  { en: 'Every purchase or service you use across CTG One\'s business units adds recognition points to your account.', es: 'Cada compra o servicio que utilices en las unidades de CTG One suma puntos de reconocimiento a tu cuenta.' },
  { en: 'Introduce real clients to any unit in the ecosystem and receive recognition once the relationship is confirmed.', es: 'Refiere clientes reales a cualquier unidad del ecosistema y recibe reconocimiento una vez se confirme la relación comercial.' },
  { en: 'Exchange your accumulated points for products, services, and experiences from any CTG One business unit.', es: 'Canjea tus puntos acumulados por productos, servicios y experiencias de cualquier unidad de negocio de CTG One.' },
  { en: 'As your engagement grows, you move through membership tiers that unlock additional perks and priority access to services.', es: 'A medida que aumenta tu participación, avanzas por niveles de membresía que desbloquean beneficios adicionales y acceso prioritario a servicios.' },

  { en: 'CTG One Token (CTGO) is the utility token connecting all twelve business units. Part of our fintech vision and tokenization strategy — real utility, real value.', es: 'CTG One Token (CTGO) es el token de utilidad que conecta las doce unidades de negocio. Forma parte de nuestra visión fintech y estrategia de tokenización: utilidad real, valor real.' },
  { en: 'Community input on ecosystem benefits and promotions', es: 'Participación de la comunidad en beneficios y promociones del ecosistema' },
  { en: 'Ecosystem Fund', es: 'Fondo del ecosistema' },
  { en: 'Team & Advisors', es: 'Equipo y asesores' },
  { en: 'Reserves', es: 'Reservas' },
  { en: 'Liquidity', es: 'Liquidez' },

  { en: 'Software, AI & infrastructure for our own business ecosystem.', es: 'Software, IA e infraestructura para nuestro propio ecosistema empresarial.' },
  { en: 'Company', es: 'Compañía' },
  { en: 'Solutions', es: 'Soluciones' },
  { en: 'Resources', es: 'Recursos' },
  { en: 'Legal', es: 'Legal' },
  { en: 'Team', es: 'Equipo' },
  { en: 'Careers', es: 'Trabaja con nosotros' },
  { en: 'Press', es: 'Prensa' },
  { en: 'Internal Platforms', es: 'Plataformas internas' },
  { en: 'Documentation', es: 'Documentación' },
  { en: 'Whitepaper', es: 'Documento técnico' },
  { en: 'Blog', es: 'Blog' },
  { en: 'Support', es: 'Soporte' },
  { en: 'Privacy Policy', es: 'Política de privacidad' },
  { en: 'Terms of Service', es: 'Términos de servicio' },
  { en: 'Cookie Policy', es: 'Política de cookies' },
  { en: 'All rights reserved.', es: 'Todos los derechos reservados.' },
];

const enToEs = new Map(PAIRS.map(({ en, es }) => [en, es]));
const esToEn = new Map(PAIRS.map(({ en, es }) => [es, en]));
const english = new Set(PAIRS.map(({ en }) => en));
const spanish = new Set(PAIRS.map(({ es }) => es));

export function translateContentPhrase(value: string, locale: Locale): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (locale === 'es' && spanish.has(trimmed)) return value;
  if (locale === 'en' && english.has(trimmed)) return value;
  const translated = locale === 'es' ? enToEs.get(trimmed) : esToEn.get(trimmed);
  if (!translated) return value;
  const start = value.indexOf(trimmed);
  return `${value.slice(0, start)}${translated}${value.slice(start + trimmed.length)}`;
}
