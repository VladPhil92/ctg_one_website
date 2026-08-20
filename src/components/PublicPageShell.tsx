import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import commandStyles from '@/styles/CommandCenter.module.css';
import styles from '@/styles/PublicCommandCenter.module.css';

interface PublicPageShellProps {
  children: React.ReactNode;
  contentClassName?: string;
}

/**
 * Shared visual shell for CTG One public corporate surfaces.
 * Keeps navigation/footer semantics intact while applying the same
 * command-center atmosphere, palette and surface treatment used by Home.
 */
export function PublicPageShell({ children, contentClassName = '' }: PublicPageShellProps) {
  return (
    <main
      className={`${commandStyles.theme} ${styles.publicShell}`}
      data-public-command-center="true"
    >
      <Navbar />
      <div className={styles.publicAtmosphere} aria-hidden="true">
        <span className={styles.publicGlowGold} />
        <span className={styles.publicGlowBlue} />
        <span className={styles.publicHorizon} />
      </div>
      <div className={`${styles.publicContent} pt-24 sm:pt-28 md:pt-32 ${contentClassName}`}>
        {children}
      </div>
      <Footer />
    </main>
  );
}
