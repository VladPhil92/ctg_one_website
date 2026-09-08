'use client';

import { DASHBOARD_HERO_IMAGE } from '@/data/dashboardHeroImage';

export default function DashboardHeroVisualOverride() {
  return (
    <style jsx global>{`
      main > section[aria-labelledby='dashboard-title'] {
        background-image:
          linear-gradient(90deg, #080a0b 0%, rgba(8, 10, 11, 0.86) 27%, rgba(8, 10, 11, 0.18) 57%, rgba(8, 10, 11, 0.52) 100%),
          url("${DASHBOARD_HERO_IMAGE}") !important;
        background-position: center 52% !important;
        background-size: cover !important;
      }

      main > section[aria-labelledby='dashboard-title'] > div:last-child > p {
        font-size: 0 !important;
        line-height: 1.35 !important;
      }

      main > section[aria-labelledby='dashboard-title'] > div:last-child > p::after {
        content: 'La tecnología al servicio de una sociedad más humana';
        display: block;
        font-size: 13px;
        line-height: 1.35;
      }
    `}</style>
  );
}
