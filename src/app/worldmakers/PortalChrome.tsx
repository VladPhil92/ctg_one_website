import Link from 'next/link';
import { Compass } from 'lucide-react';
import styles from './portal.module.css';
import mobile from './portal-mobile.module.css';

export function PortalNav() {
  return (
    <header className={styles.navbar}>
      <div className={`${styles.shell} ${styles.navInner} ${mobile.mobileNavInner}`}>
        <Link className={styles.brand} href="/worldmakers">
          <span className={styles.brandMark}><Compass size={24} aria-hidden="true" /></span>
          <span className={styles.brandText}>
            World Makers
            <small>Imagina · Crea · Aprende · Transforma</small>
          </span>
        </Link>
        <nav className={`${styles.navLinks} ${mobile.mobileNavLinks}`} aria-label="World Makers">
          <Link href="/worldmakers/how-to-play">Cómo se juega</Link>
          <Link href="/worldmakers/adventures">Aventuras</Link>
          <Link href="/worldmakers/media">Galería</Link>
          <Link href="/worldmakers/families">Familias</Link>
          <Link href="/worldmakers/educators">Educadores</Link>
          <Link className={styles.navCta} href="/worldmakers/community">Comunidad</Link>
        </nav>
      </div>
    </header>
  );
}

export function PortalFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.shell} ${styles.footerInner}`}>
        <div>
          <strong>World Makers</strong><br />
          Un universo de CTG One Technology.
        </div>
        <div className={styles.footerLinks}>
          <Link href="/worldmakers">Inicio</Link>
          <Link href="/worldmakers/adventures">Aventuras</Link>
          <Link href="/worldmakers/families">Familias</Link>
          <Link href="/worldmakers/educators">Educadores</Link>
          <Link href="/worldmakers/community">Comunidad</Link>
          <Link href="/worldmakers/privacy">Privacidad</Link>
          <a href="https://ctgone.com" target="_blank" rel="noreferrer">CTG One</a>
        </div>
      </div>
    </footer>
  );
}
