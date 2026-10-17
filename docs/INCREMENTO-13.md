# Incremento 13 · Observaciones y corrección de horas

El supervisor debe explicar un rechazo. El alumno ve el motivo y puede corregir fecha, horas o descripción, revisar los datos y reenviar la misma actividad. Vuelve a pendiente; solo suma al avance después de una nueva validación.

- Cada cambio conserva responsable, fecha e instantáneas anteriores/nuevas en un historial de consulta por actividad. Las observaciones anteriores permanecen allí después del reenvío. Administración puede filtrar los eventos de horas en auditoría.
- Las escrituras llevan una revisión del registro. Un supervisor con datos anteriores recibe 409; tampoco se sobrescriben actividades validadas, ajenas o de prácticas cerradas. Repetir la misma operación confirmada no duplica registros, historial ni acumulado.
- La app consulta el resultado después de una respuesta perdida. El reenvío conserva su revisión original hasta confirmar qué guardó el servidor.
- `versionHoras: 2` habilita observaciones, correcciones e historial. La versión 1 conserva consulta/registro, pero bloquea la revisión para no perder el motivo del rechazo.

## Base de pruebas y contrato

Migración aditiva ejecutada exclusivamente en `ssp_test`: `registro_horas.revision` y `observacion`, más `historial_horas` con unicidad por registro/revisión, claves foráneas e índices. Se comprobó RLS y ausencia de permisos de anon/authenticated. No elimina ni reinicializa datos. Los registros anteriores comienzan con revisión 0; no se inventa un historial de acciones anteriores a este incremento.

`PUT /empresa/horas/{id}` exige revisión y motivo al rechazar. `PUT /practicas/{practicaId}/horas/{id}` permite corregir al alumno propietario. `GET /practicas/{practicaId}/horas/{id}/historial` aplica el mismo alcance de consulta de la práctica. Cambios, historial y auditoría se confirman en una sola transacción con bloqueo de práctica/registro.

## Verificación

- Ocho pruebas aisladas del backend: permisos, validación, cierre, repetición, acumulados, motivos obligatorios, corrección e historial y revisión obsoleta.
- Tipos, `test:horas` y `test:auditoria` con Node/npm de Windows. El recorrido simulado pierde deliberadamente respuestas de registro y corrección; confirma recuperación sin duplicados y bloqueo de revisión en versión 1.
- Recorrido real en Supabase y Chromium: rechazo concurrente, corrección web y repetición, revisión antigua 409, validación nueva e historial de cuatro cambios. Solo cuentas ficticias y API local; evidencia ignorada en `.expo/dev/correccion-horas-integration.json` y `correccion-horas-mobile.png`.

No cambian rutas, por lo que no se repite la exportación web. La rama del backend continúa en desarrollo. Borradores persistentes, funcionamiento sin conexión, reglas académicas definitivas y checklist completo del cierre siguen pendientes.
