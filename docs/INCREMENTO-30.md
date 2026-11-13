# Incremento 30 · Metas del personal por páginas

La gestión de metas de prácticas del personal ya no descarga la lista completa. Docencia, supervisión y administración eligen primero una práctica desde un selector paginado con búsqueda en servidor y, después, consultan sus metas en páginas de 20 con filtros de todas, en progreso o completadas. El resumen global de metas completadas se calcula en SQL sobre toda la práctica, no sobre la página visible. La búsqueda por descripción también se resuelve en el servidor.

La edición en línea y la creación conservan su circuito confirmado. Cancelar una actualización no reinicia la búsqueda, el filtro ni las páginas cargadas. Guardar una meta vuelve a consultar la página vigente y el resumen global. El enlace directo con `practicaId` consulta solo esa práctica mediante un detalle exacto, sin cargar el listado de prácticas.

## API y alcance

Nuevas consultas bajo `/api/v1/equipo`:

| GET | Respuesta |
| --- | --- |
| `/practicas/{id}/metas/pagina` | Páginas de 1–40 metas (cliente pide 20) con `totalMetas` y `completadas` globales; `estado=TODAS\|EN_PROGRESO\|COMPLETADAS`; búsqueda `q` por descripción, máximo 120 caracteres y comodines literales. |
| `/practicas/{id}` | Resumen exacto de la práctica solicitada: practicante, aula, periodo, horas validadas y estado. 404 si no está visible para la cuenta. |

`/practicas/pagina` se reutiliza como selector y ahora comparte la consulta y la proyección con el detalle exacto. Las metas de tipo `HORAS` calculan su avance únicamente con horas validadas; las pendientes o rechazadas no cuentan. `totalMetas` y `completadas` no dependen del filtro ni de la búsqueda de la página.

No hay migraciones, cambios de esquema ni escrituras nuevas. Los endpoints anteriores de metas, creación y avance mantienen su contrato. Las metas del alumno (`/metas/practica/{id}`), el expediente y otros selectores que aún usan listas completas no se declaran paginados en este incremento.

## Verificación

Los ocho casos SQLite de páginas del personal pasaron, incluido el nuevo de metas: 20/20/5 con empates, horas validadas frente a pendientes/rechazadas, filtros completadas/en progreso con totales globales, búsqueda literal de `%`, permisos por rol, 404 fuera de la práctica y cursores de otra consulta. También se cubrió el detalle exacto de la práctica. TypeScript del cliente pasó.

El recorrido focal del navegador confirmó, con API simulada, selector de prácticas 20→40→45 y búsqueda en servidor; metas 20→40→45 con fallo de página y reintento; filtros y resumen global exactos; búsqueda por descripción con `%` literal; edición en línea cancelada sin perder la lista; formulario de nueva meta cancelado; enlace directo con `practicaId` que no consulta el listado; y anchos 360/390/430 px. No hubo listados completos, escrituras, errores de consola ni API ajena.

La base `ssp_test` sigue sin responder desde el 13 de noviembre (`tenant/user not found` en el pooler de Supabase), por lo que los recorridos reales y la suite `test:personal` quedaron pendientes de restablecer el proyecto. La captura y el reporte están en `.expo/dev/metas30-*`, fuera de Git. No se modificaron la presentación, su API, el APK entregado ni los datos ficticios publicados.
