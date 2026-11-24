# Incremento 33 · Administración, reportes y auditoría por páginas

Las pantallas administrativas dejan de descargar listas completas. Aulas, directorio de usuarios, padrón de matrícula, reporte institucional y auditoría se consultan por páginas de 20 con búsqueda en servidor, filtros y totales globales calculados en SQL. La ficha de un aula se consulta con un detalle exacto antes de mostrar su padrón, y la auditoría resuelve en el servidor los nombres de aula y de estudiantes que antes cruzaba el cliente.

Los totales de las tarjetas cuentan todo el sistema, no la página visible: total de aulas y activas, total de usuarios y docentes, y resumen del programa (alumnos, docentes, prácticas y horas promedio). El padrón conserva la revisión del servidor para que matricular o retirar siga confirmándose contra el estado vigente. Las rutas completas anteriores se mantienen intactas para el APK fijado y para las operaciones de escritura; las pantallas nuevas ya no las usan.

## API y alcance

Seis lecturas nuevas bajo `/api/v1/admin`, solo ADMIN, sin migraciones ni escrituras:

| GET | Respuesta |
| --- | --- |
| `/usuarios/pagina?rol=TODOS\|ALUMNO\|PROFESOR\|SUPERVISOR\|ADMIN&q=&limite=20&cursor=` | Cuentas ordenadas por apellidos y nombres; `total` del filtro y `totalDocentes` global. |
| `/aulas/pagina?estado=TODAS\|ACTIVA\|CONCLUIDA&q=&limite=20&cursor=` | Aulas con docente y descripción; `total` del filtro y `aulasActivas` global. |
| `/aulas/{id}` | Ficha exacta del aula con descripción, estado y matrículas reales. |
| `/aulas/{id}/matriculas/pagina?estado=TODOS\|MATRICULADOS\|SIN_MATRICULA&q=&limite=20&cursor=` | Padrón paginado con `revision`, `matriculados` y `total` del filtro. |
| `/reportes/pagina?estado=TODAS\|ACTIVA\|CONCLUIDA&q=&limite=20&cursor=` | Resumen global en SQL y filas con inscritos, promedio de notas y asistencia por página. |
| `/auditoria/pagina?categoria=TODAS\|ASISTENCIA\|HORAS\|ADMIN&q=&limite=20&cursor=` | Actividad con `aulaNombre` y `estudiantes` resueltos en el servidor; búsqueda sobre responsable, acción y detalle. |

El orden es alfabético por nombre de aula o por apellidos y nombres de la cuenta, con desempate por ID. Los cursores quedan ligados a la consulta (usuario, filtro y búsqueda) y se rechazan con 422 si se reutilizan en otra. Límite fuera de 1–40 y filtros inválidos devuelven 422; una cuenta sin rol ADMIN recibe 403 y un aula inexistente 404. El selector de docentes para crear o reasignar un aula pide la primera página de 40 cuentas PROFESOR en orden alfabético y avisa cuando hay más; no se añadió un buscador específico de docentes.

La búsqueda de auditoría no incluye el nombre de aula resuelto ni los nombres de estudiantes, porque se resuelven después de la consulta. Se documenta así para no prometer un filtro que el servidor no aplica.

## Verificación

Los nueve casos SQLite de administración pasaron, incluido el nuevo de lecturas paginadas con volumen (24 aulas, 24 alumnos, 26 auditorías): páginas 20→resto por scope, totales globales, filtros, cursores de otro filtro con 422, límite inválido 422, 403 para supervisor/alumno/docente y 404 de aula inexistente. Los módulos de páginas del personal y de módulos reutilizados siguen verdes. TypeScript del cliente pasó.

El recorrido focal del navegador confirmó con API simulada: aulas y directorio 20→40→45 con búsqueda y filtros; reporte con resumen global exacto y filtros; auditoría 20→40→45 con categorías, búsqueda y detalle de asistencia expandible usando nombres del servidor; ficha de aula con detalle exacto y padrón 20→40→45; y anchos 360/390/430 px sin desborde. La suite real `test:personal` pasó completa: administración real consultó aulas, directorio, reporte y auditoría por páginas, y la etapa aislada repitió los recorridos con volumen. Cero peticiones a las rutas completas obsoletas y cero escrituras académicas.

La verificación HTTP real contra `ssp_test` confirmó los seis endpoints: 8 usuarios y 2 docentes, 3 aulas y 3 activas, detalle de `test-aula-1` con descripción e inscritos, padrón con revisión de 64 caracteres y 1 matriculado de 4, reporte con resumen global, 23 registros de auditoría, supervisor 403, filtros inválidos 422 y aula inexistente 404.

No se modificaron la presentación, su API, el esquema ni el APK entregado. Las pruebas de volumen usan datos ficticios y la base `ssp_test`.
