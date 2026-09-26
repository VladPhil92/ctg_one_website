import type { Metadata } from 'next';
import Link from 'next/link';
import { NvetLegalPage } from '@/components/nvet/NvetLegalPage';
import { NVET_BETA_TERMS_VERSION } from '@/lib/nvetcareapp/legal';

export const metadata: Metadata = {
  title: 'Términos | Nvet Care',
  description: 'Términos de uso y participación de Nvet Care en su fase controlada de Cartagena.',
  alternates: { canonical: 'https://ctgone.com/nvetcareapp/terminos' },
};

export default function NvetTermsPage() {
  return (
    <NvetLegalPage eyebrow="Condiciones de uso" title="Términos de Nvet Care" version={NVET_BETA_TERMS_VERSION}>
      <section>
        <p>
          Estos términos regulan el acceso y participación en Nvet Care durante su fase controlada en Cartagena de Indias.
          Nvet es una plataforma tecnológica para coordinar servicios veterinarios; no sustituye el criterio clínico del
          profesional que presta la atención.
        </p>
      </section>

      <section>
        <h2>1. Elegibilidad y cuenta</h2>
        <p className="mt-3">
          Para utilizar funciones autenticadas debes mantener una cuenta válida, proteger tus credenciales y suministrar
          información razonablemente veraz. Determinadas funciones pueden estar restringidas a una cohorte de beta, a
          profesionales verificados o a roles específicos.
        </p>
      </section>

      <section>
        <h2>2. Profesionales veterinarios</h2>
        <p className="mt-3">
          Las decisiones clínicas corresponden al profesional veterinario responsable. Nvet puede verificar identidad,
          documentación y estado operativo antes de habilitar funciones profesionales, pero la plataforma no reemplaza
          las obligaciones éticas, técnicas o legales del ejercicio profesional.
        </p>
      </section>

      <section>
        <h2>3. Emergencias</h2>
        <p className="mt-3">
          Nvet no debe utilizarse como único canal ante una emergencia veterinaria. Si existe riesgo inmediato para la vida
          o integridad del animal, el usuario debe buscar atención de urgencias disponible sin esperar una respuesta de la plataforma.
        </p>
      </section>

      <section>
        <h2>4. Reservas y disponibilidad</h2>
        <p className="mt-3">
          La disponibilidad depende de profesionales, cobertura, horarios y capacidad operativa reales. Una reserva no
          garantiza una prestación que haya sido cancelada, rechazada por razones de seguridad o imposibilitada por fuerza
          mayor. Nvet debe informar el estado de la solicitud y evitar presentar disponibilidad ficticia.
        </p>
      </section>

      <section>
        <h2>5. Precios, pagos y comprobantes</h2>
        <p className="mt-3">
          El usuario debe conocer el precio o mecanismo de cálculo antes de confirmar una operación. Solo se consideran
          habilitados los medios de pago expresamente disponibles en el producto. La carga de un comprobante no equivale
          por sí sola a confirmación o liquidación de fondos.
        </p>
      </section>

      <section>
        <h2>6. Cancelaciones, disputas y soporte</h2>
        <p className="mt-3">
          Las condiciones aplicables a cancelación, reprogramación, rechazo, devolución o disputa deben mostrarse en el
          flujo correspondiente. Nvet puede bloquear temporalmente acciones cuando exista una controversia, un pago no
          resuelto o un riesgo para la integridad clínica, financiera o de seguridad.
        </p>
      </section>

      <section>
        <h2>7. Uso aceptable</h2>
        <p className="mt-3">
          No está permitido suplantar identidades, alterar comprobantes, eludir controles de acceso, acceder a información
          ajena, interferir con el servicio, utilizar la plataforma para fraude o incorporar contenido ilícito o innecesariamente sensible.
        </p>
      </section>

      <section>
        <h2>8. Datos personales y privacidad</h2>
        <p className="mt-3">
          El tratamiento de datos se rige por la <Link href="/nvetcareapp/privacidad">Política de Privacidad de Nvet Care</Link>.
          Cuando el backend exige una versión vigente de términos y privacidad, la reserva puede permanecer bloqueada hasta
          que el usuario realice una aceptación afirmativa de esas versiones.
        </p>
      </section>

      <section>
        <h2>9. Cuenta, seguridad y eliminación</h2>
        <p className="mt-3">
          El usuario puede gestionar sesiones, cambiar su contraseña cuando utilice identidad local y solicitar eliminación
          de cuenta. La eliminación puede posponerse mientras existan citas activas, disputas, movimientos financieros u
          otras obligaciones que deban resolverse primero.
        </p>
      </section>

      <section>
        <h2>10. Propiedad intelectual</h2>
        <p className="mt-3">
          La plataforma, marca, interfaz, software y contenidos propios de Nvet/CTG One se encuentran protegidos por las
          normas aplicables. El usuario conserva los derechos que correspondan sobre la información que aporte, sin perjuicio
          de las autorizaciones necesarias para prestar el servicio.
        </p>
      </section>

      <section>
        <h2>11. Información al consumidor</h2>
        <p className="mt-3">
          Nvet debe mostrar información cierta, suficiente, clara y actualizada sobre servicios, precios y condiciones de
          contratación. Los derechos imperativos del consumidor no se entienden renunciados por estos términos.
        </p>
        <p className="mt-3">
          Autoridad de protección al consumidor: <a href="https://www.sic.gov.co/" target="_blank" rel="noreferrer">Superintendencia de Industria y Comercio</a>.
        </p>
      </section>

      <section>
        <h2>12. Cambios, suspensión y fase beta</h2>
        <p className="mt-3">
          Durante la beta pueden suspenderse nuevas reservas por seguridad, integridad, disponibilidad o mantenimiento.
          Los cambios materiales de estos términos se versionan y pueden exigir una nueva aceptación. Esta versión no
          constituye por sí sola autorización de lanzamiento comercial abierto y permanece sujeta a revisión jurídica final.
        </p>
      </section>
    </NvetLegalPage>
  );
}
