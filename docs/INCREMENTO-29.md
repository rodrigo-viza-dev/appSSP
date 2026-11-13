# Incremento 29 · Tareas docentes por páginas y detalle exacto

Publicar y consultar tareas del aula ya no descarga la lista completa. El docente y administración ven páginas de 20 tareas ordenadas de la más reciente a la más antigua, con búsqueda por título en el servidor y el conteo de entregas recibidas por tarea. Abrir una tarea consulta únicamente esa tarea, con sus instrucciones completas y su revisión vigente, para editar el contenido o ampliar el plazo.

La publicación conserva revisión y confirmación explícita. Si la confirmación se pierde, la consulta del envío busca la tarea por su identificador de solicitud en vez de descargar el listado completo. La edición en línea se abre bajo la fila elegida y, al cancelarla o guardarla, la lista conserva su búsqueda y sus páginas cargadas. Publicar o editar sigue invalidando los resúmenes del aula mediante el proveedor de datos del personal.

## API y alcance

Nuevas consultas bajo `/api/v1/equipo`:

| GET | Respuesta |
| --- | --- |
| `/aulas/{id}/tareas/pagina` | Páginas de 1–40 tareas (cliente pide 20) con `resumen` de hasta 180 caracteres, plazo, creación, revisión máxima y número de entregas; búsqueda `q` por título, máximo 120 caracteres y comodines literales. |
| `/aulas/{id}/tareas/{tarea}` | Tarea individual del aula solicitada con instrucciones completas y revisión máxima; 404 si no pertenece al aula. |

Ambas revalidan responsabilidad docente o administración. La revisión se obtiene con `MAX` sobre los cambios registrados, sin materializar el contenido histórico. El conteo de entregas se calcula y agrega en SQL. La página no incluye instrucciones largas ni archivos.

No hay migraciones, cambios de esquema ni escrituras nuevas. Las rutas anteriores de publicación y edición mantienen su contrato, y el listado completo anterior sigue disponible para clientes que aún lo usen. Asistencia por día, horas y gestión del supervisor, administración/reportes, metas y otros selectores de prácticas continúan usando listas completas; este incremento no los declara paginados.

## Verificación

Los siete casos SQLite de páginas del personal pasaron, incluido el nuevo de tareas: 20/20/5 con empates, orden descendente, búsqueda literal de `%`, proyecciones sin instrucciones, revisión máxima y conteo de entregas sin cargar contenido histórico, detalle exacto, 404 fuera del aula y permisos por rol. TypeScript del cliente pasó.

El recorrido focal del navegador confirmó, con API simulada, páginas 20→40→45 con fallo y reintento, búsqueda en servidor, apertura del detalle exacto para editar, cancelación que conserva búsqueda y página, y anchos 360/390/430 px. No hubo listados completos de tareas, escrituras, errores de consola ni API ajena.

La base `ssp_test` no responde desde el 13 de noviembre (`tenant/user not found` en el pooler de Supabase), por lo que el recorrido real docente y la suite `test:personal` quedaron pendientes de restablecer el proyecto. La captura y el reporte están en `.expo/dev/tareas29-*`, fuera de Git. No se modificaron la presentación, su API, el APK entregado ni los datos ficticios publicados.
