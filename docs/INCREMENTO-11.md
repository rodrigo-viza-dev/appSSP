# Incremento 11 · Asistencia guardada, padrón y auditoría

La pantalla docente distingue una propuesta sin guardar, un registro por revisar y la asistencia guardada. Muestra qué estudiantes aún no tienen registro y avisa cuando hay cambios locales sin guardar.

## Comportamiento

- El servidor comprueba el padrón completo y único antes de escribir: rechaza estudiantes ajenos, duplicados, faltantes, listas vacías y booleanos inválidos. Valida fecha, aula activa y pertenencia docente/ADMIN.
- Cada consulta incluye una revisión. Si otro editor cambió la asistencia o el padrón, una lista obsoleta diferente devuelve 409 y la app exige consultar antes de reenviar.
- Repetir el mismo resultado no crea otra escritura ni entrada de auditoría. Los cambios se serializan mediante el bloqueo de aula, compartido con las operaciones administrativas de matrícula, retiro, asignación docente y estado.
- Guardar el padrón actual conserva la asistencia de alumnos retirados. Los duplicados de alumnos actuales se normalizan con revisión explícita. No se reconstruye el padrón histórico de cada fecha.
- Los cambios registran actor, fecha y valores anteriores/nuevos en la tabla de auditoría existente, dentro de la misma transacción; consulta administrativa mediante la API. No se agregaron tablas ni columnas.
- Los servidores anteriores permiten consulta y muestran el estado de guardado como sin confirmar. El guardado requiere el backend actualizado. Fechas futuras y aulas concluidas permiten consulta.

## Verificación

- Tipos correctos con Node/npm de Windows.
- `npm run test:asistencia`: propuesta/guardado, aviso de cambios locales, conflicto sin sobrescribir, recuperación tras error y consulta del servidor anterior.
- Seis pruebas aisladas del backend: estados, padrón, booleanos, fechas/permisos, revisión obsoleta, auditoría y conservación del historial retirado.
- Supabase de pruebas y Chromium: permisos, padrón inválido sin cambios, guardados simultáneos con una sola auditoría, rechazo de revisión obsoleta y modificación confirmada desde la pantalla docente. Evidencias locales ignoradas: `.expo/dev/asistencia-integration.json` y `asistencia-mobile.png`.
- Resultado real: estado inicial `PROPUESTO` y final `GUARDADO`; dos cambios efectivos, dos auditorías. La repetición no duplicó registros ni auditoría. Sin errores de página ni solicitudes a producción; revisión visual móvil correcta.

Contrato técnico: `docs/ASISTENCIA-ACADEMICA.md` del backend de desarrollo, commit [7e1b287](https://github.com/BastleyNait/BACK-CS-DE-LA-COM/commit/7e1b2871c229dcd5c1f4021643580e6b7a125668). La consulta administrativa se incorpora en el [incremento 12](INCREMENTO-12.md). La asistencia académica sigue siendo independiente de jornadas en empresa, GPS y horas de prácticas.
