# Incremento 10 · Publicación y entrega escrita de tareas

El docente publica una tarea desde su aula y el alumno puede enviar una respuesta escrita con comentario opcional. La entrega aparece en la revisión docente existente y la nota vuelve a ser visible para el alumno.

## Comportamiento

- `/tareas-docente?aulaId=...`, protegida para PROFESOR/ADMIN: listado y publicación con título, instrucciones y fecha límite opcional. Una fecha civil vence a las 23:59:59 de Lima. Solo el docente responsable o administración gestiona el aula.
- En el detalle de tarea ALUMNO: acceso a entrega escrita, revisión y confirmación antes de enviar. Requiere matrícula y admite una sola entrega. Las entregas nuevas fuera de plazo quedan bloqueadas; excepciones y reemplazos siguen pendientes.
- Los formularios comprueban las capacidades del servidor antes de activarse. El backend público anterior sigue permitiendo la consulta ya disponible, pero no ofrece estas operaciones nuevas.
- Publicación con solicitudId y entrega única por tarea/alumno. Un reintento del mismo contenido conserva el registro. Ante un resultado incierto, la app consulta lo guardado; si no figura, conserva el contenido y permite confirmar la misma solicitud.
- Las rutas del backend limitan acceso por rol/aula, serializan las comprobaciones de duplicados y verifican propietario/aula de un archivo recibido desde otros clientes. No cambió el esquema de datos.

## Verificación

Con Node/npm y Python de Windows:

- Tipos y exportación web de las 22 rutas correctos.
- Cuatro pruebas aisladas del backend: permisos, datos, plazos, aula concluida, duplicados y archivos ajenos.
- `npm run test:tareas`: publicación y entrega con confirmación; recuperación de respuestas perdidas con un solo POST por operación; validación y protección frente a servidor anterior.
- Supabase de pruebas: altas y entregas simultáneas con una sola tarea/entrega, permisos entre cuentas y recorrido Chromium docente → alumno → docente → alumno. Publicación, respuesta, calificación y consulta final de nota 18. Evidencias locales ignoradas: `.expo/dev/tareas-integration.json` y `tareas-mobile.png`.
- Recorrido sin errores de página ni solicitudes a producción. Revisión visual móvil realizada.

Contratos: `docs/TAREAS-Y-ENTREGAS.md` del backend de desarrollo, commit [feed69e](https://github.com/BastleyNait/BACK-CS-DE-LA-COM/commit/feed69e9a4b3d8106ed73da0a5814fdb40d89b3b). La rama aún no se integró ni desplegó a producción.

## Pendientes

Archivos persistentes, edición de tareas, reemplazos, excepciones de plazo y avisos de nuevas publicaciones. El incremento habilita respuestas escritas; no presenta carga ni descarga de adjuntos como disponibles.
