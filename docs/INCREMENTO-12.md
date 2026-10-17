# Incremento 12 · Consulta administrativa de auditoría

Administración abre `/auditoria` desde su panel para consultar responsables, fechas y cambios registrados. La pantalla usa los endpoints existentes; no modifica el backend ni escribe datos de negocio.

- Acceso protegido ADMIN en navegación y servicio. El backend aplica el mismo permiso.
- Hasta 200 registros recientes, con fechas/horas de Lima. Filtros de asistencia/administración y búsqueda por responsable, aula o fecha; no se presenta la muestra reciente como historial completo.
- Asistencia: aula y día académico, resultado después del cambio y detalle por estudiante con valores anteriores/nuevos. Las propuestas antiguas no se presentan como registros previos; los duplicados se identifican y se indica cuántos registros históricos fueron conservados.
- Los nombres se resuelven mediante los listados administrativos existentes. Si falla una consulta auxiliar, la auditoría sigue disponible con una indicación; si un detalle de asistencia está dañado, solo ese detalle usa un mensaje alternativo.

## Verificación

- Tipos y exportación web de las 23 rutas correctos con Node/npm de Windows.
- `npm run test:auditoria`: filtros, búsqueda, nombres y cambios, detalle malformado, nombres no disponibles y ausencia del acceso en el panel docente. Todas las API están simuladas y se bloquean escrituras salvo login.
- Supabase de pruebas: ADMIN consulta la auditoría y el docente recibe 403. Chromium abre el detalle real de asistencia del incremento 11, con estudiante y valores anteriores/nuevos. Evidencias locales ignoradas: `.expo/dev/auditoria-integration.json` y `auditoria-mobile.png`. Solo consultas y login; cero errores de página y cero solicitudes a producción. Revisión visual móvil correcta.

Los eventos existentes no cambian ni se eliminan desde esta pantalla. El historial paginado más allá de los 200 eventos y la auditoría de revisiones de horas siguen pendientes.
