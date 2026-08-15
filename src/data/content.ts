// ============================================
// CTG ONE TECHNOLOGY - CONTENT DATA
// ============================================

import config from '@/config/config.json';

// Navigation: NAV_ITEMS lives in @/lib/constants (single source of truth —
// Navbar and Footer both import it from there so the two menus can't drift).

// Hero Section
export const HERO = {
  badge: 'Software, AI & Infrastructure',
  title: 'Technology is infrastructure.',
  titleHighlight: 'Strategy is architecture.',
  subtitle: 'We build both for our own ecosystem.',
  description:
    'CTG One Technology is a technology company that builds software, AI systems, automation, and digital infrastructure for its own business ecosystem. We design, deploy, and operate the technology layer that powers our business units.',
  ctaPrimary: 'Explore Ecosystem',
  ctaSecondary: 'Start Conversation',
  metrics: [
    { value: '12', label: 'Business Units', icon: 'building' },
    { value: 'One', label: 'Technology Layer', icon: 'layers' },
    { value: '2024', label: 'Founded', icon: 'calendar' },
    { value: 'Cartagena', label: 'Headquarters', icon: 'location' },
  ],
};

// About Section
export const ABOUT = {
  badge: 'About CTG One',
  title: 'Technology Built for',
  titleHighlight: 'Our Own Ecosystem',
  description:
    'Founded in 2024 in Cartagena, Colombia, CTG One Technology develops and operates proprietary software and digital infrastructure applied directly across its own business units. Our companies provide real operating environments where technology is designed, tested, deployed, and continuously improved.',
  features: [
    {
      title: 'Proprietary Software',
      description: 'We build applications, platforms, and digital products around the real operational needs of our business units.',
      icon: 'eye',
    },
    {
      title: 'AI & Automation',
      description: 'We develop intelligent agents, automated workflows, and decision-support systems that improve execution across the ecosystem.',
      icon: 'network',
    },
    {
      title: 'Shared Digital Infrastructure',
      description: 'Identity, data, payments, integrations, security, and reusable technology services are designed as a common layer for the ecosystem.',
      icon: 'shield',
    },
    {
      title: 'Business-Embedded Development',
      description: 'Technology is built alongside real operations, allowing us to move from problem identification to production deployment with direct feedback.',
      icon: 'trending',
    },
    {
      title: 'Continuous Improvement',
      description: 'We measure how our systems perform inside the businesses and use operational data to refine products, automation, and infrastructure over time.',
      icon: 'check',
    },
  ],
  differentiator: 'Our differentiator is vertical integration: CTG One develops the technology inside the same ecosystem where it is deployed, creating a direct link between software engineering, infrastructure, data, and real business operations.',
};

// Technology Section
export const SERVICES = {
  badge: 'What We Build',
  title: 'Software &',
  titleHighlight: 'Digital Infrastructure',
  description:
    'CTG One builds the technological foundation used across its business ecosystem. Our work focuses on proprietary software, artificial intelligence, automation, shared infrastructure, and digital products designed for the operational needs of our own units.',
  items: [
    {
      title: 'Software Engineering',
      description: 'Web applications, internal platforms, operational systems, APIs, and digital products engineered for the companies in the CTG One ecosystem.',
      icon: 'cpu',
      color: '#d4a259',
    },
    {
      title: 'AI & Automation',
      description: 'AI agents, workflow automation, intelligent assistance, and process orchestration designed to reduce friction and improve execution across our operations.',
      icon: 'users',
      color: '#6b8cae',
    },
    {
      title: 'Platforms, Data & Infrastructure',
      description: 'Shared architecture for identity, databases, integrations, analytics, payments, security, cloud services, and reusable components across business units.',
      icon: 'palette',
      color: '#7da87d',
    },
    {
      title: 'Embedded Product Development',
      description: 'We turn operating needs from hospitality, education, real estate, finance, food, healthcare, and other units into technology products deployed inside the ecosystem.',
      icon: 'wallet',
      color: '#9a8cae',
    },
  ],
};

