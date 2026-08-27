'use client';

import React from 'react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { CtgoTokenSection } from '@/components/sections/CtgoTokenSection';
import styles from './CtgoTokenPage.module.css';

export default function CtgoTokenPage() {
  return (
    <PublicPageShell contentClassName={styles.tokenPage}>
      <CtgoTokenSection />
    </PublicPageShell>
  );
}
