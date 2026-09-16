export type NvetPublicAsset = {
  id: string;
  src: string;
  kind: 'photo' | 'product-ui' | 'tracking-ui' | 'brand-visual';
  altEs: string;
  altEn: string;
};

export const nvetPublicAssets = {
  homeCare: {
    id: 'home-care',
    src: '/images/nvetcareapp/owner-and-dog.jpg',
    kind: 'photo',
    altEs: 'Familia con su mascota durante una experiencia de cuidado en casa',
    altEn: 'Family with their pet during an at-home care experience',
  },
  homeApp: {
    id: 'home-app',
    src: '/images/nvetcareapp/home-screen-phone.jpg',
    kind: 'product-ui',
    altEs: 'Pantalla principal de Nvet Care en un teléfono móvil',
    altEn: 'Nvet Care home screen on a mobile phone',
  },
  trackingEs: {
    id: 'tracking-es',
    src: '/images/nvetcareapp/vet-tracking-mockup-es.png',
    kind: 'tracking-ui',
    altEs: 'Interfaz en español para seguimiento de una visita veterinaria',
    altEn: 'Spanish interface for tracking a veterinary visit',
  },
  trackingEn: {
    id: 'tracking-en',
    src: '/images/nvetcareapp/vet-tracking-mockup-en.png',
    kind: 'tracking-ui',
    altEs: 'Interfaz en inglés para seguimiento de una visita veterinaria',
    altEn: 'English interface for tracking a veterinary visit',
  },
  trackingFull: {
    id: 'tracking-full',
    src: '/images/nvetcareapp/vet-tracking-full.jpg',
    kind: 'tracking-ui',
    altEs: 'Vista ampliada del seguimiento de una atención veterinaria',
    altEn: 'Expanded view of veterinary care tracking',
  },
  featureShowcase: {
    id: 'feature-showcase',
    src: '/images/nvetcareapp/feature-showcase.jpg',
    kind: 'brand-visual',
    altEs: 'Composición visual de la experiencia conectada de Nvet Care',
    altEn: 'Visual composition of the connected Nvet Care experience',
  },
  mission: {
    id: 'mission',
    src: '/images/nvetcareapp/mission-banner.jpg',
    kind: 'photo',
    altEs: 'Atención veterinaria cercana centrada en la mascota',
    altEn: 'Close veterinary care centered on the pet',
  },
} satisfies Record<string, NvetPublicAsset>;