// Business Ecosystem - 12 Integrated Units
export const ECOSYSTEM = {
  badge: 'Our Portfolio',
  title: 'Business',
  titleHighlight: 'Ecosystem',
  description:
    'Twelve operating business units form the application layer for CTG One technology. We build software and infrastructure centrally, then deploy and improve those systems inside the businesses where they create measurable operational value.',
  units: [
    {
      // Official Valderrama logomark supplied and cropped to
      // public/images/logo/valderrama-icon.png (transparent background).
      id: 'education',
      name: 'Valderrama International School',
      description: 'Private tutoring in all academic subjects, plus music, dance, and art courses.',
      icon: 'valderrama',
      color: '#d4a259',
      url: 'valderramainternationalschool.com',
    },
    {
      // TODO: the CTG Suites logo supplied is a wordmark only (no
      // separate icon mark to crop) — kept the placeholder lucide icon
      // here rather than using a cropped fragment of text.
      id: 'hospitality',
      name: 'CTG Suites',
      description: 'Lodging management in Cartagena and Santa Marta. Hotel Mirador del Castillo (25 rooms) and Apartaestudio 2E.',
      icon: 'hotel',
      color: '#6b8cae',
    },
    {
      // Official Bechara Real Estate logomark supplied and cropped to
      // public/images/logo/bechara-icon.png (transparent background).
      id: 'realestate',
      name: 'Bechara Real Estate',
      description: 'High-end property sales and rentals. Specialized advice for wealth investment and premium housing.',
      icon: 'bechara',
      color: '#7da87d',
    },
    {
      // Official CTG One coin logomark supplied and cropped to
      // public/images/logo/ctg-one-coin-icon.png (transparent background).
      id: 'tech',
      name: 'CTG One Technology',
      description: 'Core technology: proprietary software, AI systems, automation, applications, shared digital infrastructure, CTG One Token, and fintech platforms for the ecosystem.',
      icon: 'ctgone',
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
      // Official Oralgreen logomark supplied and cropped to
      // public/images/logo/oralgreen-icon.png (transparent background).
      id: 'dental',
      name: 'Oralgreen',
      description: 'Comprehensive dental care based in Sincelejo. Clinical oral health services.',
      icon: 'oralgreen',
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
    {
      // Official PISÁO logomark supplied and cropped to
      // public/images/logo/pisao-gastrobar-icon.png (transparent background).
      id: 'gastrobar',
      name: 'PISÁO Gastrobar',
      description: '"La Casa del Patacón" — casual dining gastrobar in Cartagena with Caribbean identity.',
      icon: 'pisao',
      color: '#7a9a5c',
      url: 'pisaogastrobar.com',
    },
    {
      // Official CTG Craft Beer logomark supplied and cropped to
      // public/images/logo/ctg-craft-beer-icon.png (transparent background).
      id: 'craftbeer',
      name: 'CTG Craft Beer',
      description: 'Artisanal craft beer brewed in Cartagena — "Cerveza Artesanal" for the ecosystem\'s hospitality venues.',
      icon: 'craftbeer',
      color: '#c9a962',
    },
    {
      // Official Guest Logistics Concierge logomark supplied and cropped
      // to public/images/logo/guest-logistics-icon.png (transparent background).
      id: 'guestlogistics',
      name: 'Guest Logistics Concierge',
      description: 'SaaS concierge platform coordinating guest logistics, bookings, and services across the hospitality ecosystem.',
      icon: 'guestlogistics',
      color: '#3b5169',
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
    'CTG One Token (CTGO) is the utility token connecting all twelve business units. Part of our fintech vision and tokenization strategy — real utility, real value.',
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
  // NOTE: Public Sale closed (no active public sale of new tokens); its
  // 30% was redistributed proportionally across the remaining categories,
  // preserving their original relative weighting (5:4:3:2) rather than
  // picking a category to favor.
  distribution: [
    { label: 'Ecosystem Fund', percentage: 36 },
    { label: 'Team & Advisors', percentage: 29 },
    { label: 'Reserves', percentage: 21 },
    { label: 'Liquidity', percentage: 14 },
  ],
};

// Contact (uses config.json for contact details)
export const CONTACT = {
  badge: 'Get in Touch',
  title: 'Technology for',
  titleHighlight: 'Real Operations',
  description:
    'Explore how CTG One builds and deploys software, AI, automation, and digital infrastructure across a diversified portfolio of operating businesses.',
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
  brand: 'CTG One Technology',
  tagline: 'Software, AI & infrastructure for our own business ecosystem.',
  links: {
    company: ['About', 'Team', 'Careers', 'Press'],
    solutions: ['Software Engineering', 'AI & Automation', 'Digital Infrastructure', 'Internal Platforms'],
    resources: ['Documentation', 'Whitepaper', 'Blog', 'Support'],
    legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
  },
  copyright: `© ${new Date().getFullYear()} CTG One Technology. All rights reserved.`,
};
