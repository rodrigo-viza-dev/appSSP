# Incremento 3: centro de prácticas y supervisor

Implementado el 16 de octubre de 2026.

## Alcance

El panel del alumno incorpora **Mi centro de prácticas**, que abre la ruta protegida `/centro`. La pantalla consulta la ficha del alumno y, cuando falta un registro, permite completar los datos del centro y luego los de su supervisor.

Antes de cada guardado se muestra un resumen con acciones para confirmar o editar. Los datos guardados se muestran desde la respuesta de la API, comprobando la correspondencia del centro con el alumno y del supervisor con el centro. El supervisor se consulta con el ID obtenido de la ficha propia; la pantalla no recibe un ID de centro por URL.

Se conserva la identidad UNSA, la sesión en memoria y la separación de la demo. Registrar un contacto de supervisor no crea una cuenta de acceso ni asigna automáticamente una práctica. La edición posterior y la asignación de práctica se gestionan con coordinación.

## Contrato

Revisados el [OpenAPI desplegado](https://back-cs-de-la-com.vercel.app/openapi.json) y el [router de empresa del backend](https://github.com/BastleyNait/BACK-CS-DE-LA-COM/blob/main/app/routers/empresa.py).

| Operación | Ruta |
| --- | --- |
| Consultar centro propio | `GET /api/v1/empresa/mine` |
| Registrar centro | `POST /api/v1/empresa` |
| Consultar supervisor del centro propio | `GET /api/v1/empresa/{empresa_id}/supervisor` |
| Registrar supervisor | `POST /api/v1/empresa/{empresa_id}/supervisor` |

Los POST incluyen únicamente los campos publicados. El cliente no envía roles, identificadores de propietario ni asignaciones de cuenta. Las consultas nulas representan registros pendientes, y las respuestas incompatibles se muestran como error. Los controles del cliente no sustituyen la autorización del backend.

## Validación y errores

- Campos obligatorios, límites de longitud, formato de correo y teléfono. Se recortan espacios exteriores y se normalizan los correos.
- RUC con once dígitos, según el [formato descrito por SUNAT](https://centrovirtual.sunat.gob.pe/tramites/inscribete-ruc). Esta comprobación es de formato; no consulta la inscripción ni la situación del contribuyente.
- Revisar datos no envía solicitudes de registro. La confirmación deshabilita sus acciones y evita solicitudes duplicadas por pulsaciones repetidas.
- HTTP 400/422 conserva el borrador para corregir; HTTP 403 informa falta de permiso; HTTP 401 devuelve al ingreso.
- HTTP 409 exige consultar la ficha existente. Un fallo de conexión, HTTP 5xx o una respuesta incompatible tras el POST exige consultar el resultado antes de intentar otro guardado. No hay reintentos automáticos de escrituras.
- Al salir se cancelan las solicitudes del cliente y se ignoran respuestas tardías. Cancelar la espera del cliente no implica revertir un registro ya aceptado por el servidor.
- Los campos permanecen en memoria al corregir errores o consultar un guardado incierto dentro de la pantalla. No se implementaron borradores persistentes ni restauración tras recargar.

## Implementación

`src/services/centro.ts` contiene contratos, normalización, validación y operaciones. `src/features/centro/registration-form.tsx` concentra la revisión y confirmación. Las consultas cancelables compartidas pasan a `src/features/shared/use-student-query.ts`; la respuesta validada de un POST actualiza la ficha sin un segundo envío. El feedback de consulta se comparte desde `src/components/query-feedback.tsx`.

## Verificación

Con Node/npm y Chromium de Windows:

- `npm run typecheck`: correcto.
- `npm run test:api`: 23 pruebas correctas, incluyendo validación previa al envío, payloads publicados, propiedad de recursos, contratos incompatibles, conflictos y ausencia de reintentos automáticos.
- `npm run test:centro`: recorrido completo con respuestas simuladas. Comprueba revisión sin envío, edición, doble clic, registro del supervisor, consulta posterior, rechazo 422, respuesta incierta tras guardar, conflicto 409, recuperación del borrador, cancelación y sesión vencida. Sin errores de React.
- `npm run test:navigation` y `npm run test:aulas`: correctos después de compartir las consultas y añadir la nueva ruta.
- `npm run export:web`: correcto; incluye `/centro`.
- Revisión visual a 390 × 844 px del resumen previo al registro y de la ficha guardada.

Se comprobó además Chromium **contra el backend real**, desde `http://localhost:5173`, con la cuenta ALUMNO de prueba autorizada: login, panel, `GET /empresa/mine` y consulta del supervisor respondieron HTTP 200. La cuenta ya tiene un centro registrado. No se crearon ni modificaron registros reales para estas pruebas; las escrituras se verificaron con fixtures.

El preflight de `POST /api/v1/empresa`, con `authorization` y `content-type`, respondió HTTP 200 y permitió el origen local. Esto comprueba CORS para esa solicitud, sin representar una prueba real del guardado en producción.

Los scripts locales de consulta y las capturas permanecen en `.expo/`, fuera de Git. No se guardaron contraseñas ni tokens.

## Pendientes

- Edición del centro y supervisor: requiere un contrato del backend para actualizar los registros.
- Borradores persistentes, restauración de sesión y permisos definitivos del backend.
- Registro y validación de horas, separación de pendientes/validadas y operaciones del supervisor. Las brechas anteriores del backend siguen vigentes; este incremento no completa el circuito de aprobación de horas.
