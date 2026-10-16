# Incremento 5 · Revisión docente

Profesores y administración acceden desde **Mis aulas · Docencia** a las aulas disponibles para su cuenta. Se agregan búsqueda, avance académico de estudiantes, filtro de entregas sin calificar, detalle del contenido y libro de notas por estudiante.

La calificación admite enteros de 0 a 20 y observaciones. Requiere revisar y confirmar, bloquea doble envío y muestra éxito solo después de recibir la misma entrega y nota confirmadas. Ante un resultado incierto obliga a consultar el estado antes de reenviar. Al regresar al aula se actualizan las entregas y notas. Las rutas están protegidas por rol y las consultas se cancelan al salir o cambiar de sesión.

## Contrato

Fuente: OpenAPI desplegado y routers `aulas.py`/`profesor.py` de `BastleyNait/BACK-CS-DE-LA-COM`, consultados el 16 de octubre de 2026.

- `GET /api/v1/aulas`: profesor ve sus aulas; administración ve todas.
- `GET /api/v1/profesor/practicantes`: seguimiento de los alumnos inscritos.
- `GET /api/v1/profesor/aulas/{aula_id}/entregas`: entregas del aula autorizada.
- `PUT /api/v1/profesor/entregas/{entrega_id}/calificar`: JSON `nota`, `retroalimentacion`; respuesta 200 con entrega calificada.
- `GET /api/v1/profesor/aulas/{aula_id}/libro`: notas, promedio, asistencia académica y acumulado de horas.

El servidor comprueba rol y docente asignado al consultar entregas/libro y calificar. El móvil valida también los identificadores de la respuesta. El acumulado de horas sigue identificado como dato del servidor que puede incluir pendientes. Los adjuntos se revisan en la plataforma académica; no se agregan cargas ni descargas mientras siga pendiente el almacenamiento persistente.

## Verificación necesaria

- TypeScript y exportación web con Node/npm de Windows.
- Un recorrido Chromium focalizado: acceso, nota inválida, revisión antes del envío, nota cero, actualización al regresar, estudiantes, libro y consulta tras error. Todos los PUT usan respuestas simuladas; no se modifican calificaciones reales.
- Consulta real de lectura con la cuenta docente de prueba autorizada; escritura bloqueada salvo login.
- Preflight PUT de calificación desde `http://localhost:5173`: HTTP 200.

No se repiten las suites anteriores ni se agregan pruebas unitarias redundantes. Continúan pendientes el registro de asistencia académica, creación de tareas, archivos persistentes y correcciones del circuito de horas.
