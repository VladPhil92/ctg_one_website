# Fase 1 — Instalación y puesta en marcha controlada

**Estado:** código subido al repositorio; **no se ha creado ni migrado una base de datos real**. El portal no permite registros hasta configurar un proyecto Supabase dedicado. No se han desplegado Edge Functions. No usar con datos reales de menores hasta completar revisión legal y pruebas end-to-end.

## Lo que se implementó

1. Portal independiente en `/portal/index.html`, conservando el catálogo demostrativo anterior.
2. Registro e inicio de sesión de adultos mediante Supabase Auth (confirmación de correo configurable).
3. Alta de perfil de tutor, foto y acreditaciones en buckets privados; solicitudes de revisión.
4. Registro por representantes de fichas educativas **seudónimas** de menores, con estado de representación pendiente.
5. Tablas PostgreSQL con políticas RLS y permisos de columnas; estado privado de verificación docente/familiar.
6. Edge Function autenticada para registrar controles con tickets de evidencia y aprobar/rechazar/suspender, con bitácora.
7. Tests automatizados del cliente, validadores y verificaciones estáticas del esquema.

## Requisitos

- Proyecto Supabase **exclusivo** para Valderrama Learning Center; no reutilice los proyectos personales existentes.
- Node.js >=20.
- CLI oficial Supabase para migraciones y despliegue de funciones, o SQL Editor con control riguroso de versiones.
- Dominio HTTPS controlado y origin exacto para la función. En desarrollo local, `http://localhost:4173`.
- Responsable de privacidad y equipo de protección de menores designados.

## 1. Crear proyecto y aplicar migraciones

1. Crear un proyecto Supabase dedicado en la región y plan que apruebe el operador, tras evaluar tratamiento/transferencia de datos.
2. Instalar y verificar el CLI: `supabase --help` y `supabase migration --help`; autenticarse y ejecutar `supabase link --project-ref ID`.
3. Revisar el contenido de `supabase/migrations/20261030010000_phase1_core.sql` y `supabase/migrations/20261030020000_phase1_private_storage.sql`. Se prepararon como archivos SQL de versión porque el CLI no estaba disponible en el entorno de autoría.
4. Crear copia de seguridad y aplicar mediante flujo versionado (`supabase db push` conforme a la versión instalada). Comprobar la historia de migraciones.
5. Confirmar que **todas las 10 tablas** tienen RLS, que no hay políticas públicas para documentos, que los buckets no son públicos y que no se conceden actualizaciones de estados de revisión a clientes autenticados.
6. Ejecutar manualmente pruebas con dos cuentas de prueba diferentes: A no puede leer ni editar perfiles, fichas ni documentos privados de B. No almacenar las cuentas de prueba en GitHub.

## 2. Configurar autenticación

- Habilitar email/password y verificación del correo electrónico.
- Configurar URL del sitio y redirecciones aprobadas (dominio web y localhost solo en desarrollo).
- Configurar protección contra abuso, CAPTCHA/rate limits y políticas de autenticación. Evitar accesos de menores mediante cuentas personales en el MVP; las declaraciones del formulario por sí solas NO prueban mayoría de edad.
- No activar social login, mensajería ni reservas sin análisis de privacidad.

## 3. Configurar el portal

En un entorno que tenga Node.js:

```bash
export VLC_SUPABASE_URL='https://PROYECTO.supabase.co'
export VLC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_...'
npm run dev
# Navegar a http://localhost:4173/portal/index.html
```

Para hosting estático:

```bash
VLC_SUPABASE_URL='https://PROYECTO.supabase.co' \
VLC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_...' npm run build
```

Publicar la carpeta `dist/` y configurar HTTPS y encabezados de seguridad del hosting. Las variables con prefijo `VLC_` son públicas y se insertan en `portal/config.js` durante build. **Nunca** colocar `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_...` o contraseñas en dichas variables.

## 4. Activar revisión humana

La función está en `supabase/functions/review-application`; importa la biblioteca de Supabase con versión fijada 2.118.0. Comprobar las instrucciones actuales del CLI antes de ejecutar:

```bash
supabase functions deploy review-application
```

Establecer el secreto `ALLOWED_ORIGIN=https://dominio-exacto.example` en Supabase para el dominio autorizado. El proveedor gestiona `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno de funciones. **Nunca copiar estos secretos a la web, a los logs ni al repositorio.**

Asignar el primer revisor **solo desde una sesión administrativa protegida** (SQL Editor con rol suficientemente privilegiado), y después de validar la identidad del operador:

```sql
-- Reemplazar por el UUID de una cuenta adulta real, confirmada y autorizada.
insert into public.staff_members (user_id, staff_role)
values ('REEMPLAZAR-UUID-VALIDO', 'admin');
```

Esta capacidad no se concede a usuarios desde la interfaz ni mediante `user_metadata`. Aplicar MFA en las cuentas revisoras y separar funciones en producción.

### Pruebas de revisión

- Usuario normal: llamada a `review-application` debe devolver 403.
- Revisor: marcar un control con ticket interno `CTRL-1234`, tras evidencia humana previa.
- Aprobación de adulto sin **identidad+formación** verificadas y al menos una credencial confirmada: debe devolver 409.
- Aprobación para menores: restringida a admin, exige además controles legales y formación en protección infantil.
- Rechazo o suspensión: perfil `public_visible=false`.
- Intento del tutor de alterar `public_visible` o estados de revisión: debe fallar por permisos SQL.
- Familias: no se marca como representante verificado sin revisión humana y ticket; las reservas reales siguen deshabilitadas.
- Consulta del audit log por navegador: debe denegarse.
- Revisión de uploads: archivos fuera de carpetas de propiedad o con tipos no permitidos deben rechazarse.

**Advertencia:** tests de Node y CI no sustituyen la ejecución de estas pruebas contra la base de datos y el Storage configurados.

## 5. Criterio mínimo de operación

Antes de ofrecer tutorías reales con menores: completar evaluación jurídica de normas colombianas, verificación de tutor y representante, designación de responsable de protección, canal de incidentes atendido por personal real, régimen de conservación/supresión de documentos, pruebas de permisos cruzados, pentest, auditoría y protocolo de intervención. Aprobaciones de la plataforma nunca sustituyen deberes legales de sus responsables.

## Pendiente deliberadamente

- Reservas, pagos, agenda, mensajería, opiniones públicas reales, revisión automatizada de diplomas, protección de fraude avanzado, recuperación de contraseñas y retención automatizada.
- Manejo de casos de conflicto de custodia o representación y comprobación documental externa; no se recopilan tales documentos en el portal inicial.
- Despliegue de un proyecto dedicado con cuenta facturable y dominio; el usuario debe seleccionar y configurar la infraestructura correspondiente.

## Fuentes técnicas

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/functions/dependencies
