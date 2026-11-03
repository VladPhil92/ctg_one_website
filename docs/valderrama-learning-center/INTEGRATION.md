# Valderrama Learning Center — CTG One prelaunch (2026-11-03)

## Rutas y separación de productos
- `/jpvalderrama/learningcenter`: tutorías privadas y comercio JP Valderrama EXISTENTES. Se preservan.
- `/valderrama-learning-center`: página de incorporación de la nueva app en CTG One.
- `valderramalearnigncenter.ctgone.com`: host literal solicitado, atendido por el proxy (solo archivos estáticos permitidos) cuando haya DNS/TLS/hosting.
- `public/valderrama-learning-center/`: snapshot estático del repositorio canónico `VladPhil92/Valderrama-Learning-Center-App`.

## Producto multiplataforma: web, Android e iOS

El repositorio canónico VLC incorpora un cliente independiente **React Native/Expo en `mobile/`**. Android e iOS son requisitos de primera clase y no una etapa opcional. Web y ambos clientes consumirán la misma API versionada del dominio educativo y las mismas reservas, perfiles docentes y progresos académicos.

El snapshot estático de `public/valderrama-learning-center/` **no constituye sincronización de usuarios o reservas** y NO incluye el código de la app nativa. La arquitectura de sincronización está especificada en `docs/APP_MOVIL_SINCRONIZACION.md` del repositorio VLC. Ahora existe un laboratorio LOCAL Node.js + SQLite en `server/` y una interfaz web `sync/`, capaces de compartir reservas ficticias con el cliente móvil mediante `GET /v1/demo/snapshot` y cambios transaccionales. **No existe aún un backend de producción ni un servicio alojado**.

Las credenciales de la app educativa deben quedar separadas de servicios financieros CTG One, a menos que se diseñe y audite posteriormente un mecanismo explícito de federación de identidades. No copiar tokens de Wallet ni identificar menores como usuarios financieros.

## Límite de confianza
El proxy rechaza los paths no listados, en particular API y panel de usuario de CTG One. La app no comparte sesiones, medios de pago, identificación, balances, consentimiento ni datos privados con los servicios financieros del ecosistema. El portal VLC falla de forma segura sin configuración explícita. El demo heredado continúa 100 % en memoria con datos sintéticos. El nuevo laboratorio independiente en el repositorio VLC persiste **solo datos ficticios** en SQLite local; no está publicado desde CTG One y no debe exponerse sin autenticación y controles.

## Integración de la fase local (sin despliegue público)

En `VladPhil92/Valderrama-Learning-Center-App` ejecutar `npm run dev:sync`: la UI web de desarrollo está en `http://127.0.0.1:4180/sync/`. Los clientes móviles consultan la misma API; ver `docs/FASE3_SINCRONIZACION_LOCAL.md` del repositorio educativo.

**No añadir el proxy a rutas `/v1/demo/*` en CTG One** ni reutilizar la API ficticia como backend público: carece de identidad y autorización real. Para futuro acceso online, separar un backend productivo, con sesiones verificadas y permisos por cuenta, del laboratorio; planificar DNS, HTTPS y auditoría.

## Antes de publicación
1. Desplegar el branch revisado de CTG One con la copia VLC.
2. Configurar el subdominio en el servicio web y crear el registro DNS en el registrador.
3. Verificar certificado HTTPS y respuesta en la ruta raíz (sin filtrar rutas CTG One).
4. Revisar QA, privacidad, seguridad de infancia, accesibilidad, verificación de tutores y responsabilidades de las cuentas.
5. Solo entonces activar backend, moderación, reservas y pagos reales.

El cambio de repositorio **no crea un dominio vivo** ni reemplaza la necesidad de suscripciones y facturas externas.
