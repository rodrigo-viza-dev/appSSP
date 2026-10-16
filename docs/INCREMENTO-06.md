# Incremento 6 · Asistencia académica

Desde el aula docente, profesores y administración pueden consultar la asistencia de una fecha, corregir presentes/ausentes, revisar la lista completa y confirmar su guardado. La fecha inicial corresponde a Lima. Cambiar de fecha exige una nueva consulta; se rechazan fechas inexistentes.

La pantalla explica una limitación del contrato: el backend propone `presente=true` cuando no existe un registro previo y no devuelve si cada fila fue guardada. Por ello una consulta no se presenta como constancia de asistencia. Solo un POST confirmado muestra éxito. Se diferencia expresamente la asistencia académica de las jornadas de empresa y la validación de horas.

## Contrato

Fuente: OpenAPI y `app/routers/profesor.py` del backend confirmado, consultados el 16 de octubre de 2026.

- `GET /api/v1/profesor/aulas/{aula_id}/asistencia?fecha=AAAA-MM-DD` devuelve `aulaId`, `fecha` e `items` con identificador, nombre y presencia.
- `POST` sobre la misma ruta recibe `fecha` e `items` con `practicanteId`/`presente`. Reemplaza los registros de esa fecha y responde HTTP 200 con la lista.
- El servidor comprueba rol y docente asignado al aula. El móvil conserva el padrón consultado, impide duplicados y exige que el resultado confirmado tenga la misma fecha, aula, estudiantes y decisiones.
- Bloqueo de doble envío, cancelación al salir, manejo de 401 y consulta obligatoria tras resultados inciertos. No hay reintentos automáticos ni guardado de listas vacías.

## Verificación necesaria

TypeScript, un único recorrido Chromium de fechas/lista/confirmación/recuperación y exportación web con Node/npm de Windows: correctos. El guardado usa respuestas simuladas. La consulta real de asistencia respondió HTTP 200 con la cuenta docente de prueba autorizada y bloqueo de todos los POST salvo login; no se modificó asistencia real.

Pendiente del backend: distinguir registros existentes de los valores propuestos, validar el padrón recibido también en servidor y ofrecer auditoría de correcciones. No se automatizan alertas ni retiro de estudiantes.
