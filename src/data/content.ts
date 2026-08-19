// ============================================
// CTG ONE TECHNOLOGY - CONTENT DATA
// ============================================

import config from '@/config/config.json';

// Legacy/shared content registry. Public capability claims in this file must
// remain consistent with the canonical LIVE / PARTIAL / IN DEVELOPMENT /
// ROADMAP maturity model used by Technology Status.

export const HERO = {
  badge: 'Software & Digital Infrastructure',
  title: 'Technology is infrastructure.',
  titleHighlight: 'Strategy is architecture.',
  subtitle: 'We build both for our own ecosystem.',
  description:
    'CTG One Technology builds proprietary software, transactional systems and shared digital infrastructure for its own business ecosystem. Advanced AI capabilities are being developed under an explicit governance and evidence model.',
  ctaPrimary: 'Explore Ecosystem',
  ctaSecondary: 'Start Conversation',
  metrics: [
    { value: '12', label: 'Business Units', icon: 'building' },
    { value: 'One', label: 'Technology Layer', icon: 'layers' },
    { value: '2024', label: 'Founded', icon: 'calendar' },
    { value: 'Cartagena', label: 'Headquarters', icon: 'location' },
  ],
};

export const ABOUT = {
  badge: 'About CTG One',
  title: 'Technology Built for',
  titleHighlight: 'Our Own Ecosystem',
  description:
    'Founded in 2024 in Cartagena, Colombia, CTG One Technology develops and operates proprietary software and digital infrastructure applied directly across its own business units. Our companies provide real operating environments where technology is designed, tested, deployed and continuously improved.',
  features: [
    {
      title: 'Proprietary Software',
      description: 'Applications, platforms and digital products designed around verified operational needs inside the ecosystem.',
      icon: 'eye',
    },
    {
      title: 'AI & Automation',
      description: 'Automation exists in selected workflows; agent, RAG and broader AI runtime capabilities remain explicitly in development or roadmap until production evidence exists.',
      icon: 'network',
    },
    {
      title: 'Shared Digital Infrastructure',
      description: 'Identity, data, transactional models, authorization, security and reusable technology services form the evolving shared layer.',
      icon: 'shield',
    },
    {
      title: 'Business-Embedded Development',
      description: 'Technology is built alongside real operations, creating a direct feedback loop between engineering and business execution.',
      icon: 'trending',
    },
    {
      title: 'Continuous Improvement',
      description: 'Capabilities are promoted publicly only when implementation, testing, deployment and operational evidence support the claim.',
      icon: 'check',
    },
  ],
  differentiator:
    'Our differentiator is vertical integration: CTG One develops technology inside the same ecosystem where it is deployed, connecting software engineering, infrastructure, data and real business operations.',
};

export const SERVICES = {
  badge: 'What We Build',
  title: 'Software &',
  titleHighlight: 'Digital Infrastructure',
  description:
    'CTG One builds the technological foundation used across its own business ecosystem. Public capability claims distinguish operational systems from partial implementations, active development and roadmap architecture.',
  items: [
    {
      title: 'Software Engineering',
      description: 'Web applications, internal platforms, operational systems, APIs and digital products engineered for CTG One business units.',
      icon: 'cpu',
      color: '#d4a259',
    },
    {
      title: 'Automation & AI Development',
      description: 'Existing server-side workflows and triggers are complemented by an AI architecture under development for contextual assistance, agents and governed automation.',
      icon: 'users',
      color: '#6b8cae',
    },
    {
      title: 'Platforms, Data & Infrastructure',
      description: 'Shared architecture for identity, PostgreSQL data, authorization, storage, transactional models, security and cloud deployment.',
      icon: 'palette',
      color: '#7da87d',
    },
    {
      title: 'Embedded Product Development',
      description: 'Operating needs from the ecosystem are translated into technology products and validated inside real business contexts.',
      icon: 'wallet',
      color: '#9a8cae',
    },
  ],
};

