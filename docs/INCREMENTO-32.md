# Incremento 32 · Bitácora del supervisor por páginas

La revisión de horas del supervisor ya no descarga listas completas. Al abrir «Validar horas», la pantalla muestra primero un selector paginado de prácticas con búsqueda en servidor (el mismo endpoint paginado del personal) y, elegida la práctica, consulta su bitácora en páginas de 20 con filtros de todas, pendientes, validadas o rechazadas. El resumen de horas validadas, pendientes y rechazadas se calcula en SQL sobre toda la práctica, no sobre la página visible, por lo que no cambia al paginar ni al filtrar.

El fallo de una página siguiente no borra lo ya mostrado: el pie pasa a «Reintentar carga» conservando las actividades visibles. Validar o rechazar horas conserva su circuito confirmado (revisión, observación obligatoria al rechazar, práctica abierta) y la confirmación del servidor recarga la página vigente y la ficha de la práctica, de modo que los totales globales y el estado de la práctica quedan al día de inmediato. El historial de actividad por registro sigue disponible desde la fila.

La bitácora del alumno no cambia: conserva su consulta completa, el registro con borrador, la corrección de rechazadas y el historial, con el aviso de actualización para servidores de versión 1.

## API y alcance

Nueva consulta bajo `/api/v1/equipo`:

| GET | Respuesta |
| --- | --- |
| `/practicas/{id}/horas/pagina?estado=TODAS\|PENDIENTES\|VALIDADAS\|RECHAZADAS&limite=20&cursor=` | Páginas de 1–40 actividades (cliente pide 20) con `total` del filtro y totales globales `horasValidadas`, `horasPendientes`, `horasRechazadas`; orden por fecha descendente con desempate por ID. |

El selector reutiliza `/practicas/pagina` (búsqueda y filtro TODAS) y el detalle exacto `/practicas/{id}`; las capacidades de corrección se consultan una vez por pantalla. No hay escrituras nuevas ni migraciones: el endpoint solo lee los registros que el circuito confirmado ya guardó. El mismo alcance de permisos de la bitácora completa se aplica a las páginas; el cursor queda ligado a la consulta (usuario, práctica y filtro).

## Verificación

Los nueve casos SQLite de páginas del personal pasaron, incluido el nuevo de horas: 20→20→resto con filas históricas sin fecha al final, filtros con `total` por filtro y totales globales intactos, cursores de otro usuario o filtro rechazados con 422, límite inválido 422, alumno 403, docente ajeno 404 y administración consulta la práctica del aula. TypeScript del cliente pasó.

El recorrido focal del navegador confirmó, con API simulada: selector 20→40→45 con búsqueda en servidor y contador exacto; bitácora 20→40 con fallo de página y «Reintentar carga» sin perder lo visible; filtros con totales globales exactos; revisión validada con la confirmación del servidor, recarga de página y ficha, y totales actualizados al instante; y anchos 360/390/430 px sin desborde. Captura en `.expo/dev/horas32-verificacion.json`, fuera de Git.

La suite real `test:personal` pasó completa: la etapa del supervisor recorre selector, bitácora con fallo/reintento, filtros y una revisión confirmada (una escritura aislada). El endpoint real respondió para la práctica real del supervisor con 4 registros, 8 h validadas y 1 h rechazada, con los totales globales intactos al filtrar pendientes y 422 para un filtro inválido.

No se modificaron la presentación, su API, el APK entregado ni los datos ficticios publicados. La bitácora sigue sin verificar presencia física ni jornada laboral.
