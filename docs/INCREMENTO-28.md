# Incremento 28 · Listas del personal y revisión puntual

Mis aulas, Seguimiento docente y Practicantes del supervisor consultan páginas de 20 registros. Las búsquedas docentes se ejecutan en el servidor después de una breve pausa al escribir; supervisión dispone de filtros Todas, Abiertas y Cerradas. El servidor conserva el ámbito de permisos y calcula las horas validadas sin materializar el historial completo.

El aula docente separa **Entregas, Alumnos, Notas y Recursos**. Cada lista tiene carga independiente y conserva su búsqueda al cambiar de sección o volver de un detalle. Entregas comienza con Sin calificar; Todas las entregas incluye notas de cero. Notas presenta promedio, asistencia académica y horas validadas por estudiante, con acceso a su ficha individual. Su promedio del aula abarca todo el padrón con notas, aunque se filtre la lista visible.

Recursos agrupa tareas, asistencia, mensajes privados del docente, comunidad, documentos y metas. Las acciones existentes conservan revisión y confirmación. Al guardar o consultar una calificación incierta se invalida la lista del aula; una entrega calificada deja de aparecer como pendiente. Publicar/editar tareas y guardar/consultar asistencia también invalidan esos resúmenes. Cambiar de pestaña sin cambios conserva las páginas cargadas.

Abrir un aula ya no descarga todas las aulas para buscarla en el cliente. Abrir su padrón no descarga alumnos de otras aulas. Revisar una entrega consulta ese identificador dentro del aula solicitada y obtiene su revisión con `MAX`, sin cargar todas las entregas ni el contenido de sus versiones. El historial y los archivos se consultan solo al pulsar sus acciones.

## API y alcance

Nuevas consultas bajo `/api/v1/equipo`: `/aulas/pagina`, `/aulas/{id}`, `/aulas/{id}/alumnos/pagina`, `/aulas/{id}/entregas/pagina`, `/aulas/{id}/entregas/{entrega}`, `/aulas/{id}/notas/pagina` y `/practicas/pagina`. Las páginas admiten 1–40 elementos; el cliente pide 20. Los cursores incluyen el ámbito de cuenta, recurso y filtros; el servidor revalida permisos en cada petición. Las búsquedas admiten hasta 120 caracteres y tratan `%` y `_` como texto literal.

Los listados de aulas, alumnos, notas y prácticas usan orden por nombre/apellidos e ID. Entregas utiliza fecha e ID descendentes. Se consultan resúmenes y conteos en SQL; no se transfieren cuerpos de entregas, instrucciones largas, historial de horas ni archivos binarios en las páginas. La lectura no modifica notas, asistencia, vínculos ni registros académicos.

No hay migraciones, cambios de esquema ni recarga de semilla. El backend mantiene sus API anteriores para los módulos aún no adaptados. Publicación de tareas, asistencia por día, listas administrativas, metas y otros selectores de prácticas siguen requiriendo trabajo para grandes volúmenes; este incremento no los declara paginados.

## Verificación

TypeScript y los seis casos SQLite de volumen/permisos/proyecciones pasaron. `npm run test:personal` completó seis recorridos focales: lectura real local de docente/administración; páginas 20→40→45 y fallo/reintento; búsqueda y retorno; entregas/padrón/notas independientes; calificación simulada confirmada con nota cero/revisión vigente e invalidación; prácticas del supervisor sin buscador. Se comprobó que no se consultan los antiguos listados completos en estos recorridos, ni se descarga automáticamente el historial al revisar una entrega.

No hubo errores de consola/página, acceso a otras API ni escrituras académicas reales. La calificación se comprobó con una respuesta aislada, no sobre datos de Supabase. Exportación web de 270 variantes de ruta y bundle Android de 3,5 MB correctos. Las pantallas se comprobaron a 360/390/430 px y se inspeccionaron las capturas de aula/supervisión. Evidencias y artefactos en `.expo/dev/personal28-*`, fuera de Git. Los servidores propios 5174/8001 quedaron cerrados.

La versión de presentación y el APK entregado permanecen intactos; no se ha publicado un nuevo APK. La revisión física de teclado, Atrás y archivos sigue pendiente.
