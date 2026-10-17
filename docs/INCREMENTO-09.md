# Incremento 9 · Bitácora y validación de horas

El alumno puede registrar una actividad real y consultar sus horas pendientes, validadas y rechazadas. El supervisor vinculado al centro puede validar o rechazar cada registro, con revisión y confirmación explícitas. Solo las horas validadas suman al avance.

## App

- Nueva ruta protegida `/mis-horas`, accesible desde el panel ALUMNO/SUPERVISOR. Conserva los componentes y colores UNSA; la demo mantiene su flujo independiente.
- Selección de práctica, estados de consulta, actualización manual y totales calculados desde los registros. El alumno registra fecha, 1–24 horas enteras y descripción; el registro nace pendiente. Este rango es una validación de datos, no un mínimo académico diario.
- La confirmación no reenvía automáticamente. Cada alta tiene un identificador de solicitud; ante una respuesta incierta, se consulta ese registro y se conserva la solicitud si hace falta volver a confirmar. Una revisión incierta se vuelve a consultar antes de mostrar acciones nuevas.
- La app exige `versionHoras: 1` del backend antes de cargar el circuito. Un servidor anterior muestra la función como no disponible.

## Backend de desarrollo

Permisos por práctica para alumno propietario, docente responsable, supervisor vinculado y administración. El supervisor solo revisa las prácticas de su centro. Alta exclusiva del alumno; aprobación/rechazo exclusivos del supervisor vinculado. Las decisiones finales no se cambian desde este flujo.

Las escrituras bloquean la práctica para serializar altas, revisiones y cierre. Repetir una solicitud no crea otro registro; repetir una aprobación no vuelve a sumar. Se corrigen el cómputo de horas, el acceso a historial/reporte y los permisos de cierre. Se usan las tablas existentes, sin migración ni reinicialización.

Detalles y contratos: `docs/CIRCUITO-HORAS.md` del backend, en su rama `desarrollo/entorno-supabase-pruebas`, commit [78a7632](https://github.com/BastleyNait/BACK-CS-DE-LA-COM/commit/78a7632aa4c0e4b82cf914bf1b0190be9854a966). El backend público anterior conserva su versión desplegada.

## Verificación

- Tipos y exportación web de las 21 rutas, con Node/npm de Windows.
- `npm run test:horas`: recorrido Chromium con respuestas simuladas; confirmación previa, recuperación de un POST guardado cuya respuesta falla, una sola alta, revisión del supervisor, avance visible para el alumno y bloqueo de servidor antiguo.
- Backend: cinco pruebas aisladas de permisos, validación de datos, deduplicación, aprobación/rechazo, acumulado y cierre.
- Integración real en Supabase de pruebas: solicitudes de alta y aprobación concurrentes, permisos entre cuentas y recorrido alumno → supervisor → alumno. Evidencia local ignorada: `.expo/dev/horas-integration.json`.
- Resultado: una sola alta al enviar simultáneamente la misma solicitud; una sola suma al aprobar simultáneamente; rechazo sin sumar. El recorrido agregó 5 horas ficticias validadas y dejó 1 rechazada, con cero errores de página y cero solicitudes a producción. Revisión visual móvil realizada.

## Pendientes

Borradores persistentes/sin conexión, edición o reenvío de rechazados, observaciones y auditoría persistente de la revisión. El cierre aún necesita su checklist académico completo. Este incremento registra actividades declaradas; GPS, jornadas cronometradas persistentes y notificaciones push siguen pendientes.
