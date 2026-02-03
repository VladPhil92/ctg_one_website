import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Theme - Ultra Refined
        'bg-primary': '#050505',
        'bg-secondary': '#0a0a0a',
        'bg-tertiary': '#111111',
        'bg-card': 'rgba(18, 18, 18, 0.6)',

        // Accent Colors - Refined Gold
        'accent': '#c9a962',
        'accent-light': '#d4b676',
        'accent-dark': '#a68b4b',

        // Typography - Refined Contrast
        'text-primary': '#ffffff',
        'text-secondary': '#e5e5e5',
        'text-muted': '#8a8a8a',
        'text-dim': '#5a5a5a',

        // Borders - Ultra Subtle
        'border': 'rgba(255, 255, 255, 0.04)',
        'border-hover': 'rgba(255, 255, 255, 0.08)',

        // Semantic
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#c9a962',
      },
      fontFamily: {
        outfit: ['var(--font-outfit)', 'Outfit', 'system-ui', 'sans-serif'],
        'dm-sans': ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        'container': '1152px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
      },
      boxShadow: {
        'glow': '0 0 60px rgba(201, 169, 98, 0.04)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'fade-in': 'fade-in 0.6s ease-out forwards',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(180deg, #050505 0%, #0a0a0a 100%)',
        'accent-gradient': 'linear-gradient(135deg, #c9a962 0%, #a68b4b 100%)',
      },
      transitionTimingFunction: {
        'elegant': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
}

export default config
