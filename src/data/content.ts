// ============================================
// CTG ONE CORPORATION - CONTENT DATA
// ============================================

import config from '@/config/config.json';

// Navigation
export const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Ecosystem', href: '#ecosystem' },
  { label: 'Rewards', href: '#rewards' },
  { label: 'Token', href: '#token' },
  { label: 'Contact', href: '#contact' },
];

// Hero Section
export const HERO = {
  badge: 'AI Strategy & Infrastructure',
  title: 'Technology is infrastructure.',
  titleHighlight: 'Strategy is architecture.',
  subtitle: 'We design both.',
  description:
    'CTG One Corporation is a technology company and integrated business ecosystem that designs technological infrastructure and strategic architecture. We operate under a dual model: technology infrastructure and a commercial agency with trained advisors.',
  ctaPrimary: 'Explore Ecosystem',
  ctaSecondary: 'Start Conversation',
  metrics: [
    { value: '9', label: 'Business Units', icon: 'building' },
    { value: 'Dual', label: 'Architecture', icon: 'layers' },
    { value: '2024', label: 'Founded', icon: 'calendar' },
    { value: 'Cartagena', label: 'Headquarters', icon: 'location' },
  ],
};

// About Section
export const ABOUT = {
  badge: 'About CTG One',
  title: 'Dual Architecture:',
  titleHighlight: 'Technology & Business Ecosystem',
  description:
    'CTG One Corporation is a technology company founded in 2024 in Cartagena, Colombia, operating under a dual architecture: simultaneously a technological infrastructure company and an integrated business ecosystem of products and services.',
  // The 5 Pillars of CTG One
  features: [
    {
      title: 'Holistic Client Vision',
      description: 'We treat complete persons and contexts instead of isolated cases. We understand the global situation before offering solutions.',
      icon: 'eye',
    },
    {
      title: 'Multiple Access, One Ecosystem',
      description: 'Clients don\'t need to search for multiple providers. CTG One functions as a recurring strategic ally for all their needs.',
      icon: 'network',
    },
    {
      title: 'Trust Through Specialization',
      description: 'Dedicated professionals in each unit under common quality and ethics standards. Each service is delivered by specific experts.',
      icon: 'shield',
    },
    {
      title: 'Continuity Over Time',
      description: 'Clients can enter through a simple service and scale to more complex solutions without friction. Long-term relationships.',
      icon: 'trending',
    },
    {
      title: 'Risk Reduction',
      description: 'By operating within a coordinated ecosystem, clients minimize errors, rework, and poor decisions.',
      icon: 'check',
    },
  ],
  differentiator: 'CTG One doesn\'t seek to be the biggest company, but the most connected — backed by a proprietary technology layer that makes this articulation possible at scale.',
};

// Services Section
export const SERVICES = {
  badge: 'What We Do',
  title: 'Technology &',
  titleHighlight: 'Commercial Agency',
  description:
    'CTG One operates under two dimensions: as a technology company designing AI solutions and digital platforms, and as a commercial agency with a trained team of advisors connecting clients to our entire ecosystem.',
  items: [
    {
      title: 'Technology & Engineering',
      description: 'Automation, software development, AI agents, applications, and digital solutions. Includes the CTG One Token and the ecosystem\'s fintech platform.',
      icon: 'cpu',
      color: '#d4a259',
    },
    {
      title: 'Commercial Management Team',
      description: 'A team of trained sales advisors who sell products and services in an organized manner, guiding clients through the entire ecosystem without friction.',
      icon: 'users',
      color: '#6b8cae',
    },
    {
      title: 'Design & Communication',
      description: 'Corporate image, branding, and digital marketing. In-house design and marketing team for visual identity and strategic communication.',
      icon: 'palette',
      color: '#7da87d',
    },
    {
      title: 'Fintech & Credits',
      description: 'Payroll deduction loans for pensioners and teachers. Credit app in development for medical, aesthetic, and consumer services.',
      icon: 'wallet',
      color: '#9a8cae',
    },
  ],
};

