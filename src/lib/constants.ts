// ============================================
// CTG ONE TECHNOLOGY - CONSTANTS
// ============================================

import config from '@/config/config.json';

export const CONTACT_EMAIL = config.contact.email;
export const CONTACT_PHONE = config.contact.phone;
export const LOCATION = config.contact.location;
export const WEBSITE = config.contact.website;

export const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Nvet Care', href: '/nvetcareapp' },
  { label: 'About', href: '/about' },
  { label: 'Craft Beer', href: '/craft-beer' },
  { label: 'Ecosystem', href: '/ecosystem' },
  { label: 'Technology', href: '/services' },
  { label: 'Investment', href: '/inversion' },
  { label: 'AI', href: '/ai' },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Token', href: '/token' },
  { label: 'Contact', href: '/contact' },
] as const;

// Keep the first level consumer-oriented. Technical and roadmap surfaces live
// one level deeper under the Explore menu.
export const PRIMARY_NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Nvet Care', href: '/nvetcareapp' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

export const PLATFORM_NAV_ITEMS = [
  { label: 'Craft Beer', href: '/craft-beer' },
  { label: 'Ecosystem', href: '/ecosystem' },
  { label: 'Technology', href: '/services' },
  { label: 'Investment', href: '/inversion' },
  { label: 'AI', href: '/ai' },
] as const;

export const ANIMATION = {
  duration: 0.6,
  delay: 0.1,
  easing: [0.4, 0, 0.2, 1] as const,
  stagger: 0.1,
};

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const COLORS = {
  accent: '#c9a962',
  accentLight: '#d4b676',
  accentDark: '#a68b4b',
  accentSecondary: '#3b82f6',
  bgPrimary: '#050505',
  bgSecondary: '#0a0a0a',
  bgTertiary: '#111111',
  textPrimary: '#ffffff',
  textSecondary: '#e5e5e5',
  textMuted: '#b0b0b0',
  textDim: '#9a9a9a',
  success: '#34d399',
  error: '#f87171',
  warning: '#d4b676',
  info: '#9a9a9a',
};

export const SOCIAL_LINKS = {
  twitter: config.social.twitter,
  linkedin: config.social.linkedin,
  telegram: config.social.telegram,
  github: 'https://github.com/ctgone',
};

export const BUSINESS_UNITS = [
  { id: 'education', name: 'Valderrama International School', color: '#d4a259' },
  { id: 'hospitality', name: 'CTG Suites', color: '#6b8cae' },
  { id: 'realestate', name: 'Bechara Real Estate', color: '#7da87d' },
  { id: 'tech', name: 'CTG One Technology', color: '#ae8c9a' },
  { id: 'veterinary', name: 'Nvet Care', color: '#8c9aae' },
  { id: 'dental', name: 'Oralgreen', color: '#7dae9a' },
  { id: 'legal', name: 'Legalyst Consultores', color: '#c4956a' },
  { id: 'design', name: 'CTG One Design', color: '#ae9a8c' },
  { id: 'credits', name: 'Vantage Libranza Plus', color: '#8cae9a' },
  { id: 'gastrobar', name: 'PISÁO Gastrobar', color: '#7a9a5c' },
  { id: 'craftbeer', name: 'CTG Craft Beer', color: '#c9a962' },
  { id: 'guestlogistics', name: 'Guest Logistics Concierge', color: '#3b5169' },
];
