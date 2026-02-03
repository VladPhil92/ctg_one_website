// ============================================
// CTG ONE CORPORATION - CONSTANTS
// ============================================

import config from '@/config/config.json';

// Contact Information (from config.json)
export const CONTACT_EMAIL = config.contact.email;
export const CONTACT_PHONE = config.contact.phone;
export const LOCATION = config.contact.location;
export const WEBSITE = config.contact.website;

// Navigation
export const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Ecosystem', href: '#ecosystem' },
  { label: 'Token', href: '#token' },
  { label: 'Contact', href: '#contact' },
];

// Animation Configuration
export const ANIMATION = {
  duration: 0.6,
  delay: 0.1,
  easing: [0.4, 0, 0.2, 1] as const,
  stagger: 0.1,
};

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Theme Colors
export const COLORS = {
  // Primary
  accent: '#f59e0b',
  accentLight: '#fbbf24',
  accentDark: '#d97706',
  
  // Secondary
  accentSecondary: '#3b82f6',
  
  // Backgrounds
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a25',
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#e4e4e7',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
  
  // Semantic
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// Social Links (from config.json)
export const SOCIAL_LINKS = {
  twitter: config.social.twitter,
  linkedin: config.social.linkedin,
  telegram: config.social.telegram,
  github: 'https://github.com/ctgone',
};

// Business Units - 10 Integrated Units
export const BUSINESS_UNITS = [
  { id: 'education', name: 'Valderrama International School', color: '#d4a259' },
  { id: 'hospitality', name: 'CTG Suites', color: '#6b8cae' },
  { id: 'realestate', name: 'Bechara Real Estate', color: '#7da87d' },
  { id: 'wellness', name: 'Hacienda San Benito', color: '#9a8cae' },
  { id: 'tech', name: 'CTG One Corporation', color: '#ae8c9a' },
  { id: 'veterinary', name: 'Consultorio Veterinario Nicole Behar', color: '#8c9aae' },
  { id: 'dental', name: 'Oralgreen', color: '#7dae9a' },
  { id: 'legal', name: 'Legalyst Consultores', color: '#c4956a' },
  { id: 'design', name: 'CTG One Design', color: '#ae9a8c' },
  { id: 'credits', name: 'Vantage Libranza Plus', color: '#8cae9a' },
];
