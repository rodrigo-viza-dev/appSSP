# Incremento 4: avisos reales de la cuenta

Implementado el 16 de octubre de 2026.

## Alcance

El panel de los cuatro roles incorpora un contador y acceso a **Mis avisos**. La ruta autenticada `/mis-avisos` permite consultar los avisos de la cuenta, filtrar todos/sin leer/leídos y marcar un aviso o toda la bandeja como leídos.

La bandeja y el contador comparten el mismo estado durante la sesión. Un marcado actualiza ese estado únicamente después de la confirmación HTTP 204 del backend. Las consultas fallidas se muestran como estado desconocido, sin presentarlas como cero pendientes. Actualizar la bandeja vuelve a consultar el servidor.

Los avisos de la demo siguen separados. No se implementaron push, sondeo periódico, restauración de sesión ni enlaces automáticos a tareas: el contrato de notificación no incluye un identificador de aula/tarea. Los nuevos avisos se consultan al ingresar o mediante **Actualizar avisos**.

## Contrato

Revisados el [OpenAPI desplegado](https://back-cs-de-la-com.vercel.app/openapi.json) y el [router de notificaciones](https://github.com/BastleyNait/BACK-CS-DE-LA-COM/blob/main/app/routers/notificaciones.py).

| Operación | Ruta | Respuesta esperada |
| --- | --- | --- |
| Consultar avisos propios | `GET /api/v1/notificaciones` | Lista JSON |
| Marcar un aviso | `PUT /api/v1/notificaciones/{notif_id}/read` | HTTP 204, sin cuerpo |
| Marcar todos | `PUT /api/v1/notificaciones/read-all` | HTTP 204, sin cuerpo |

Las solicitudes usan Bearer token. Los PUT no envían cuerpo ni ID de usuario. El cliente valida los campos, el usuario destinatario y la ausencia de IDs duplicados antes de mostrar una lista. Los tipos futuros de aviso conservan una etiqueta genérica. Las fechas se presentan en hora de Lima.

El backend filtra los avisos y las actualizaciones por el usuario autenticado. Los controles del cliente no sustituyen esa autorización. No se probó acceso a datos reales de otras cuentas.

## Estado y errores

- Solo las respuestas 204 confirman un marcado. Una respuesta exitosa incompatible también se trata como error.
- Un fallo de escritura conserva el estado de lectura previo y permite consultar el resultado mediante una actualización. No se repiten escrituras automáticamente.
- Una solicitud en curso impide pulsaciones y marcados simultáneos, evitando aplicar respuestas fuera de orden.
- HTTP 403 conserva la sesión. HTTP 401 de la cuenta actual devuelve al ingreso.
- Al cerrar sesión se cancelan las consultas y escrituras; las respuestas tardías de una cuenta no modifican otra.
- Volver al panel conserva el contador compartido y permite completar una lectura que ya estaba en curso para esa misma cuenta.

El cliente HTTP conserva las llamadas GET/POST anteriores y agrega opciones para PUT y estado esperado. Las consultas comunes se extraen a `use-session-query.ts`; `use-student-query.ts` mantiene la restricción de alumno para aulas y centro. El formato de fechas se comparte desde `src/utils/date.ts`.

## Verificación

Con Node/npm y Chromium de Windows:

- `npm run typecheck`: correcto.
- `npm run test:api`: 31 pruebas correctas. Incluyen los contratos anteriores, PUT sin cuerpo, respuesta 204 sin JSON, propiedad de avisos, duplicados, errores, cancelación y ausencia de reintentos automáticos.
- `npm run test:avisos`: consulta, filtros, confirmación previa al cambio visual, doble clic, contador compartido, marcado masivo, consulta posterior, vacíos, errores distintos de cero, rechazo de datos incompatibles, cuatro roles y aislamiento al cambiar de cuenta. Sin errores de React.
- `npm run test:navigation`, `npm run test:aulas` y `npm run test:centro`: correctos.
- `npm run export:web`: correcto; incluye `/mis-avisos` y conserva las rutas anteriores.
- Revisión visual a 390 × 844 px.

Además, Chromium contra el backend real con la cuenta ALUMNO autorizada obtuvo HTTP 200 en login, avisos y panel. No se marcaron avisos reales como leídos: los PUT se verificaron con fixtures. El script local de consulta bloquea escrituras de lectura.

El preflight del PUT `/notificaciones/read-all`, con `authorization` desde `http://localhost:5173`, respondió HTTP 200 y permitió ese origen. No equivale a una prueba real de marcado.

## Entrega y pendientes

Este incremento se entrega con un commit propio y push a `origin/main`. Los incrementos 2 y 3 se subieron previamente en commits independientes. Capturas, copias temporales de verificación y scripts locales permanecen bajo `.expo/`, excluidos de Git.

Siguen pendientes los push, la restauración de sesión mediante `/auth/me`, el circuito de registro/validación de horas, la edición de la ficha y las entregas con archivos. Las dependencias del backend descritas en los incrementos anteriores siguen vigentes.
