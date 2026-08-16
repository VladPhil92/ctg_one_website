export type Locale = 'en' | 'es';

type Pair = { en: string; es: string };

// Manually curated terminology for CTG One. No runtime machine translation.
export const PHRASES: Pair[] = [
  { en: 'Home', es: 'Inicio' },
  { en: 'About', es: 'Nosotros' },
  { en: 'Technology', es: 'Tecnología' },
  { en: 'Ecosystem', es: 'Ecosistema' },
  { en: 'Investment', es: 'Inversión' },
  { en: 'Rewards', es: 'Recompensas' },
  { en: 'Contact', es: 'Contacto' },
  { en: 'Navigation', es: 'Navegación' },
  { en: 'Platforms', es: 'Plataformas' },
  { en: 'Privacy Policy', es: 'Política de privacidad' },
  { en: 'My Account', es: 'Mi Cuenta' },
  { en: 'Sign In', es: 'Iniciar Sesión' },
  { en: 'Create Account', es: 'Crear Cuenta' },
  { en: 'Sign out', es: 'Cerrar sesión' },
  { en: 'See more', es: 'Ver más' },
  { en: 'Loading...', es: 'Cargando...' },

  { en: 'Software, AI & Infrastructure', es: 'Software, IA e Infraestructura' },
  { en: 'Technology is infrastructure.', es: 'La tecnología es infraestructura.' },
  { en: 'Strategy is architecture.', es: 'La estrategia es arquitectura.' },
  { en: 'We build both for our own ecosystem.', es: 'Construimos ambas para nuestro propio ecosistema.' },
  { en: 'CTG One Technology is a technology company that builds software, AI systems, automation, and digital infrastructure for its own business ecosystem. We design, deploy, and operate the technology layer that powers our business units.', es: 'CTG One Technology es una empresa tecnológica que desarrolla software, sistemas de IA, automatización e infraestructura digital para su propio ecosistema empresarial. Diseñamos, desplegamos y operamos la capa tecnológica que impulsa nuestras unidades de negocio.' },
  { en: 'Explore Ecosystem', es: 'Explorar ecosistema' },
  { en: 'Start Conversation', es: 'Iniciar conversación' },
  { en: 'Business Units', es: 'Unidades de negocio' },
  { en: 'One', es: 'Una' },
  { en: 'Technology Layer', es: 'Capa tecnológica' },
  { en: 'One Technology Layer', es: 'Una capa tecnológica' },
  { en: 'Founded', es: 'Fundada' },
  { en: 'Headquarters', es: 'Sede principal' },

  { en: 'About CTG One', es: 'Sobre CTG One' },
  { en: 'Technology Built for', es: 'Tecnología construida para' },
  { en: 'Our Own Ecosystem', es: 'Nuestro propio ecosistema' },
  { en: 'Founded in 2024 in Cartagena, Colombia, CTG One Technology develops and operates proprietary software and digital infrastructure applied directly across its own business units. Our companies provide real operating environments where technology is designed, tested, deployed, and continuously improved.', es: 'Fundada en 2024 en Cartagena, Colombia, CTG One Technology desarrolla y opera software propietario e infraestructura digital aplicada directamente en sus propias unidades de negocio. Nuestras empresas ofrecen entornos operativos reales donde la tecnología se diseña, prueba, despliega y mejora continuamente.' },
  { en: 'Proprietary Software', es: 'Software propietario' },
  { en: 'AI & Automation', es: 'IA y automatización' },
  { en: 'Shared Digital Infrastructure', es: 'Infraestructura digital compartida' },
  { en: 'Business-Embedded Development', es: 'Desarrollo integrado al negocio' },
  { en: 'Continuous Improvement', es: 'Mejora continua' },
  { en: 'Our differentiator is vertical integration: CTG One develops the technology inside the same ecosystem where it is deployed, creating a direct link between software engineering, infrastructure, data, and real business operations.', es: 'Nuestro diferencial es la integración vertical: CTG One desarrolla la tecnología dentro del mismo ecosistema donde se implementa, creando un vínculo directo entre ingeniería de software, infraestructura, datos y operaciones empresariales reales.' },

  { en: 'What We Build', es: 'Lo que construimos' },
  { en: 'Software &', es: 'Software e' },
  { en: 'Digital Infrastructure', es: 'Infraestructura digital' },
  { en: 'Software Engineering', es: 'Ingeniería de software' },
  { en: 'Platforms, Data & Infrastructure', es: 'Plataformas, datos e infraestructura' },
  { en: 'Embedded Product Development', es: 'Desarrollo de producto integrado' },
  { en: 'CTG One builds the technological foundation used across its business ecosystem. Our work focuses on proprietary software, artificial intelligence, automation, shared infrastructure, and digital products designed for the operational needs of our own units.', es: 'CTG One construye la base tecnológica utilizada en todo su ecosistema empresarial. Nuestro trabajo se enfoca en software propietario, inteligencia artificial, automatización, infraestructura compartida y productos digitales diseñados para las necesidades operativas de nuestras propias unidades.' },
  { en: 'Proprietary platform', es: 'Plataforma propia' },
  { en: 'Digital infrastructure developed by CTG One to manage production-batch participation in CTG Craft Beer, with operational traceability, tracking, and a participant dashboard.', es: 'Infraestructura digital desarrollada por CTG One para administrar inversión por lotes de producción de CTG Craft Beer, con trazabilidad operativa, seguimiento y panel del participante.' },
  { en: 'Open platform', es: 'Abrir plataforma' },

  { en: 'Our Portfolio', es: 'Nuestro portafolio' },
  { en: 'Business', es: 'Negocios' },
  { en: 'Twelve operating business units form the application layer for CTG One technology. We build software and infrastructure centrally, then deploy and improve those systems inside the businesses where they create measurable operational value.', es: 'Doce unidades de negocio operativas conforman la capa de aplicación de la tecnología de CTG One. Construimos software e infraestructura de forma centralizada y luego desplegamos y mejoramos esos sistemas dentro de los negocios donde generan valor operativo medible.' },

  { en: 'Loyalty & Referrals', es: 'Lealtad y referidos' },
  { en: 'Earn by Engaging', es: 'Gana al participar' },
  { en: 'Earn by Referring', es: 'Gana al referir' },
  { en: 'Redeem Across the Ecosystem', es: 'Redime en todo el ecosistema' },
  { en: 'Tiered Recognition', es: 'Reconocimiento por niveles' },
  { en: 'The Token Powering', es: 'El token que impulsa' },
  { en: 'Our Ecosystem', es: 'Nuestro ecosistema' },
  { en: 'Total Supply', es: 'Suministro total' },
  { en: 'Token Holders', es: 'Titulares del token' },
  { en: 'Cross-unit payments and transactions', es: 'Pagos y transacciones entre unidades' },
  { en: 'Exclusive discounts and benefits', es: 'Descuentos y beneficios exclusivos' },
  { en: 'Loyalty rewards program', es: 'Programa de recompensas por lealtad' },

  { en: 'Get in Touch', es: 'Contáctanos' },
  { en: 'Technology for', es: 'Tecnología para' },
  { en: 'Real Operations', es: 'Operaciones reales' },
  { en: 'Explore how CTG One builds and deploys software, AI, automation, and digital infrastructure across a diversified portfolio of operating businesses.', es: 'Conoce cómo CTG One construye y despliega software, IA, automatización e infraestructura digital en un portafolio diversificado de negocios en operación.' },
  { en: 'Software, AI & infrastructure for our own business ecosystem.', es: 'Software, IA e infraestructura para nuestro propio ecosistema empresarial.' },

  { en: 'CTG Craft Beer Investment', es: 'CTG Craft Beer Inversión' },
  { en: 'Participate', es: 'Participar' },
  { en: 'See available batches', es: 'Ver lotes disponibles' },
  { en: 'How it works', es: 'Cómo funciona' },
  { en: 'Participate in the real production of', es: 'Participa en la producción real de' },
  { en: 'Finance the productive equivalent of identified CTG Craft Beer batches, follow their production and commercialization closely, and review settlement with full transparency. Real beer, real production, real inventory.', es: 'Financia el equivalente productivo de lotes identificados de CTG Craft Beer, sigue su producción y comercialización de cerca, y consulta la liquidación con transparencia total. Cerveza real, producción real, inventario real.' },
  { en: 'Real portfolio', es: 'Portafolio real' },
  { en: 'The styles of', es: 'Los estilos de' },
  { en: 'German recipe', es: 'Receta alemana' },
  { en: 'Product in circulation', es: 'Producto en circulación' },
  { en: 'Brand, product and commercialization beyond the screen.', es: 'Marca, producto y comercialización fuera de la pantalla.' },
  { en: 'The process', es: 'El proceso' },
  { en: 'From your investment to the', es: 'De tu inversión a la' },
  { en: 'sale', es: 'venta' },
  { en: 'Follow every stage of the batch: participation, production, commercialization and settlement.', es: 'Sigue cada etapa del lote: participación, producción, comercialización y liquidación.' },
  { en: 'Explore opportunities', es: 'Explora oportunidades' },
  { en: 'Participate in a batch', es: 'Participa en un lote' },
  { en: 'Track production', es: 'Sigue la producción' },
  { en: 'Track sales', es: 'Sigue las ventas' },
  { en: 'Review settlement', es: 'Consulta la liquidación' },
  { en: 'Withdraw or reinvest', es: 'Retira o reinvierte' },
  { en: 'Opportunities', es: 'Oportunidades' },
  { en: 'Production batches', es: 'Lotes de producción' },
  { en: 'Open simulator', es: 'Abrir simulador' },

  { en: 'Dashboard', es: 'Panel' },
  { en: 'Account Information', es: 'Información de Cuenta' },
  { en: 'Identity Verification (KYC):', es: 'Verificación de identidad (KYC):' },
  { en: 'Member since:', es: 'Miembro desde:' },
  { en: 'Balance', es: 'Saldo' },
  { en: 'Add funds', es: 'Recargar cuenta' },
  { en: 'Connect Wallet', es: 'Conectar Wallet' },
  { en: 'Transaction History', es: 'Historial de Transacciones' },
  { en: 'Products and Services', es: 'Productos y Servicios' },
  { en: 'My dashboard', es: 'Mi panel' },
  { en: 'Active capital', es: 'Capital activo' },
  { en: 'Available balance', es: 'Saldo disponible' },
  { en: 'Active allocations', es: 'Asignaciones activas' },
  { en: 'Request withdrawal', es: 'Solicitar retiro' },
  { en: 'Recent withdrawals', es: 'Retiros recientes' },
  { en: 'My allocations', es: 'Mis asignaciones' },

  { en: 'Full name', es: 'Nombre completo' },
  { en: 'Phone', es: 'Teléfono' },
  { en: 'Email', es: 'Correo electrónico' },
  { en: 'Password', es: 'Contraseña' },
  { en: 'Join the CTG One ecosystem.', es: 'Únete al ecosistema CTG One.' },
  { en: 'Already have an account?', es: '¿Ya tienes cuenta?' },
];

const enToEs = new Map(PHRASES.map(({ en, es }) => [en, es]));
const esToEn = new Map(PHRASES.map(({ en, es }) => [es, en]));
const englishValues = new Set(PHRASES.map(({ en }) => en));
const spanishValues = new Set(PHRASES.map(({ es }) => es));

export function translatePhrase(value: string, locale: Locale): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  // If the text is already in the requested language, do nothing. This makes
  // the translation layer idempotent and safe under React re-renders.
  if (locale === 'es' && spanishValues.has(trimmed)) return value;
  if (locale === 'en' && englishValues.has(trimmed)) return value;

  const translated = locale === 'es' ? enToEs.get(trimmed) : esToEn.get(trimmed);
  if (!translated || translated === trimmed) return value;
  const start = value.indexOf(trimmed);
  return `${value.slice(0, start)}${translated}${value.slice(start + trimmed.length)}`;
}