export const ECOSYSTEM = {
  badge: 'Our Portfolio',
  title: 'Business',
  titleHighlight: 'Ecosystem',
  description:
    'Twelve operating business units form the application environments for CTG One technology. Their technology maturity is documented separately and must not be inferred solely from membership in the ecosystem.',
  units: [
    { id: 'education', name: 'Valderrama International School', description: 'Private tutoring and educational services.', icon: 'valderrama', color: '#d4a259', url: 'valderramainternationalschool.com' },
    { id: 'hospitality', name: 'CTG Suites', description: 'Hospitality and lodging operations.', icon: 'hotel', color: '#6b8cae' },
    { id: 'realestate', name: 'Bechara Real Estate', description: 'Property sales, rentals and real-estate advisory.', icon: 'bechara', color: '#7da87d' },
    { id: 'tech', name: 'CTG One Technology', description: 'Core software, data, infrastructure and product-engineering layer for the ecosystem.', icon: 'ctgone', color: '#ae8c9a' },
    { id: 'veterinary', name: 'Nvet Care', description: 'Veterinary service and marketplace concept with technology capabilities tracked by maturity status.', icon: 'nvetcare', color: '#8c9aae' },
    { id: 'dental', name: 'Oralgreen', description: 'Comprehensive dental care based in Sincelejo.', icon: 'oralgreen', color: '#7dae9a' },
    { id: 'legal', name: 'Legalyst Consultores', description: 'Conciliation, legal advice and trademark services.', icon: 'scale', color: '#c4956a', url: 'legalystconsultores.com' },
    { id: 'design', name: 'CTG One Design', description: 'Corporate identity, branding and digital communication.', icon: 'palette', color: '#ae9a8c' },
    { id: 'credits', name: 'Vantage Libranza Plus', description: 'Payroll-credit business unit; digital capabilities are tracked separately by maturity status.', icon: 'wallet', color: '#8cae9a' },
    { id: 'gastrobar', name: 'PISÁO Gastrobar', description: 'Caribbean casual-dining gastrobar in Cartagena.', icon: 'pisao', color: '#7a9a5c', url: 'pisaogastrobar.com' },
    { id: 'craftbeer', name: 'CTG Craft Beer', description: 'Craft-beer production and commercialization operation in Cartagena.', icon: 'craftbeer', color: '#c9a962' },
    { id: 'guestlogistics', name: 'Guest Logistics Concierge', description: 'Guest-logistics and concierge product context within the hospitality ecosystem.', icon: 'guestlogistics', color: '#3b5169' },
  ],
};

export const REWARDS = {
  badge: 'CTG Rewards · Roadmap',
  title: 'CTG',
  titleHighlight: 'Rewards',
  description:
    'CTG Rewards is a roadmap concept for future loyalty and referral capabilities across the ecosystem. It is not represented as a currently active cross-ecosystem rewards program; individual mechanics may only be described as active where a specific business unit has a verified implementation and published rules.',
  features: [
    { title: 'Engagement Recognition', description: 'Designed recognition mechanics associated with ecosystem engagement; not a universal active earning program.', icon: 'award' },
    { title: 'Referral Recognition', description: 'Potential referral mechanics remain subject to implementation and the published rules of the applicable business unit.', icon: 'userPlus' },
    { title: 'Cross-Ecosystem Redemption', description: 'Cross-ecosystem redemption remains an architectural objective and is not represented as active today.', icon: 'gift' },
    { title: 'Tiered Recognition', description: 'Tiered benefits remain a roadmap capability unless a specific implementation and program rules are published.', icon: 'layers' },
  ],
};

// CTGO is a Web3 technology roadmap. Do not add supply, holder count, price,
// APY, TVL, distribution or contract-address claims without independently
// verifiable production evidence.
export const TOKEN = {
  badge: 'CTGO · Web3 Strategy',
  title: 'Utility Architecture',
  titleHighlight: 'In Development',
  description:
    'CTGO is part of CTG One’s fintech and Web3 roadmap. No production network, contract address, holder metrics, price, APY, TVL or public sale is represented as active until independently verifiable evidence exists.',
  status: 'ROADMAP',
  stats: [],
  utilities: [
    'Potential cross-unit payments and transactions.',
    'Potential integration with CTG Rewards and ecosystem benefits.',
    'Utility mechanisms to be documented and verified before production.',
  ],
  distribution: [],
};

export const CONTACT = {
  badge: 'Get in Touch',
  title: 'Technology for',
  titleHighlight: 'Real Operations',
  description:
    'Explore how CTG One builds and deploys software and digital infrastructure across a diversified portfolio of operating businesses, while advanced AI capabilities progress under a documented maturity model.',
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

export const FOOTER = {
  brand: 'CTG One Technology',
  tagline: 'Software and digital infrastructure for our own business ecosystem.',
  links: {
    company: ['About'],
    solutions: ['Software Engineering', 'Digital Infrastructure', 'Internal Platforms'],
    resources: ['Technology Status', 'Products', 'AI', 'Labs', 'Changelog'],
    legal: ['Privacy Policy'],
  },
  copyright: `© ${new Date().getFullYear()} CTG One Technology. All rights reserved.`,
};
