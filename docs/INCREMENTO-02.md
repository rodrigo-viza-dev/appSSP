# Incremento 2: aulas, tareas y calificaciones del alumno

Implementado el 16 de octubre de 2026.

## Alcance

Desde el panel, el alumno abre una de sus aulas y consulta docente, ciclo, estado, semana y avance registrado. La pantalla ofrece dos secciones: tareas y calificaciones. Cada tarea permite revisar descripción, plazo, entrega existente, comentario, nota y observaciones del docente.

Los datos provienen de la API y permanecen separados de la demo. Las notas y promedios de cero se muestran como cero; los valores nulos se muestran como pendientes de calificación. Las fechas con hora se presentan en `America/Lima`; una fecha sin hora conserva su día.

No se habilitaron envíos de entregas, subida o descarga de archivos, registro de horas, persistencia ni restauración de sesión. La presencia de un adjunto se informa sin ofrecer una descarga inexistente.

## Contrato utilizado

Contrato consultado: [OpenAPI del backend](https://back-cs-de-la-com.vercel.app/openapi.json). Todas estas consultas son GET con Bearer token:

| Consulta | Ruta |
| --- | --- |
| Detalle del aula del alumno | `/api/v1/alumno/aulas/{aula_id}` |
| Tareas con entrega del alumno | `/api/v1/alumno/aulas/{aula_id}/tareas` |
| Resumen y detalle de notas | `/api/v1/alumno/aulas/{aula_id}/calificaciones` |

El detalle de tarea se obtiene del listado de su aula, porque el contrato publicado no ofrece un GET de tarea individual. Se validan las respuestas antes de mostrarlas, incluyendo la correspondencia de aula, tarea y alumno de la entrega. Esta validación de cliente no sustituye los permisos del backend.

## Navegación y errores

- `/aula?id=...` y `/tarea?aulaId=...&tareaId=...` están protegidas para el rol ALUMNO mediante `Stack.Protected`.
- Los parámetros en la consulta permiten exportar ambas páginas como rutas estáticas, sin incluir identificadores de alumnos ni aulas en la compilación.
- Cada sección tiene carga y reintento propios. Un fallo en tareas permite seguir consultando calificaciones, y viceversa.
- HTTP 401 termina la sesión; HTTP 403 conserva la sesión e informa falta de permisos; HTTP 404 informa que el recurso no está disponible.
- Los enlaces incompletos y las respuestas incompatibles tienen un mensaje explícito. Las consultas se cancelan al desmontar la pantalla; sus respuestas tardías no modifican otra pantalla ni otra sesión.

La navegación sigue las [rutas protegidas de Expo Router](https://docs.expo.dev/router/advanced/protected/). Se mantienen Expo, TypeScript, la exportación web estática y el granate UNSA `#5E151D`.

## Verificación

Con Node/npm y Chromium de Windows:

- `npm run typecheck` y `npm run export:web`: correctos; la exportación incluye `/aula` y `/tarea`.
- `npm run test:api`: 14 pruebas correctas. Cubren el cliente anterior y los contratos nuevos, permisos, identificadores, vacíos, nota cero, respuestas incompatibles, cancelación y fechas.
- `npm run test:navigation`: conserva los ciclos de demo, paneles por rol, rutas protegidas y retorno al ingreso por sesión vencida.
- `npm run test:aulas`: comprueba el recorrido completo con respuestas simuladas, notas de cero, observaciones, vacíos, reintento, errores parciales, 403, 404, respuestas incompatibles y un 401 tardío de una consulta cancelada. Sin errores de React.
- Revisión visual a 390 × 844 px de aula y tarea.

También se probó el navegador **sin respuestas simuladas**, desde `http://localhost:5173`, con la cuenta ALUMNO de prueba autorizada. Respondieron HTTP 200: login, aulas asignadas, práctica actual, detalle de aula, tareas y calificaciones. Esto comprueba CORS y el recorrido de consulta con el despliegue real.

El aula de prueba no tiene tareas. Por ello, las entregas, notas y observaciones con contenido se comprobaron con fixtures, no con registros reales del servidor. No se crearon tareas, entregas ni otros datos para completar la prueba. No se guardaron contraseñas ni tokens.

Las pruebas de navegador requieren la instalación de Playwright/Chromium descrita en el README. Los archivos temporales, capturas y la comprobación local del servidor permanecen bajo `.expo/`, fuera de Git.

## Pendientes

- Envío de entregas y archivos: resolver almacenamiento persistente, propiedad del archivo y reglas de plazo en backend antes de completar ese flujo.
- Restauración de sesión: depende de agregar y verificar `/auth/me`.
- Registro y validación de horas: requiere permisos por práctica, separación de horas pendientes/validadas y operaciones del supervisor.
