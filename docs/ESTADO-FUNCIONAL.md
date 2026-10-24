# Estado funcional · PrácticasCC

Revisión del 23 de octubre de 2026, desarrollo hasta el incremento 26. Este documento resume el código actual y distingue implementación, revisión y dependencias pendientes. El plan original conserva diagnósticos históricos que ya se resolvieron.

## Entrega y desarrollo

La presentación está fijada en `avance-2026-10-23-v0.2.0`: web y APK independientes del PC, API dedicada, datos ficticios y credenciales propias. El desarrollo continúa en `desarrollo/post-presentacion-2026-10-23`, con `ssp_test`. Los incrementos 25 y 26 no reemplazan esa web ni ese APK.

## Módulos disponibles

| Módulo | Implementación actual | Límite o revisión pendiente |
| --- | --- | --- |
| Acceso SSP y sesión | Cuatro roles, JWT, SecureStore Android, restauración mediante `/auth/me`, cierre de sesión y borradores aislados por cuenta/API. | Sin refresh de tokens; una sesión vencida requiere ingresar de nuevo. Revisar acceso Google real y recuperación por correo. |
| Aulas y tareas | Aulas autorizadas, publicación/edición docente, plazos, entrega escrita/archivo, reemplazo sin calificar y versiones. Alumno con páginas, notas y consulta individual. | Prórrogas individuales y listas docentes grandes siguen pendientes; el plazo actual se amplía para la tarea completa. |
| Bitácora y horas | Registro, borrador, validación/rechazo, corrección, historial y paginación; solo horas validadas cuentan hacia la meta. | Revisar recorrido completo con teclado y Atrás en Android. No verifica presencia física ni jornada. |
| Centro y supervisor | Registro con revisión previa, consulta del contacto, cuenta y vínculo gestionados por administración. | Registrar un contacto no le concede acceso; la coordinación debe vincular la cuenta. |
| Asignaciones | Práctica vinculada a matrícula, centro propio, supervisor y meta de horas explícita; reasignación con control de vínculos. | Revisar casos del piloto con responsables y datos institucionales autorizados. |
| Metas | Objetivos por práctica y producción revisada por docente; las horas se calculan desde las validadas. | Las listas de metas todavía usan consultas completas. |
| Expediente y PDF | Evaluación del supervisor, requisitos explícitos, checklist, autorización docente, copia conservada y PDF privado. Resumen ligero para alumno. | Sin reapertura, firma digital, rúbrica ni cartas institucionales. Los criterios académicos deben confirmarse. |
| Asistencia académica | Padrón, revisión, guardado confirmado, conflictos y auditoría de cambios. | No equivale a entrada/salida en el centro. Falta padrón histórico y paginación de listas administrativas. |
| Avisos | Bandeja por usuario, filtros y páginas, lectura explícita y destinos exactos para tareas/horas. | Sin push, entrega en segundo plano ni actualización en tiempo real. |
| Mensajes privados | Docente responsable/alumno matriculado, lectura explícita y envío idempotente. Alumno: historial por páginas, borrador y reintentos persistentes. | Actualización manual; el contador general incluye mensajes no cargados. El docente conserva su interfaz previa. |
| Comunidad | Anuncios fijados, temas y respuestas con permisos por aula. Alumno: resúmenes/detalle individual, páginas y borradores de temas/respuestas. | El diseño y paginación de las vistas docentes se completan en un bloque posterior. |
| Documentos | Almacenamiento privado en PostgreSQL, formatos/tamaño/cuota, descarga autenticada y protección de archivos de entregas. Alumno: filtros y páginas de metadatos. | Dimensionar almacenamiento para producción; la demostración pública limita cada adjunto a 4 MB y el desarrollo a 10 MB. |
| Borradores y guía | Actividades, entregas y comunicación del alumno; envío explícito de pendientes confirmados; guía actualizada por rol. | No hay caché completa de aulas ni sincronización automática. Un borrador local no aparece en otro dispositivo. |
| Administración y reportes | Usuarios/roles, aulas/matrículas, asignaciones/supervisores, auditoría y reportes/ficha individual. | Renovar navegación y listas con volumen después del recorrido docente; falta política formal de suspensión/retención. |

## Orden para completar el piloto

1. **Revisión móvil real:** teclado, fuente ampliada, Atrás, adjuntos, descarga/compartir PDF y recuperación de borradores tras cerrar la app. El APK ya entregado verifica un avance anterior, no los cambios 25–26. Preparar un candidato nuevo después de estabilizar el siguiente bloque.
2. **Navegación por los otros roles:** adaptar primero docente y después supervisor/administración, preservando búsqueda donde gestionan volumen y los permisos existentes. Completar paginación de sus listados y de metas/prácticas según el volumen esperado.
3. **Acceso institucional y recuperación:** Google está preparado y tiene clientes configurados, pero requiere el ingreso manual autorizado y una compilación nativa habilitada para comprobarlo. SMTP requiere un servicio/cuenta de envío configurada; el endpoint preparado por sí solo no entrega correos. La presentación no ofrece estos accesos como terminados.
4. **Criterios académicos:** confirmar horas por modalidad, jornada, entregas tardías/excepciones, requisitos del expediente, rúbricas, cartas, atribuciones y conservación. Los valores técnicos o ejemplos no constituyen reglamento institucional.
5. **Infraestructura del piloto:** definir almacenamiento y cuotas reales, rol de ejecución de base separado del propietario/migraciones, respaldos y restauración, operación del servidor y acceso a datos. La base actual está autorizada para pruebas ficticias.
6. **Funciones adicionales por alcance aprobado:** GPS/jornadas, push, tiempo real, refresh de sesión, caché completa, sincronización en segundo plano y prórrogas individuales. Requieren desarrollo y, según el caso, configuración de servicios o decisiones institucionales; no están implementadas por tener pantallas o borradores relacionados.

No se declara la aplicación terminada para producción. El avance tiene circuitos funcionales y comprobaciones focales; todavía falta la revisión integral del piloto con los responsables y dispositivos reales.
