# Incremento 35 · Mensajes, expedientes y comunidad del personal, por páginas y con pantallas limpias

Las pantallas del personal que todavía descargaban listas completas pasan a páginas de 20 con búsqueda en el servidor. Además adoptan el sistema visual vigente de `DESIGN.md` (filas agrupadas, chips de filtro, un solo botón primario por pantalla y cabecera crema), en lugar de tarjetas y botones apilados del sistema clásico:

- **Mensajes del docente** (`/mensajes`): selector de aula como grupo de filas, contador global de no leídos, búsqueda por nombre o correo, chips Todos/Sin leer y contactos por páginas.
- **Conversación privada** (`/conversacion`): contacto exacto desde el servidor, mensajes por páginas (los más recientes primero, "Cargar mensajes anteriores"), lectura explícita de los recibidos cargados y redacción en una página propia. La conversación del alumno también usa ahora el contacto exacto en vez de descargar su lista de contactos.
- **Expedientes del personal** (`/expedientes`): prácticas por páginas con búsqueda y chips Todas/En curso/Cerradas. Si se abre desde el seguimiento de un alumno, la lista se limita en el servidor a esa aula y ese alumno.
- **Comunidad y foro del personal** (`/comunidad`, `/foro`): el incremento 34 ya paginaba estas vistas; ahora también usan las mismas filas y chips (Anuncios/Foros, Todos/Fijados). Tocar un anuncio despliega su contenido completo y tocar un tema abre la conversación. Publicar y responder se hace en una página propia.

## API

Backend (sin migraciones ni escrituras nuevas):

| GET | Uso |
| --- | --- |
| `/equipo/aulas/{id}/contactos/pagina?q=&sinLeer=&limite=20&cursor=` | Contactos del docente responsable, alfabéticos, `noLeidos` por fila y global. ALUMNO/SUPERVISOR/ADMIN: 403. |
| `/aulas/{id}/contactos/{otro}` | Contacto exacto para docente y alumno; 403 fuera del vínculo, 404 si no existe. |
| `/equipo/practicas/pagina?…&aulaId=&alumnoId=` | Filtros opcionales nuevos, dentro del ámbito del cursor. |

Cliente: `getContactPage` y `getChatContext` (contacto exacto) en `src/services/mensajes.ts`; `getPracticePage` acepta un alcance `{ aulaId, alumnoId }` y comprueba que la respuesta lo respete. Se eliminó `getMensajes` (lista completa sin usos). Componentes nuevos en `src/features/equipo/messages.tsx` (StaffMessages, StaffConversation, StaffRecords) y `src/features/equipo/community.tsx` (StaffCommunity, StaffForum). Las rutas solo eligen la vista del alumno o la del personal.

Cambio de comportamiento: antes, los contactos del docente se ordenaban con los no leídos primero. Ahora el orden es alfabético y los no leídos se ven con el chip "Sin leer" y el contador global. El orden alfabético permite paginar de forma estable.

## Verificación

- Backend: `test_staff_pages`, `test_direct_messages` y `test_module_pages`, 24/24, con dos casos nuevos (contactos y filtros de prácticas).
- TypeScript correcto.
- Suite `test:personal` completa verde: 15 checks. Etapas nuevas: mensajes del docente (45 contactos 20→40→45, búsqueda, Sin leer, contacto exacto, conversación 20→40, lectura confirmada con 1 escritura aislada) y expedientes (45 prácticas 20→40→45, Cerradas 7, búsqueda y alcance desde seguimiento). La etapa de comunidad se adaptó a los nuevos controles y comprueba que no haya desbordamiento horizontal. 0 errores, 0 escrituras académicas reales y 0 peticiones a listas completas (la guarda incluye ahora `/aulas/{id}/contactos` y `/aulas/{id}/mensajes/{otro}`).
- HTTP real contra `ssp_test` (`.expo/dev/verificar-mensajes35-real.ps1`, solo lectura): página de contactos y contacto exacto coherentes, conversación por páginas, contacto del docente visto desde el alumno, filtro de prácticas por aula/alumno; 403 para alumno y supervisor en la página de contactos, 404 para contacto inexistente y 422 por búsqueda larga.
- Pantallas reales en Chromium 390×844 (`.expo/dev/verificar-mensajes35.cjs` y `.expo/dev/verificar-comunidad34.cjs`): contactos, conversación del docente y del alumno, expedientes con filtro, anuncios con detalle desplegado, temas y respuestas; 0 escrituras, 0 rutas obsoletas, 0 errores.

Lección de entorno: después de varios cambios, el Expo aislado (5174) llegó a recompilar el bundle completo en cada petición (~57 s), y la suite fallaba en "Servidor local no preparado". Reiniciar solo ese proceso lo resolvió (respuestas de 0,5 s).

Pendiente de paginar: asignaciones de administración (`/asignaciones` descarga usuarios, centros, aulas y prácticas completos) y las metas y el expediente del alumno.
