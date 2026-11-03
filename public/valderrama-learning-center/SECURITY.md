# Seguridad y divulgación responsable

Este proyecto es un prototipo. **No** recibe datos de estudiantes o docentes. No incluir información personal de menores, identificación, expedientes ni capturas de comunicaciones en GitHub Issues, pull requests, commits o registros públicos.

Si se detecta un riesgo de seguridad, reportarlo **de forma privada al responsable designado del proyecto** (canal pendiente de habilitación). No publicar detalles explotables ni ejemplos que incluyan información personal.

## Controles obligatorios antes de producción

- Identidad verificada y roles implementados en backend; autorización por objeto (IDOR) y políticas de acceso a nivel de fila.
- Datos y fotografías de menores no públicos, consentimiento parental verificable y permisos revocables.
- Expedientes docentes privados, almacenamiento cifrado, enlaces temporales y plazo de conservación definido.
- Auditoría y moderación de comunicaciones y reportes; prohibición de contactos no autorizados.
- Rate limiting, antispam, protección de carga de archivos, análisis de malware, registros de acceso y alertas.
- Revisión de dependencias, pruebas SAST/DAST y pentest por tercero antes de habilitar contratación real.
- Protocolo humano de incidentes, preservación proporcional de evidencia y coordinación con autoridades cuando corresponda.

No almacenes secretos en el repositorio. No confundir la simulación de autorización del formulario con un control de seguridad real.
