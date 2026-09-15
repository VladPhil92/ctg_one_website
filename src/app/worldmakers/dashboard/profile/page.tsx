import styles from '../dashboard.module.css';

export default function WorldMakersDashboardProfilePage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Perfil y seguridad</p>
          <h2>Una identidad para todo el ecosistema.</h2>
          <p>World Makers utiliza tu identidad CTG One. La seguridad, recuperación y autenticación permanecen centralizadas en la cuenta principal.</p>
        </div>
      </div>

      <div className={styles.profileGrid}>
        <article className={styles.profileCard}>
          <strong>Identidad CTG One</strong>
          <p>Gestiona nombre, correo, sesión y controles de seguridad desde tu cuenta central.</p>
          <a href="https://ctgone.com/dashboard">Abrir Mi CTG One →</a>
        </article>
        <article className={styles.profileCard}>
          <strong>Seguridad</strong>
          <p>Revisa autenticación multifactor y opciones de protección de cuenta sin duplicar credenciales en World Makers.</p>
          <a href="https://ctgone.com/dashboard/seguridad">Administrar seguridad →</a>
        </article>
        <article className={styles.profileCard}>
          <strong>Privacidad World Makers</strong>
          <p>Consulta qué información se usa en el portal y cómo se protege la actividad asociada al juego.</p>
          <a href="/privacy">Ver privacidad →</a>
        </article>
        <article className={styles.profileCard}>
          <strong>Comunidad</strong>
          <p>Participa en novedades, investigación y futuras oportunidades de prueba cuando estén disponibles.</p>
          <a href="/community">Ir a comunidad →</a>
        </article>
      </div>
    </section>
  );
}
