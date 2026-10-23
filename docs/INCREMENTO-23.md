# Incremento 23 · Aula, tarea y entrega del alumno

El aula del alumno se organiza en **Tareas, Notas y Recursos**, con el mismo fondo cálido, tipografía de sistema y granate UNSA del nuevo Inicio. Las filas muestran estado, plazo y nota cuando existe. El formulario de entrega tiene su propia pantalla y vuelve al detalle de la tarea.

## Recorrido

- Tareas empieza por Por entregar y permite consultar Entregadas o Todas, sin buscador. El servidor ordena por plazo e identificador, con tareas sin plazo al final. Se piden 20 filas por página; un fallo conserva lo cargado y permite reintentar.
- Notas muestra el promedio registrado, los contadores globales y las tareas calificadas. Una nota cero se conserva y se muestra como cero. Abrir la fila permite consultar la entrega y las observaciones del docente.
- Recursos agrupa documentos, mensajes con el docente, anuncios, foros y metas. Se conservan los accesos existentes y el contexto del aula.
- El detalle de una tarea consulta únicamente esa tarea. Muestra instrucciones, plazo en hora de Lima, entrega y revisión. El historial se consulta al solicitarlo; conocer la revisión actual no descarga el contenido de versiones anteriores.
- Preparar entrega abre una pantalla independiente. Reutiliza borradores por cuenta/dispositivo, revisión previa y confirmación existentes. Cambiar de pestaña conserva el formulario; volver a abrirlo recupera el borrador local.
- Adjuntar documento es opcional y carga el selector al abrirlo. Subir o seleccionar un archivo sigue siendo distinto de confirmar la entrega. No cambian los tipos, límites ni permisos de archivo.
- Al confirmar, se muestra el resultado recibido y se actualiza el resumen del alumno. Volver al detalle consulta la entrega actual. Actualizar aula invalida las listas; las secciones que están cerradas esperan a abrirse para consultarlas.
- El servidor informa si la entrega está habilitada. Una tarea calificada, un plazo terminado, un aula concluida o una práctica cerrada explican el estado y conservan la consulta. Las escrituras existentes vuelven a comprobar las condiciones al guardar.

El formulario incorpora ajuste del espacio del teclado y la navegación inferior se oculta mientras el teclado está abierto. Su comportamiento físico debe comprobarse en Android; la prueba de navegador no reproduce el teclado nativo.

## Backend necesario

Requiere el incremento correspondiente en `desarrollo/entorno-supabase-pruebas`. No modifica tablas, índices, migraciones ni datos semilla.

| Ruta GET, bajo `/api/v1` | Uso |
| --- | --- |
| `/alumno/aulas/{id}/tareas/pagina` | `estado=todas|pendientes|entregadas|calificadas`, `limite` y `cursor`. Filas resumidas, totales globales y promedio propios. |
| `/alumno/aulas/{id}/tareas/{tareaId}` | Tarea individual, entrega propia, aula y disponibilidad de envío. |

La página no devuelve descripciones extensas, adjuntos ni versiones de cada entrega. El detalle consulta las revisiones mediante agregados. Las rutas comprueban el rol ALUMNO y la matrícula; una entrega de otro alumno no se incluye en sus notas ni contadores. La lista antigua de tareas permanece disponible por compatibilidad. Los servicios del cliente usan la nueva consulta individual también al comprobar un envío incierto.

## Verificación focal

Con Python y Node/npm de Windows: TypeScript, seis pruebas nuevas SQLite y once pruebas del contrato cliente correctas. Incluyen páginas estables 20/20/5 con empate de plazo y fechas nulas, filtros y contadores globales, entrega ajena, nota cero, matrícula retirada, cursor inválido y bloqueos de entrega. SQLite no escribe en Supabase.

`npm run test:aulas` pasó seis comprobaciones de navegador: aula/tarea/notas/recursos reales; carga de historial y documentos al abrirlos; anchos 360/390/430; páginas y reintento; borrador y entrega; estados de plazo, nota cero y permisos. La prueba de 45 tareas y el único envío usan respuestas simuladas. No hubo errores de página, conexiones a otra API ni escrituras académicas reales. Evidencias en `.expo/dev/aula23-*`, fuera de Git.

La exportación web de 139 rutas y el bundle Android de 3,4 MB terminaron correctamente. No equivalen a un APK instalado ni a una prueba de Google nativo. No hay despliegue ni fusión con main del backend.

## Revisión en Android

Con el backend actualizado iniciado con `scripts/iniciar-pruebas.ps1 -Lan` y la app con `npm run movil:pruebas`, en la misma Wi-Fi:

1. Aulas → aula → Por entregar/Entregadas/Todas → tarea → Atrás. Comprobar que conserva el filtro y la posición.
2. Notas → tarea calificada → revisión y observaciones. Recursos → documentos o mensajes → Atrás.
3. En una tarea vigente, Preparar entrega → escribir → cambiar de pestaña → volver. Regresar al detalle y reabrir: debe recuperar el borrador.
4. Revisar el formulario con teclado y fuente ampliada, adjunto opcional y botón Atrás del teléfono. Confirmar una entrega solo cuando se desee enviarla a la base de pruebas.

La adaptación docente, el APK y la revisión física siguen pendientes. Otros listados conservan sus API actuales; no se incorpora caché completa ni envío en segundo plano.
