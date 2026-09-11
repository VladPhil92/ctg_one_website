import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Eye, HeartHandshake, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Familias | World Makers',
  description: 'World Makers for families: creative play, child-safety principles, privacy minimization and clear product-status communication.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/families' },
};

const principles = [
  { title: 'Sin publicidad de terceros en el gameplay infantil', copy: 'El juego no se diseña alrededor de interrupciones publicitarias ni de atención vendida a terceros.', icon: ShieldCheck },
  { title: 'Sin moneda premium comprable', copy: 'La economía jugable se mantiene separada de flujos comerciales familiares y no depende de una moneda premium que el niño pueda comprar.', icon: LockKeyhole },
  { title: 'Sin recompensas pagas aleatorias', copy: 'No se plantea paid randomness como mecanismo de progresión o monetización infantil.', icon: Sparkles },
  { title: 'Privacidad minimizada', copy: 'La arquitectura busca guardar evidencia de aprendizaje estable y acotada, evitando convertir cada interacción infantil en un perfil innecesariamente invasivo.', icon: Eye },
  { title: 'Juego libre válido', copy: 'Un niño puede construir, explorar, experimentar y contar historias sin que cada minuto de juego tenga que convertirse en una obligación académica.', icon: Users },
  { title: 'Diseño comprensible para adultos', copy: 'El portal familiar debe explicar qué está aprendiendo el producto, qué datos usa y qué capacidades son reales antes de una eventual beta.', icon: HeartHandshake },
];

export default function FamiliesPage() {
  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.audienceHero}`}>
          <div>
            <p className={styles.kicker}>WORLD MAKERS FOR FAMILIES</p>
            <h1>Un mundo para crear, no una máquina para retener atención.</h1>
            <p className={styles.heroLead}>World Makers busca combinar juego abierto, aprendizaje auténtico y una arquitectura infantil responsable. La seguridad no se añade al final como un aviso: debe influir en producto, economía, privacidad, comunidad y diseño de interacción.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/worldmakers/how-to-play">Cómo se juega <ArrowRight size={17} /></Link>
              <Link className={styles.secondaryButton} href="/worldmakers/development">Qué está construido hoy</Link>
            </div>
          </div>
          <div className={styles.callout}>
            <ShieldCheck size={34} />
            <h3>Child safety is architectural.</h3>
            <p>Las decisiones de seguridad deben existir en el diseño del sistema, no depender únicamente de controles parentales posteriores.</p>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>FAMILY PRINCIPLES</p>
            <h2>Qué estamos protegiendo desde el diseño.</h2>
          </div>
          <div className={styles.cardGrid}>
            {principles.map(({ title, copy, icon: Icon }) => (
              <article className={styles.card} key={title}>
                <div className={styles.cardIcon}><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>PARENT PORTAL DIRECTION</p>
            <h2>Una frontera distinta al gameplay infantil.</h2>
            <p className={styles.sectionLead}>El roadmap incluye un Parent Portal separado del juego infantil. Su función futura es ayudar a adultos autorizados a comprender relaciones familiares, privacidad, exportación/eliminación de datos y límites comerciales sin trasladar esas responsabilidades al niño.</p>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}><span className={styles.stepNumber}>1</span><div><h3>Familia verificada</h3><p>La relación tutor–niño debe ser durable y verificable antes de exponer información sensible o controles.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>2</span><div><h3>Datos autorizados</h3><p>Solo se agregan datos que pertenezcan a la familia autorizada y que tengan una razón clara de existir.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>3</span><div><h3>Exportar, eliminar y desvincular</h3><p>Los flujos de privacidad deben ser operables, auditables y comprensibles para el adulto responsable.</p></div></div>
          </div>
        </div>
        <div className={`${styles.shell} ${styles.notice}`}>World Makers todavía no se presenta como beta pública. Esta página describe principios de producto y dirección de arquitectura, no promete una fecha de acceso ni afirma que el Parent Portal de producción esté disponible.</div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.shell} ${styles.audienceHero}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>INTERÉS FAMILIAR</p>
            <h2>Ya existe un registro adulto y persistente de interés.</h2>
            <p className={styles.sectionLead}>Las familias pueden registrar su correo y preferencias sin entregar datos de niños. El sistema separa claramente el interés en seguridad, Parent Portal o pruebas futuras de cualquier identidad infantil del videojuego.</p>
          </div>
          <div className={styles.callout}>
            <h3>Comunidad para familias</h3>
            <p>Registra únicamente datos de una persona adulta responsable y selecciona qué temas te interesan. El registro no garantiza acceso inmediato.</p>
            <Link className={styles.primaryButton} style={{ marginTop: 20, background: 'white', color: '#123b7a' }} href="/worldmakers/community?audience=family">Registrar interés <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
