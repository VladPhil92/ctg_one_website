import type { Metadata } from 'next';
import Link from 'next/link';
import { NvetLegalPage } from '@/components/nvet/NvetLegalPage';
import { NVET_BETA_PRIVACY_VERSION } from '@/lib/nvetcareapp/legal';

export const metadata: Metadata = {
  title: 'Privacidad | Nvet Care',
  description: 'Política y aviso de privacidad de Nvet Care para el tratamiento de datos personales en Colombia.',
  alternates: { canonical: 'https://ctgone.com/nvetcareapp/privacidad' },
};

export default function NvetPrivacyPage() {
  return (
    <NvetLegalPage eyebrow="Privacidad y datos personales" title="Política de Privacidad de Nvet Care" version={NVET_BETA_PRIVACY_VERSION}>
      <section>
        <p>
          Nvet Care es una experiencia digital de CTG One Technology para coordinar servicios veterinarios y conservar
          el contexto operativo de cada mascota. Esta política explica qué información se trata, para qué se utiliza,
          con quién puede procesarse y cómo ejercer los derechos del titular.
        </p>
        <p className="mt-3">
          <strong>Responsable:</strong> CTG One Technology · Cartagena de Indias, Colombia ·
          {' '}<a href="mailto:direccion@ctgone.com">direccion@ctgone.com</a>.
        </p>
      </section>

      <section>
        <h2>1. Información tratada</h2>
        <ul className="mt-3 space-y-2">
          <li>Identidad y contacto: nombre, apellidos, correo, teléfono y estado de verificación.</li>
          <li>Datos de cuenta y seguridad: sesiones, dispositivos, eventos de autenticación, 2FA y auditoría.</li>
          <li>Información de mascotas: identificación, especie, raza, edad, peso, antecedentes y registros asociados.</li>
          <li>Información de reservas y atención: profesional, fecha, dirección, estado de la cita, notas y comunicación relacionada.</li>
          <li>Información clínica veterinaria documentada por profesionales durante la prestación del servicio.</li>
          <li>Ubicación cuando el usuario habilita una función que la requiera; no se utiliza como dato público del perfil.</li>
          <li>Información operativa y evidencia de pagos cuando un medio de pago se encuentre habilitado.</li>
          <li>Información profesional de veterinarios necesaria para validación, habilitación, trazabilidad y prestación del servicio.</li>
          <li>Datos técnicos mínimos para seguridad, diagnóstico de errores, continuidad y mejora del producto.</li>
        </ul>
      </section>

      <section>
        <h2>2. Finalidades</h2>
        <ul className="mt-3 space-y-2">
          <li>Crear, autenticar y proteger cuentas.</li>
          <li>Coordinar búsqueda, reserva, atención, seguimiento y soporte veterinario.</li>
          <li>Mantener continuidad del historial operativo y clínico de la mascota.</li>
          <li>Verificar profesionales y aplicar controles de acceso por rol y propósito.</li>
          <li>Procesar, conciliar y auditar medios de pago efectivamente habilitados.</li>
          <li>Prevenir fraude, abuso, accesos indebidos e incidentes de seguridad.</li>
          <li>Atender peticiones, consultas, reclamos y ejercicio de derechos del titular.</li>
          <li>Medir y mejorar el producto cuando exista la base jurídica y la preferencia correspondiente.</li>
          <li>Cumplir obligaciones legales, contractuales, contables, de seguridad o de trazabilidad aplicables.</li>
        </ul>
      </section>

      <section>
        <h2>3. Autorización y consentimiento</h2>
        <p className="mt-3">
          Cuando la normativa exige autorización, Nvet solicita una acción afirmativa previa e informada. La aceptación de
          términos, privacidad y consentimientos específicos se registra por versión y fecha cuando el flujo lo requiere.
          Las comunicaciones de marketing, cuando lleguen a habilitarse, deben manejarse de forma separada de los avisos
          estrictamente necesarios para prestar el servicio.
        </p>
      </section>

      <section>
        <h2>4. Proveedores e integraciones</h2>
        <p className="mt-3">
          Para operar Nvet pueden intervenir proveedores tecnológicos bajo el alcance realmente habilitado en producción.
          La configuración actual contempla infraestructura de Railway, almacenamiento de archivos mediante Cloudinary,
          entrega de correo mediante SendGrid cuando el canal productivo se encuentra activo, observabilidad con Sentry y
          federación opcional de identidad con CTG One/Supabase. Los medios de pago se declaran únicamente cuando hayan
          sido habilitados y certificados para la fase correspondiente.
        </p>
        <p className="mt-3">
          Estos proveedores no reciben automáticamente todas las categorías de información. El dato transmitido depende
          de la función utilizada, la configuración vigente y el principio de minimización.
        </p>
      </section>

      <section>
        <h2>5. Transferencias y transmisiones internacionales</h2>
        <p className="mt-3">
          Algunos proveedores de infraestructura pueden procesar información fuera de Colombia. Cuando aplique una
          transferencia o transmisión internacional de datos, Nvet debe mantener la relación jurídica, instrucciones y
          salvaguardas exigibles conforme al régimen colombiano de protección de datos.
        </p>
      </section>

      <section>
        <h2>6. Conservación, seguridad y pseudonimización</h2>
        <p className="mt-3">
          La información se conserva durante el tiempo necesario para la finalidad informada, seguridad, resolución de
          disputas y obligaciones aplicables. La plataforma utiliza controles de autenticación, autorización por rol,
          cifrado en tránsito, registros de auditoría, límites de tasa y mecanismos de recuperación.
        </p>
        <p className="mt-3">
          Tras eliminar una cuenta se eliminan credenciales, sesiones y datos operativos que ya no deban conservarse.
          Registros clínicos, financieros, profesionales o de auditoría pueden mantenerse de forma limitada o
          pseudonimizada cuando sea necesario para continuidad veterinaria, trazabilidad, prevención de fraude o una
          obligación legal.
        </p>
      </section>

      <section>
        <h2>7. Derechos del titular</h2>
        <p className="mt-3">
          Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos; solicitar prueba de la autorización
          cuando corresponda; ser informado del uso; revocar la autorización en los casos permitidos; y presentar consultas
          o reclamos. También puedes acudir a la Superintendencia de Industria y Comercio cuando se cumplan los presupuestos legales.
        </p>
        <p className="mt-3">
          Solicitudes: <a href="mailto:direccion@ctgone.com">direccion@ctgone.com</a>. La eliminación de cuenta también
          dispone de un flujo de autoservicio desde el centro de cuenta de Nvet.
        </p>
      </section>

      <section>
        <h2>8. Cookies y tecnologías similares</h2>
        <p className="mt-3">
          Nvet distingue tecnologías necesarias de analíticas opcionales. Puedes aceptar, rechazar o modificar las
          preferencias desde el control de Cookies visible en la interfaz. Consulta la{' '}
          <Link href="/nvetcareapp/cookies">Política de Cookies</Link>.
        </p>
      </section>

      <section>
        <h2>9. Menores y datos de terceros</h2>
        <p className="mt-3">
          La persona que registra información de una mascota debe estar legitimada para hacerlo y evitar incorporar datos
          personales de terceros que no sean necesarios. Cualquier tratamiento relacionado con menores de edad debe observar
          el estándar reforzado previsto por la legislación colombiana y el interés superior del menor.
        </p>
      </section>

      <section>
        <h2>10. Marco normativo</h2>
        <p className="mt-3">
          Esta política se estructura principalmente bajo la Constitución Política de Colombia, la Ley 1581 de 2012 y su
          reglamentación compilada en el Decreto 1074 de 2015; las reglas de comercio electrónico y mensajes de datos de la
          Ley 527 de 1999; el Estatuto del Consumidor —Ley 1480 de 2011 y sus modificaciones—; y las normas aplicables al
          ejercicio y ética profesional veterinaria, entre ellas las Leyes 73 de 1985 y 576 de 2000. Las comunicaciones
          comerciales deben observar además las reglas aplicables de contacto y exclusión.
        </p>
      </section>

      <section>
        <h2>11. Cambios y revisión</h2>
        <p className="mt-3">
          Una modificación material de finalidades, categorías de datos, proveedores o funcionalidades puede requerir una
          nueva versión y, cuando corresponda, una nueva aceptación. Esta versión forma parte de la preparación de la beta
          controlada y permanece sujeta a revisión jurídica responsable antes de autorizar un lanzamiento comercial abierto.
        </p>
      </section>
    </NvetLegalPage>
  );
}
