# Incremento 22 · Avisos con destino y bandeja paginada

El alumno tiene una bandeja adaptada al nuevo diseño, con detalle de aviso y una acción para abrir su tarea o actividad. El recurso se abre dentro de Avisos y Atrás regresa al aviso y después a la bandeja, conservando el filtro y las páginas ya cargadas.

## Comportamiento

- Publicar una tarea genera un aviso para los alumnos matriculados en su aula. Actualizar instrucciones o plazo genera otro aviso con el mismo destino y el texto de actualización.
- Validar o rechazar horas genera un aviso para el practicante dueño del registro. El destino abre la actividad y su revisión actual.
- Los avisos se guardan en la misma transacción que el evento. Repetir una publicación, edición o decisión ya confirmada no duplica avisos. No se envían correos ni notificaciones push.
- Los avisos anteriores conservan su texto y estado de lectura. Como no guardaban un destino verificable, se presentan como informativos; no se deduce una tarea por su título ni se reconstruye el historial.
- Abrir un aviso o un recurso no lo marca automáticamente como leído. La acción de lectura espera la confirmación 204 del servidor; un error conserva el estado anterior.
- La bandeja consulta páginas de 20 avisos por fecha e identificador descendentes. Los filtros Todos/Sin leer/Leídos se aplican en el servidor y el contador sin leer cubre toda la cuenta. Un fallo al traer otra página conserva lo visible y ofrece reintento.
- El nuevo listado del alumno usa `FlatList`. Docente, supervisor y administración conservan su presentación actual y usan la misma API paginada. La cuenta anterior no puede modificar la sesión nueva mediante una respuesta tardía.

Los destinos admitidos son objetos de tarea (`aulaId`, `tareaId`) o actividad (`practicaId`, `registroId`), sin URL arbitraria. Cada lectura filtra por la cuenta autenticada; abrir el recurso vuelve a comprobar sus permisos. Si se retiró la matrícula o el recurso dejó de estar disponible, su detalle informa del resultado y permite volver.

## Backend y migración de pruebas

Requiere el backend actualizado en `desarrollo/entorno-supabase-pruebas` y la migración aditiva `app.db.migrate_notices_test`. Esta migración ya se aplicó al esquema autorizado `ssp_test`: añade `notificaciones.destino` JSONB nullable, dos tipos de aviso y el índice usuario/fecha/id, conservando RLS y sin privilegios para los roles públicos de la Data API. No carga semillas ni cambia registros académicos.

| Ruta | Uso |
| --- | --- |
| `GET /notificaciones/bandeja` | `estado`, `limite`, `cursor`; devuelve `items`, `total`, `sinLeer` y `siguiente`. |
| `GET /notificaciones/{id}` | Detalle de un aviso propio. |
| `PUT /notificaciones/{id}/read` | Lectura explícita de un aviso propio; 404 para un aviso ajeno o inexistente. |
| `PUT /notificaciones/read-all` | Lectura explícita de todos los avisos de la cuenta. |

Todas las rutas tienen prefijo `/api/v1`. La lista antigua `GET /notificaciones` se mantiene para clientes anteriores; la app actual usa la bandeja paginada. No hay fusión con main del backend ni despliegue de producción.

## Verificación focal

Con Python y Node/npm de Windows: seis pruebas nuevas SQLite de paginación, permisos, eventos, destinos, idempotencia y rollback; cuatro pruebas de tareas y ocho del circuito de horas afectado. Once pruebas del cliente comprueban contratos de lectura, páginas, destinos y confirmaciones. TypeScript correcto. Exportación web de 134 rutas y bundle Android correctos; el bundle no equivale a un APK instalado.

La revisión de navegador usa lecturas reales de la API local y recursos de la cuenta ficticia. Las escrituras de lectura y la bandeja de 45 avisos usan respuestas simuladas: no cambian avisos ni datos académicos reales. Incluye el recorrido hacia tarea/actividad, retorno y filtro, aviso informativo, respuestas fallidas, doble toque, paginación/reintento, bandejas de los otros roles y respuesta tardía de una cuenta anterior. Evidencias en `.expo/dev/avisos22-*`, fuera de Git.

## Revisión en Android

Usar el backend actualizado con `scripts/iniciar-pruebas.ps1 -Lan` y la app con `npm run movil:pruebas`. Para revisar el circuito completo con cuentas ficticias:

1. Publicar una tarea como docente. Como alumno matriculado, actualizar Avisos, abrirla y volver con Atrás hasta su bandeja.
2. Como supervisor vinculado, revisar una actividad pendiente. Como alumno, actualizar Avisos y abrir la revisión de esa actividad.
3. Comprobar Sin leer/Leídos, lectura explícita, cambio de pestaña, fuente ampliada y áreas seguras. Los avisos de la semilla antigua son informativos.

El APK, Google nativo y la comprobación física de Android siguen pendientes. No se incorpora detección automática de vencimientos ni entrega en segundo plano. El siguiente bloque visual corresponde a las pantallas interiores restantes y al docente.
