# Valderrama Learning Center — CTG One prelaunch (2026-11-03)

## Rutas y separación de productos
- `/jpvalderrama/learningcenter`: tutorías privadas y comercio JP Valderrama EXISTENTES. Se preservan.
- `/valderrama-learning-center`: página de incorporación de la nueva app en CTG One.
- `valderramalearnigncenter.ctgone.com`: host literal solicitado, atendido por el proxy (solo archivos estáticos permitidos) cuando haya DNS/TLS/hosting.
- `public/valderrama-learning-center/`: snapshot estático del repositorio canónico `VladPhil92/Valderrama-Learning-Center-App`.

## Límite de confianza
El proxy rechaza los paths no listados, en particular API y panel de usuario de CTG One. La app no comparte sesiones, medios de pago, identificación, balances, consentimiento ni datos privados con los servicios financieros del ecosistema. El portal VLC falla de forma segura sin configuración explícita. El demo opera 100 % en memoria con datos sintéticos.

## Antes de publicación
1. Desplegar el branch revisado de CTG One con la copia VLC.
2. Configurar el subdominio en el servicio web y crear el registro DNS en el registrador.
3. Verificar certificado HTTPS y respuesta en la ruta raíz (sin filtrar rutas CTG One).
4. Revisar QA, privacidad, seguridad de infancia, accesibilidad, verificación de tutores y responsabilidades de las cuentas.
5. Solo entonces activar backend, moderación, reservas y pagos reales.

El cambio de repositorio **no crea un dominio vivo** ni reemplaza la necesidad de suscripciones y facturas externas.
