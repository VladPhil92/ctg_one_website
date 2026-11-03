# Integración CTG One — Prelanzamiento
Fecha: 2026-11-03

## Propiedad y alcance
- Repositorio canónico de la app: VladPhil92/Valderrama-Learning-Center-App.
- Host de producto indicado: https://valderramalearnigncenter.ctgone.com (con el orden de letras exacto solicitado).
- Producto distinto del servicio de tutorías privadas existente en /jpvalderrama/learningcenter de ctgone.com.
- No se comparten usuarios, sesiones, documentos privados, pagos ni bases de datos con CTG One.
- El proyecto VLC sigue siendo preoperativo: no aceptar inscripciones reales ni datos de menores.

## Arquitectura de entrega sin suscripciones
1. Ejecutar npm run check para generar dist/ y probar reglas.
2. Copiar únicamente el contenido estático de dist/ a public/valderrama-learning-center/ del repositorio CTG One (sin incluir .env, credenciales, ni supabase/migrations).
3. El proxy de CTG One atiende exclusivamente el host especificado y reescribe rutas públicas al namespace estático. Rutas /api, /dashboard y /_next no pertenecen a VLC.
4. Bloquear indexación mientras la experiencia siga siendo sintética.
5. El portal de cuentas continúa fallando de forma segura sin configuración publicable de Supabase.

## Pendiente para publicación
- Verificar titularidad del dominio y añadir CNAME o A/ALIAS según la plataforma que aloje el Next.js de CTG One.
- Dar de alta el dominio en la plataforma y verificar el certificado TLS.
- Asegurar que la actualización del snapshot VLC dentro de CTG One sea rastreable a un SHA específico; sincronizar nuevas versiones con revisión y pruebas.
- Revisar accesibilidad, privacidad, contratos y mecanismos de protección de infancia.
- Habilitar proveedores y backend solamente tras validar permisos de acceso, reserva transaccional, identidad, almacenamiento, RLS y moderación.
