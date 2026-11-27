# Incremento 34 · Comunidad docente por páginas

Las vistas de comunidad del personal (docente y administración) dejan de descargar listas completas. Anuncios, temas de foro y respuestas de una conversación se consultan por páginas de 20, con la misma API que ya usaba el alumno. La búsqueda pasa del cliente al servidor y el filtro de fijados se aplica en la consulta. El texto completo de un anuncio se pide al expandirlo, y la conversación abre con el detalle exacto del tema en vez de buscarlo dentro de la lista completa.

Las rutas completas anteriores (`/aulas/{id}/anuncios`, `/aulas/{id}/foros`, `/foros/{id}/mensajes`) se mantienen en el servidor para el APK fijado y para las escrituras. El cliente ya no las usa para leer, y se eliminaron sus funciones de lectura (`getAnuncios`, `getHilos`, `getMensajesForo`).

## API y alcance

Backend: se añade el parámetro `q` a dos lecturas existentes de `module_pages`, sin migraciones ni escrituras:

| GET | Búsqueda |
| --- | --- |
| `/aulas/{id}/anuncios/pagina?fijados=&q=&limite=20&cursor=` | Título, responsable y mensaje completo, sin distinguir mayúsculas. |
| `/aulas/{id}/foros/pagina?q=&limite=20&cursor=` | Título del tema y responsable. No busca en las respuestas. |

La búsqueda admite hasta 120 caracteres (si se pasa, responde 422). Entra en el ámbito del cursor, así que un cursor de otra búsqueda se rechaza con 422. Los comodines `%` y `_` se tratan como texto literal.

Cliente:

- `src/app/comunidad.tsx`: `usePagedQuery` + `useSearch` + `PageFooter` para anuncios y temas; los totales vienen del servidor; botón "Ver anuncio completo" que consulta `/anuncios/{id}/detalle`; mensajes vacíos distintos para búsqueda, fijados y aula sin contenido. El buscador sigue oculto para el alumno, igual que antes.
- `src/app/foro.tsx` (vista del personal): contexto con `getThreadContext` (aula + detalle exacto del tema) y respuestas por páginas con `getForumMessagePage`, más recientes primero. Tras responder se recargan el contexto (contador de respuestas) y la página.

## Verificación

- Backend: `tests.test_module_pages` 6/6 con los casos nuevos (búsqueda por título, mensaje y responsable; cursor de otra búsqueda 422; búsqueda de 121 caracteres 422).
- TypeScript del cliente correcto.
- Suite `test:personal` completa verde: 13 checks, incluida la etapa nueva "Comunidad docente" con 45 anuncios, 45 temas y 45 respuestas ficticias (20→40→45, búsqueda en servidor, fijados 17, detalle completo y contexto exacto del tema). Cero errores, escrituras académicas, APIs externas y peticiones a las rutas completas obsoletas (la guarda incluye ahora anuncios, foros y respuestas).
- HTTP real contra `ssp_test` (`.expo/dev/verificar-comunidad34-real.ps1`, solo lectura) para profesor y alumno: búsqueda con coincidencia, búsqueda sin coincidencias en 0, detalle exacto y 422 por longitud en ambos endpoints.
- Pantalla real en Chromium 390×844 como profesor (`.expo/dev/verificar-comunidad34.cjs`): anuncios por página, búsqueda vacía, detalle completo, temas y conversación con respuestas paginadas; 13 peticiones, 0 escrituras, 0 rutas obsoletas, 0 errores.

En la suite se quitó un cambio local sin commit que forzaba `localhost → 127.0.0.1` en Chromium: Expo escucha en `::1` y con esa regla la suite no podía abrir la app.

No se modificaron el esquema, la presentación ni el APK entregado. Los datos de volumen son ficticios.
