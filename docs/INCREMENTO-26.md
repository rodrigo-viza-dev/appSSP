# Incremento 26 · Comunicación, documentos, borradores y guía del alumno

Se completa la adaptación de los interiores restantes del alumno. Continúa en `desarrollo/post-presentacion-2026-10-23`, sin modificar la web, el APK ni los datos de presentación.

## Recorridos

- **Mensajes:** selección del aula y contacto docente, filtro Sin leer y conversación con filas virtualizadas. Se consultan los 20 mensajes más recientes; los anteriores se cargan a petición. El contador incluye todos los recibidos sin leer; consultar no marca lectura. La acción explícita marca solo los mensajes recibidos cargados y mantiene las páginas visibles.
- **Comunidad:** Anuncios/Foros con páginas de 20. Anuncios muestra extractos de hasta 180 caracteres y abre el texto completo al solicitar el detalle. Los fijados aparecen primero. El foro consulta un tema individual y sus respuestas por páginas, con las más recientes al final de la conversación.
- **Comunicación con borradores:** mensaje privado, respuesta y tema conservan texto, destino y solicitud por cuenta/API/dispositivo. Se revisan antes de confirmar. Una respuesta incierta conserva la misma operación y puede reintentarse desde la pantalla o desde Borradores. El servidor mantiene sus escrituras idempotentes y sus controles de matrícula/docente/aula concluida. No hay envío automático ni tiempo real.
- **Documentos:** Del aula/Mis documentos/Todos, páginas de metadatos, carga con confirmación y descarga solo al pulsar. Eliminar una carga propia requiere confirmación; el servidor conserva archivos vinculados a entregas o versiones. Subir no equivale a entregar una tarea.
- **Borradores:** listas y filtro Por enviar, continuación de actividades, entregas y comunicación, eliminación local confirmada y envío explícito de pendientes ya aprobados. No envía borradores sin confirmar ni mezcla cuentas o APIs.
- **Guía:** categorías y artículos desplegables para el alumno; se corrigen instrucciones antiguas sobre sesión, adjuntos, reemplazos y borradores, y se añaden orientaciones de documentos y envíos pendientes.

Se mantiene el granate UNSA, tipografía de sistema, áreas seguras, controles accesibles y composición por listas. La revisión de teclado, Atrás y posición de conversaciones invertidas en Android físico sigue pendiente. Las interfaces de los otros roles conservan sus funciones y su diseño anterior.

## API de desarrollo

Nuevo router `module_pages.py`, con consultas compatibles con las anteriores:

| GET bajo `/api/v1` | Función |
| --- | --- |
| `/aulas/{id}/anuncios/pagina` | Resúmenes y filtro `fijados`; orden fijado/fecha/id descendente. |
| `/aulas/{id}/anuncios/{anuncio}/detalle` | Texto completo autorizado de un anuncio. |
| `/aulas/{id}/foros/pagina` | Temas y cantidad de respuestas sin descargar su contenido. |
| `/aulas/{id}/foros/{hilo}/detalle` | Tema individual dentro del aula autorizada. |
| `/foros/{hilo}/mensajes/pagina` | Respuestas por fecha/id descendente. |
| `/aulas/{id}/mensajes/{contacto}/pagina` | Mensajes del vínculo autorizado y total sin leer. |
| `/aulas/{id}/archivos/pagina` | Metadatos visibles y filtro todos/materiales/propios; sin bytes. |

Páginas de 20 en el cliente, máximo 40 en servidor, cursores por fecha/identificador ligados a usuario/consulta/filtro, conteos globales y desempate estable. El cliente conserva filas si falla la siguiente carga, cancela resultados de otra cuenta/contexto y evita identificadores duplicados. No hay cambios de esquema, migraciones, semilla ni escrituras académicas reales para este incremento. Las rutas anteriores siguen disponibles para clientes y roles existentes; no se afirma que sus pantallas ya estén paginadas.

Los borradores añaden el tipo local `comunicacion`, manteniendo compatibilidad con horas/tareas. Un envío se elimina del dispositivo solo al confirmarse su respuesta. Solicitudes confirmadas con destino inválido se conservan y muestran el error.

## Verificación

TypeScript, seis pruebas SQLite de páginas/permisos/metadatos y cuatro pruebas de contrato/borradores correctas. Comprueban 20/20/5 con fechas empatadas, fijados y extractos, total sin leer, acceso retirado, separación de destinatarios, cursores de otra consulta, privacidad de archivos y ausencia de bytes; y aislamiento por cuenta/API, recuperación, pendientes explícitos y reintentos concurrentes con la misma operación. Las escrituras de estas pruebas ocurren en SQLite o almacenamiento simulado.

`npm run test:comunicacion` pasó seis comprobaciones de recorrido, borrador, paginación/reintento, confirmación y permisos. Consulta local real de los módulos; los envíos, lecturas, eliminaciones y conjuntos grandes usan fixtures. Un mensaje con respuesta inicial perdida se reintentó después de recargar y produjo dos solicitudes para un único mensaje. También se verificaron filas 20→40→45, lectura que conserva páginas, anuncio completo solo al abrirlo y protección de documentos de entregas. Sin errores de consola/navegador, API ajena ni escrituras académicas reales. Las capturas finales se revisaron y se corrigió un aviso de listas vacías. Evidencias `.expo/dev/modulos26-*`, fuera de Git.

Exportación web de 144 rutas y bundle Android de 3,5 MB correctos. No equivalen a un APK nuevo ni verifican el teclado o los gestos nativos. Los servidores propios de verificación quedaron cerrados.

El [estado funcional vigente](ESTADO-FUNCIONAL.md) reemplaza los diagnósticos históricos como referencia de lo implementado y lo pendiente para el piloto.
