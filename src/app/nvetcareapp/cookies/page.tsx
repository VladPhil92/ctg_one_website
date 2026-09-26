import type { Metadata } from 'next';
import { NvetLegalPage } from '@/components/nvet/NvetLegalPage';
import { NVET_COOKIE_POLICY_VERSION } from '@/lib/nvetcareapp/legal';

export const metadata: Metadata = {
  title: 'Cookies | Nvet Care',
  description: 'Política de cookies y tecnologías similares de Nvet Care.',
  alternates: { canonical: 'https://ctgone.com/nvetcareapp/cookies' },
};

export default function NvetCookiesPage() {
  return (
    <NvetLegalPage eyebrow="Preferencias de navegación" title="Política de Cookies de Nvet Care" version={NVET_COOKIE_POLICY_VERSION}>
      <section>
        <p>
          Esta política explica las cookies, almacenamiento local y tecnologías similares utilizadas en las superficies web
          de Nvet Care. El control “Cookies” permite revisar y modificar las preferencias en cualquier momento.
        </p>
      </section>

      <section>
        <h2>1. Tecnologías necesarias</h2>
        <p className="mt-3">
          Son las necesarias para autenticación, sesión, seguridad, protección contra abuso y conservación de la preferencia
          de consentimiento. No se utilizan para publicidad comportamental. Las cookies de sesión de Nvet se configuran como
          HttpOnly cuando contienen credenciales, por lo que no quedan disponibles para JavaScript del navegador.
        </p>
      </section>

      <section>
        <h2>2. Analíticas opcionales</h2>
        <p className="mt-3">
          Nvet puede utilizar medición propia para conocer eventos agregados de uso y mejorar la experiencia. En las rutas de
          Nvet, la recolección analítica opcional debe respetar la preferencia almacenada por el usuario y no activarse antes
          de una decisión afirmativa cuando el tratamiento requiera consentimiento.
        </p>
      </section>

      <section>
        <h2>3. Marketing</h2>
        <p className="mt-3">
          Las cookies de marketing no están habilitadas en esta versión de Nvet Care. Si en el futuro se integran redes
          publicitarias, remarketing o perfiles comerciales, la política y el panel de consentimiento deberán actualizarse
          antes de su activación.
        </p>
      </section>

      <section>
        <h2>4. Preferencia de consentimiento</h2>
        <p className="mt-3">
          La decisión se guarda en el navegador con una versión de política y una fecha de decisión. La preferencia puede
          mantenerse hasta 180 días y vuelve a solicitarse cuando cambia materialmente la versión de esta política.
        </p>
      </section>

      <section>
        <h2>5. Cómo cambiar tu decisión</h2>
        <p className="mt-3">
          Usa el botón “Cookies” que permanece disponible en las páginas de Nvet. También puedes borrar datos del sitio desde
          la configuración del navegador; al hacerlo, Nvet volverá a solicitar la preferencia cuando corresponda.
        </p>
      </section>

      <section>
        <h2>6. Relación con la privacidad</h2>
        <p className="mt-3">
          Cuando una cookie o identificador permite asociar información a una persona identificada o identificable, su
          tratamiento debe observar la Política de Privacidad y las reglas colombianas aplicables a datos personales.
        </p>
      </section>
    </NvetLegalPage>
  );
}
