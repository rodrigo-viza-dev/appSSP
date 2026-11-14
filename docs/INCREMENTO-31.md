# Incremento 31 · Historial de asistencia por páginas

La pantalla de asistencia del personal ya no es solo una fecha suelta. Debajo del registro del día aparece el padrón histórico del aula: los días que ya tienen asistencia guardada, del más reciente al más antiguo, en páginas de 20 con contador exacto y botón «Ver más». Tocar un día consulta su fecha con la misma confirmación de estado que la consulta manual, y el guardado confirmado de un día nuevo lo hace entrar al historial de inmediato.

El historial se consulta con detalle individual: se pide el día exacto al tocarlo, sin descargar sesiones completas ni reconstruir el padrón histórico en el cliente. El fallo de una página siguiente no borra lo ya mostrado: el pie pasa a «Reintentar carga» conservando las fechas visibles. La consulta por campo de fecha mantiene su validación y sus estados.

## API y alcance

Nueva consulta:

| GET | Respuesta |
| --- | --- |
| `/profesor/aulas/{id}/asistencia/historial?limite=20&cursor=` | Páginas de 1–40 días (cliente pide 20): ítems `{fecha, presentes, registrados}`, `total` de días con registro del aula y cursor `siguiente` cuando hay más. |

La paginación es keyset por fecha con cursor opaco firmado para la consulta (usuario y aula); un cursor de otra consulta da 422. Docente responsable/ADMIN; supervisor y alumnos reciben 403. El total se calcula en SQL sobre todo el aula, no sobre la página. No hay migraciones ni escrituras nuevas: el historial solo lee las filas que el guardado confirmado ya registró, y repetir un guardado idéntico no duplica el día.

El guardado de asistencia conserva su circuito (revisión, conflicto 409, auditoría) y ahora dispara la recarga del historial; la app le pide la primera página de nuevo tras «guardada y confirmada por el servidor».

## Verificación

Los ocho casos SQLite de asistencia pasaron, incluidos los dos nuevos del historial: días guardados ordenados por fecha descendente sin duplicar el día al repetir un guardado idéntico, y paginación por cursor con alcance firmado (cursor falso 422, cursor de otro alcance 422, supervisor y alumno 403, docente ajeno 403, ADMIN consulta el aula del docente). TypeScript del cliente pasó.

El recorrido focal del navegador confirmó, con API simulada: historial 20→40→45 días con fallo de página y «Reintentar carga» sin perder lo visible; consulta del día guardado desde el historial con estado confirmado; guardado de hoy que entra al historial y queda consultable; y anchos 360/390/430 px sin desborde. Captura en `.expo/dev/asistencia31-verificacion.json`, fuera de Git.

Con la base `ssp_test` restablecida, la suite real `test:personal` pasó completa contra la API real: la etapa del docente espera la respuesta del historial en la asistencia del aula real (dos días con registro en `ssp_test`) y la misma suite mantiene el guardia de no consultar automáticamente el historial completo de prácticas. El endpoint real respondió `{"fecha":"2026-10-17","presentes":1,"registrados":1}` y `{"fecha":"2026-10-16","presentes":0,"registrados":1}` con `total:2`.

No se modificaron la presentación, su API, el APK entregado ni los datos ficticios publicados. La asistencia académica sigue sin medir jornadas de empresa ni validar horas de prácticas.
