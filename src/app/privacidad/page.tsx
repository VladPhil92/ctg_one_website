'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 py-4"
        style={{
          backgroundColor: 'rgba(5, 5, 5, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
        }}
      >
        <div className="max-w-6xl mx-auto px-8 lg:px-12">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-4 z-10">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src="/images/logo/CTGLOGO.jpeg"
                  alt="CTG One Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-outfit font-medium text-white tracking-wide">
                  CTG One
                </span>
                <span className="text-[9px] text-text-dim uppercase tracking-[0.2em]">
                  Corporation
                </span>
              </div>
            </a>
            <a
              href="/"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-medium text-text-dim hover:text-white transition-colors duration-500"
            >
              <ArrowLeft size={14} />
              Volver al inicio
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 lg:px-12 pt-32 pb-20">
        {/* Page Title */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={20} className="text-accent" style={{ color: 'var(--accent)' }} />
            <span
              className="text-[10px] uppercase tracking-[0.3em] font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Legal
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-4">
            Política de Privacidad
          </h1>
          <p className="text-sm text-text-dim">
            Última actualización: Marzo 2025
          </p>
        </div>

        {/* Policy Content */}
        <div className="space-y-12 text-[15px] leading-relaxed">
          {/* Introduction */}
          <section>
            <p className="text-text-muted">
              CTG One Corporation (en adelante, &quot;CTG One&quot;, &quot;nosotros&quot; o &quot;la Empresa&quot;), con domicilio en
              Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias, Colombia, se compromete a proteger la
              privacidad y los datos personales de los usuarios de sus plataformas digitales, incluyendo el
              sitio web <strong className="text-white">ctgone.com</strong> y la aplicación móvil{' '}
              <strong className="text-white">CTG Wallet</strong>.
            </p>
            <p className="text-text-muted mt-4">
              Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su
              información personal, en cumplimiento con la legislación colombiana vigente, en particular la
              Ley 1581 de 2012 (Ley de Protección de Datos Personales) y su Decreto Reglamentario 1377 de 2013.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              1. Responsable del tratamiento de datos
            </h2>
            <div className="glass-card rounded-lg p-6">
              <ul className="space-y-2 text-text-muted text-sm">
                <li><strong className="text-text-secondary">Razón Social:</strong> CTG One Corporation</li>
                <li><strong className="text-text-secondary">Dirección:</strong> Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias, Colombia</li>
                <li><strong className="text-text-secondary">Correo electrónico:</strong> direccion@ctgone.com</li>
                <li><strong className="text-text-secondary">Teléfono:</strong> +57 (5) 6661 7000</li>
                <li><strong className="text-text-secondary">Sitio web:</strong> www.ctgone.com</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              2. Información que recopilamos
            </h2>
            <p className="text-text-muted mb-4">
              Dependiendo del servicio o plataforma que utilice, podemos recopilar los siguientes tipos de
              información:
            </p>

            <h3 className="text-base font-outfit font-medium text-white mb-3 mt-6">
              2.1 Sitio web ctgone.com
            </h3>
            <ul className="list-disc list-inside space-y-2 text-text-muted ml-2">
              <li>Nombre y apellidos</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono</li>
              <li>Mensaje o consulta enviada a través del formulario de contacto</li>
              <li>Datos de navegación: dirección IP, tipo de navegador, páginas visitadas, tiempo de permanencia</li>
            </ul>

            <h3 className="text-base font-outfit font-medium text-white mb-3 mt-6">
              2.2 CTG Wallet (Aplicación Móvil)
            </h3>
            <ul className="list-disc list-inside space-y-2 text-text-muted ml-2">
              <li>Nombre completo y datos de identificación</li>
              <li>Correo electrónico y número de teléfono</li>
              <li>Dirección de wallet (clave pública) asociada al usuario</li>
              <li>Historial de transacciones realizadas dentro de la aplicación</li>
              <li>Datos del dispositivo: modelo, sistema operativo, identificador del dispositivo</li>
              <li>Datos de geolocalización (solo si el usuario otorga permiso explícito)</li>
              <li>Datos biométricos para autenticación (huella dactilar o Face ID), procesados localmente en el dispositivo</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              3. Finalidad del tratamiento
            </h2>
            <p className="text-text-muted mb-4">
              Los datos personales recopilados serán utilizados para las siguientes finalidades:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted ml-2">
              <li>Prestar los servicios ofrecidos a través de nuestras plataformas</li>
              <li>Gestionar la cuenta del usuario en CTG Wallet</li>
              <li>Procesar transacciones con el token CTGO y otros activos digitales</li>
              <li>Enviar notificaciones relacionadas con transacciones, seguridad y actualizaciones del servicio</li>
              <li>Mejorar la experiencia del usuario y la funcionalidad de nuestras plataformas</li>
              <li>Cumplir con obligaciones legales, regulatorias y contractuales</li>
              <li>Prevenir fraudes, actividades ilícitas y garantizar la seguridad de las plataformas</li>
              <li>Enviar comunicaciones comerciales y promocionales (solo con consentimiento previo del usuario)</li>
              <li>Análisis estadísticos internos y mejora de servicios</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              4. Base legal del tratamiento
            </h2>
            <p className="text-text-muted">
              El tratamiento de sus datos personales se realiza con base en:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted mt-4 ml-2">
              <li>Su <strong className="text-text-secondary">consentimiento</strong> previo, expreso e informado</li>
              <li>La <strong className="text-text-secondary">ejecución de un contrato</strong> o relación de servicio con el usuario</li>
              <li>El <strong className="text-text-secondary">cumplimiento de obligaciones legales</strong> aplicables</li>
              <li>El <strong className="text-text-secondary">interés legítimo</strong> de CTG One en la prestación segura de sus servicios</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              5. Almacenamiento y seguridad de los datos
            </h2>
            <p className="text-text-muted">
              CTG One implementa medidas técnicas, administrativas y organizacionales para proteger los datos
              personales contra acceso no autorizado, pérdida, alteración o destrucción. Entre estas medidas
              se incluyen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted mt-4 ml-2">
              <li>Cifrado de datos en tránsito (TLS/SSL) y en reposo</li>
              <li>Autenticación multifactor y controles de acceso</li>
              <li>Almacenamiento seguro de claves privadas mediante cifrado local en el dispositivo del usuario</li>
              <li>Monitoreo continuo de actividad sospechosa</li>
              <li>Copias de seguridad periódicas y redundantes</li>
              <li>Auditorías de seguridad regulares</li>
            </ul>
            <p className="text-text-muted mt-4">
              <strong className="text-text-secondary">Nota importante:</strong> CTG Wallet nunca almacena las claves
              privadas de los usuarios en servidores externos. Las claves privadas permanecen exclusivamente en
              el dispositivo del usuario.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              6. Compartir información con terceros
            </h2>
            <p className="text-text-muted">
              CTG One no vende, alquila ni comercializa sus datos personales. Podemos compartir información
              únicamente en los siguientes casos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted mt-4 ml-2">
              <li>Con proveedores de servicios tecnológicos que actúan como encargados del tratamiento, bajo acuerdos de confidencialidad</li>
              <li>Con las unidades de negocio del ecosistema CTG One, cuando sea necesario para prestar el servicio solicitado</li>
              <li>Con autoridades competentes, cuando exista una obligación legal o requerimiento judicial</li>
              <li>En transacciones blockchain, la información de la dirección pública de wallet es inherentemente visible en la red</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              7. Derechos del titular de los datos
            </h2>
            <p className="text-text-muted mb-4">
              De conformidad con la Ley 1581 de 2012, usted como titular de los datos tiene derecho a:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted ml-2">
              <li><strong className="text-text-secondary">Conocer:</strong> Acceder a sus datos personales que han sido objeto de tratamiento</li>
              <li><strong className="text-text-secondary">Actualizar:</strong> Solicitar la actualización de sus datos personales</li>
              <li><strong className="text-text-secondary">Rectificar:</strong> Solicitar la corrección de información parcial, inexacta o incompleta</li>
              <li><strong className="text-text-secondary">Suprimir:</strong> Solicitar la eliminación de sus datos cuando no exista obligación legal de conservarlos</li>
              <li><strong className="text-text-secondary">Revocar:</strong> Revocar la autorización otorgada para el tratamiento de sus datos</li>
              <li><strong className="text-text-secondary">Presentar quejas:</strong> Ante la Superintendencia de Industria y Comercio (SIC) en caso de violación a la normativa</li>
            </ul>
            <p className="text-text-muted mt-4">
              Para ejercer cualquiera de estos derechos, puede contactarnos a través de{' '}
              <a href="mailto:direccion@ctgone.com" className="text-white hover:underline" style={{ color: 'var(--accent)' }}>
                direccion@ctgone.com
              </a>.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              8. Cookies y tecnologías similares
            </h2>
            <p className="text-text-muted">
              Nuestro sitio web utiliza cookies y tecnologías similares para mejorar la experiencia de navegación.
              Las cookies pueden ser:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-muted mt-4 ml-2">
              <li><strong className="text-text-secondary">Esenciales:</strong> Necesarias para el funcionamiento del sitio web</li>
              <li><strong className="text-text-secondary">Analíticas:</strong> Para entender cómo los usuarios interactúan con el sitio</li>
              <li><strong className="text-text-secondary">De funcionalidad:</strong> Para recordar preferencias del usuario</li>
            </ul>
            <p className="text-text-muted mt-4">
              Puede configurar su navegador para rechazar cookies, aunque esto podría afectar algunas funcionalidades del sitio.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              9. Retención de datos
            </h2>
            <p className="text-text-muted">
              Los datos personales se conservarán durante el tiempo necesario para cumplir con las finalidades
              descritas en esta política, y según los plazos establecidos por la legislación colombiana vigente.
              Una vez cumplida la finalidad del tratamiento y los requisitos legales, los datos serán eliminados
              de forma segura.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              10. Menores de edad
            </h2>
            <p className="text-text-muted">
              Los servicios de CTG Wallet y las plataformas digitales de CTG One no están dirigidos a menores
              de 18 años. No recopilamos intencionalmente datos personales de menores de edad. Si detectamos
              que se han recopilado datos de un menor sin el consentimiento de su representante legal,
              procederemos a eliminarlos de inmediato.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              11. Transferencia internacional de datos
            </h2>
            <p className="text-text-muted">
              En caso de que los datos personales sean transferidos a servidores ubicados fuera de Colombia,
              CTG One garantiza que dichas transferencias se realizarán cumpliendo con los estándares de
              protección establecidos por la Ley 1581 de 2012 y las directrices de la Superintendencia de
              Industria y Comercio.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              12. Modificaciones a esta política
            </h2>
            <p className="text-text-muted">
              CTG One se reserva el derecho de actualizar esta Política de Privacidad en cualquier momento.
              Las modificaciones serán publicadas en esta página con la fecha de la última actualización.
              Recomendamos revisar esta política periódicamente.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-xl font-outfit font-medium text-white mb-4">
              13. Contacto
            </h2>
            <p className="text-text-muted mb-4">
              Si tiene preguntas, inquietudes o desea ejercer sus derechos sobre sus datos personales,
              puede contactarnos a través de:
            </p>
            <div className="glass-card rounded-lg p-6">
              <ul className="space-y-2 text-text-muted text-sm">
                <li><strong className="text-text-secondary">Correo electrónico:</strong>{' '}
                  <a href="mailto:direccion@ctgone.com" style={{ color: 'var(--accent)' }}>direccion@ctgone.com</a>
                </li>
                <li><strong className="text-text-secondary">Teléfono:</strong> +57 (5) 6661 7000</li>
                <li><strong className="text-text-secondary">Dirección:</strong> Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias, Colombia</li>
                <li><strong className="text-text-secondary">Sitio web:</strong>{' '}
                  <a href="https://ctgone.com" style={{ color: 'var(--accent)' }}>www.ctgone.com</a>
                </li>
              </ul>
            </div>
          </section>

          {/* Legal Footer */}
          <section
            className="pt-12 mt-12"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}
          >
            <p className="text-xs text-text-dim text-center">
              © {new Date().getFullYear()} CTG One Corporation. Todos los derechos reservados.
              <br />
              Cartagena de Indias, Colombia.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
