'use client';

import { useEffect } from 'react';

import { DASHBOARD_HERO_IMAGE } from '@/data/dashboardHeroImage';

const DASHBOARD_SLOGAN = 'La tecnología al servicio de una sociedad más humana';

export default function DashboardHeroVisualOverride() {
  useEffect(() => {
    const slogan = document.querySelector<HTMLElement>(
      "main > section[aria-labelledby='dashboard-title'] > div:last-child > p",
    );

    if (slogan) {
      slogan.textContent = DASHBOARD_SLOGAN;
    }
  }, []);

  return (
    <style jsx global>{`
      main > section[aria-labelledby='dashboard-title'] {
        background-image:
          linear-gradient(90deg, #080a0b 0%, rgba(8, 10, 11, 0.86) 27%, rgba(8, 10, 11, 0.18) 57%, rgba(8, 10, 11, 0.52) 100%),
          url("${DASHBOARD_HERO_IMAGE}") !important;
        background-position: center 52% !important;
        background-size: cover !important;
      }
    `}</style>
  );
}