// Business Ecosystem - 9 Integrated Units
export const ECOSYSTEM = {
  badge: 'Our Portfolio',
  title: 'Business',
  titleHighlight: 'Ecosystem',
  description:
    'Nine complementary business units serving individuals, families, and organizations through our Commercial Management Team. Technology is not just another service — it\'s the infrastructure that supports and connects the entire ecosystem.',
  units: [
    {
      id: 'education',
      name: 'Valderrama International School',
      description: 'Private tutoring in all academic subjects, plus music, dance, and art courses.',
      icon: 'graduation',
      color: '#d4a259',
      url: 'valderramainternationalschool.com',
    },
    {
      id: 'hospitality',
      name: 'CTG Suites',
      description: 'Lodging management in Cartagena and Santa Marta. Hotel Mirador del Castillo (25 rooms) and Apartaestudio 2E.',
      icon: 'hotel',
      color: '#6b8cae',
    },
    {
      id: 'realestate',
      name: 'Bechara Real Estate',
      description: 'High-end property sales and rentals. Specialized advice for wealth investment and premium housing.',
      icon: 'building',
      color: '#7da87d',
    },
    {
      id: 'tech',
      name: 'CTG One Corporation',
      description: 'Core technology: automation, software, AI agents, applications, digital solutions, CTG One Token, and fintech platform.',
      icon: 'cpu',
      color: '#ae8c9a',
    },
    {
      // Official Nvet Care logomark supplied and cropped to
      // public/images/logo/nvet-care-icon.png (transparent background).
      // No public domain/repo found; if per-unit links are implemented
      // later, default to the contact section (#contact) until Nvet Care
      // provides one.
      id: 'veterinary',
      name: 'Nvet Care',
      description: 'On-demand veterinary home-visit marketplace for Cartagena. Connects pet owners with verified veterinarians for house calls, with integrated booking and secure split payments.',
      icon: 'nvetcare',
      color: '#8c9aae',
    },
    {
      id: 'dental',
      name: 'Oralgreen',
      description: 'Comprehensive dental care based in Sincelejo. Clinical oral health services.',
      icon: 'smile',
      color: '#7dae9a',
    },
    {
      id: 'legal',
      name: 'Legalyst Consultores',
      description: 'Conciliation, legal advice, and trademark registration.',
      icon: 'scale',
      color: '#c4956a',
      url: 'legalystconsultores.com',
    },
    {
      id: 'design',
      name: 'CTG One Design',
      description: 'Corporate image, branding, and digital marketing. In-house design and marketing team.',
      icon: 'palette',
      color: '#ae9a8c',
    },
    {
      id: 'credits',
      name: 'Vantage Libranza Plus',
      description: 'Payroll loans for pensioners (Colpensiones, Casur, Cremil, Fiduprevisora) and MEN teachers. Credit app in development.',
      icon: 'wallet',
      color: '#8cae9a',
    },
  ],
};

// CTG Rewards - Loyalty & Referral Program
export const REWARDS = {
  badge: 'Loyalty & Referrals',
  title: 'CTG',
  titleHighlight: 'Rewards',
  description:
    'A loyalty program for people who already trust the ecosystem. Earn recognition for the relationships you build with us, and redeem it across every business unit.',
  features: [
    {
      title: 'Earn by Engaging',
      description: 'Every purchase or service you use across CTG One\'s business units adds recognition points to your account.',
      icon: 'award',
    },
    {
      title: 'Earn by Referring',
      description: 'Introduce real clients to any unit in the ecosystem and receive recognition once the relationship is confirmed.',
      icon: 'userPlus',
    },
    {
      title: 'Redeem Across the Ecosystem',
      description: 'Exchange your accumulated points for products, services, and experiences from any CTG One business unit.',
      icon: 'gift',
    },
    {
      title: 'Tiered Recognition',
      description: 'As your engagement grows, you move through membership tiers that unlock additional perks and priority access to services.',
      icon: 'layers',
    },
  ],
};

// Token Section
export const TOKEN = {
  badge: 'CTGO Token',
  title: 'The Token Powering',
  titleHighlight: 'Our Ecosystem',
  description:
    'CTG One Token (CTGO) is the utility token connecting all nine business units. Part of our fintech vision and tokenization strategy — real utility, real value.',
  stats: [
    { label: 'Total Supply', value: '1B', suffix: 'CTGO' },
    { label: 'Token Holders', value: '2,450', suffix: '+' },
  ],
  utilities: [
    'Cross-unit payments and transactions',
    'Exclusive discounts and benefits',
    'Loyalty rewards program',
    'Community input on ecosystem benefits and promotions',
  ],
  // NOTE: Public Sale removed (closed, no active public sale of new
  // tokens). Remaining categories are shown as-is and currently sum to
  // 70%, not 100% — the freed 30% has not been reassigned to avoid
  // inventing new figures; needs a decision on where it goes.
  distribution: [
    { label: 'Ecosystem Fund', percentage: 25 },
    { label: 'Team & Advisors', percentage: 20 },
    { label: 'Reserves', percentage: 15 },
    { label: 'Liquidity', percentage: 10 },
  ],
};

// Contact (uses config.json for contact details)
export const CONTACT = {
  badge: 'Get in Touch',
  title: 'Let\'s Build',
  titleHighlight: 'Together',
  description:
    'Ready to access our integrated ecosystem? Let\'s start a conversation about how CTG One can help you with any of your needs — from technology to wellness, real estate to education.',
  email: config.contact.email,
  phone: config.contact.phone,
  location: config.contact.location,
  website: config.contact.website,
  socials: [
    { name: 'Twitter', url: config.social.twitter, icon: 'twitter' },
    { name: 'LinkedIn', url: config.social.linkedin, icon: 'linkedin' },
    { name: 'Telegram', url: config.social.telegram, icon: 'telegram' },
  ],
};

// Footer
export const FOOTER = {
  brand: 'CTG One Corporation',
  tagline: 'Technology is infrastructure. Strategy is architecture.',
  links: {
    company: ['About', 'Team', 'Careers', 'Press'],
    solutions: ['AI Strategy', 'Blockchain', 'Consulting', 'Investment'],
    resources: ['Documentation', 'Whitepaper', 'Blog', 'Support'],
    legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
  },
  copyright: `© ${new Date().getFullYear()} CTG One Corporation. All rights reserved.`,
};
