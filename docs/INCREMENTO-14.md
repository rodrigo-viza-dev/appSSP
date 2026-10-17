# Incremento 14 · Comunidad, metas y guía por rol

Este bloque añade tres módulos conectados al backend y una guía integrada. El panel y las aulas ofrecen accesos directos; se conservan Expo Router, componentes compartidos y la identidad UNSA.

## Funcionalidades

| Módulo | Operaciones disponibles |
| --- | --- |
| Anuncios del aula | Docente responsable/administración publica título y contenido, elige fijarlo al inicio, revisa y confirma. Miembros del aula consultan, buscan y filtran fijados. |
| Foros | Miembros abren temas, consultan conversaciones y autores, escriben respuestas y actualizan mensajes. El listado muestra el número persistido de respuestas. |
| Metas de prácticas | Docente responsable/administración define objetivos de artículos, notas periodísticas, notas de prensa u horas; registra el total de producción revisado y el motivo. Alumno y supervisor vinculado consultan avance, porcentajes y metas completadas/en progreso. |
| Guía por rol | 13 artículos con búsqueda, categorías, pasos y ejemplos; cada cuenta ve el contenido pertinente. Cubre bitácora, observaciones, revisión, tareas, anuncios, foros, metas, asistencia, auditoría y conectividad. |

Rutas nuevas: `/comunidad`, `/foro`, `/metas` y `/guia`. La comunidad permite seleccionar entre aulas propias; los enlaces de conversación verifican aula e hilo. Una cuenta de supervisor conserva consulta de sus metas y guía, sin acceso a conversaciones académicas del aula.

## Persistencia y permisos

Se reutilizan las tablas existentes; no hay migración ni recarga de semilla. Los listados y las escrituras validan pertenencia en el backend. Se corrige el acceso a metas por practicante y se impide que un docente ajeno o supervisor modifique objetivos o producción.

Las publicaciones conservan una clave de solicitud. Repetir el mismo anuncio, tema, respuesta o alta de meta devuelve el resultado guardado; cambiar los datos con la misma clave recibe 409. Las escrituras de comunidad bloquean el aula y comparten ese bloqueo con cambios de matrícula/estado. Las aulas concluidas conservan consulta y bloquean publicaciones nuevas.

El avance de metas usa un total absoluto y el valor anterior esperado. Repetir el total no vuelve a sumar; un total anterior distinto recibe 409. El endpoint antiguo de incrementos acumulativos queda bloqueado en desarrollo. Las metas de horas siempre derivan de registros VALIDADO, incluso si un acumulado antiguo era incorrecto. Las prácticas cerradas bloquean cambios. La producción manual no se presenta como evidencia documental aprobada automáticamente.

Cada operación efectiva genera auditoría transaccional. Los formularios revisan antes de confirmar, conservan contenido/solicitud para reintentar una respuesta perdida y consultan el estado actual ante conflictos. `/comunicacion/capacidades` y `/metas/capacidades` evitan habilitar escrituras contra un servidor anterior.

## Verificación

- Tipos con Node/npm Windows y exportación web de 27 rutas.
- Nueve pruebas aisladas del backend: permisos, alcance de listados, publicaciones/reintentos, conteo de respuestas, aulas concluidas, metas y avance total, horas validadas, prácticas cerradas y entradas inválidas.
- `npm run test:modulos`: docente publica anuncio fijado; alumno consulta y abre foro; alumno/docente conversan; docente define una meta y registra producción; alumno/supervisor consultan; guía por rol y bloqueo en aulas concluidas/servidor antiguo. Pérdidas deliberadas de respuestas de anuncio/avance confirman reintentos sin duplicar. Impide guardar una revisión de producción sin cambiar el total.
- Supabase de pruebas y Chromium: 27 comprobaciones de publicaciones, conversaciones y metas persistentes, reintentos concurrentes, conflictos y acceso ajeno denegado; seis eventos de auditoría efectivos. Cero errores de página y solicitudes a producción. La revisión visual detectó y corrigió una condición que generaba texto vacío fuera de Text; se comprobó otra vez por consulta, sin repetir escrituras, con cero avisos de consola. Evidencia local ignorada en `.expo/dev/modulos-integration.json` y capturas `modulos-*-mobile.png`.

Los anuncios y foros se actualizan por consulta; no se anuncian como chat en tiempo real ni push. No hay adjuntos persistentes, restauración de sesión o borradores sin conexión. La guía ofrece ejemplos de uso, no fija un reglamento académico. No se publica producción ni se fusiona main del backend.
