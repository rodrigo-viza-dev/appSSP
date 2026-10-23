# Incremento 21 · Navegación y diseño del alumno

La sesión real de alumno pasa del panel plano a cinco pestañas: **Inicio, Bitácora, Aulas, Avisos y Más**. La dirección visual aprobada se incorpora a Expo con granate UNSA `#5E151D`, fondo cálido, tipografía de sistema y menos tarjetas en Inicio. Docente, supervisor y administración conservan sus paneles y permisos actuales.

## Recorrido implementado

- Inicio consulta las aulas y la práctica de la cuenta, prioriza una actividad rechazada y muestra la primera tarea sin entrega, ordenada por plazo. Distingue horas validadas, pendientes y total registrado; la meta procede de la práctica asignada. Los borradores locales aparecen al regresar al inicio.
- Bitácora pide **20 actividades por página** al servidor, por fecha e identificador descendentes. Los filtros de estado se aplican en el servidor. Los totales y contadores corresponden al conjunto autorizado, no a las filas visibles. `FlatList` limita el renderizado inicial; un fallo al cargar otra página conserva las filas y permite reintentar.
- Registrar y corregir actividad reutilizan el formulario existente, con borrador por cuenta/dispositivo y confirmación de envío. El registro confirmado actualiza el resumen. Entregar una tarea o enviar borradores también invalida ese resumen.
- Aulas abre tareas, entregas, notas, documentos y comunidad dentro de su pestaña. Las notas se consultan cuando se abre esa sección. Más agrupa centro/supervisor, metas, expediente, mensajes, borradores, guía y cuenta.
- Cada pestaña mantiene su pila de detalles. Cambiar de pestaña conserva el formulario, el filtro y los datos ya cargados; regresar de un detalle conserva el contexto de su lista. Las rutas anteriores del alumno redirigen a la nueva estructura.
- El alumno deja de tener búsquedas de texto en metas, mensajes, comunidad y guía. Los controles de los otros roles se mantienen.

Los nuevos detalles usan el parámetro `[vista]`: `screen` es un parámetro reservado por la navegación. La demo sigue separada del acceso real.

## API necesaria

Requiere el incremento correspondiente del backend en `desarrollo/entorno-supabase-pruebas`:

| Lectura | Uso |
| --- | --- |
| `GET /api/v1/alumno/inicio` | Aulas, práctica, totales, corrección y tarea pendiente propias. |
| `GET /api/v1/alumno/practicas/{id}/bitacora` | Páginas mediante `limite`, `estado` y `cursor`. |
| `GET /api/v1/alumno/practicas/{id}/actividad/{registroId}` | Detalle autorizado de una actividad. |

Solo el rol ALUMNO accede a estas lecturas y solo a sus prácticas. No cambian las escrituras académicas, las tablas ni las migraciones. La app informa si el servidor no ofrece datos compatibles; no sustituye una respuesta real por datos del prototipo.

## Verificación

- TypeScript con Node/npm de Windows.
- Cuatro pruebas nuevas del backend sobre SQLite en memoria: páginas estables 20/20/5, filtros y totales, permisos, cursor inválido y selección de tareas no entregadas. No escriben en Supabase.
- Exportación web de 129 rutas y bundle Android correctos. El bundle no es un APK instalado.
- `npm run test:alumno`: Chromium a 390×844 contra la API local real de pruebas, navegación de alumno, borrador local, aula/tarea, Más y paneles de los otros tres roles. Inicio también revisado a 360 y 430 px. El caso de interfaz 20→40→45 y el fallo/reintento usan respuestas simuladas; la paginación del servidor se comprueba en SQLite.
- `npm run test:login:real`: formulario SSP, rechazo 401 y acceso 200 con la cuenta ficticia. La llegada esperada ahora es Inicio con cinco pestañas.

Las pruebas de navegador bloquean o evitan escrituras académicas. Evidencias en `.expo/dev/alumno21-verificacion.json`, `login-real-integration.json` y capturas `alumno21-*.png`, fuera de Git. No hay despliegue de producción.

## Revisión pendiente en Android

Iniciar el backend actualizado con `scripts/iniciar-pruebas.ps1 -Lan` y la app con `npm run movil:pruebas`, en la misma Wi-Fi. Entrar como alumno y comprobar:

1. Inicio → registrar actividad → editar sin enviar → cambiar a Aulas → volver a Inicio: el formulario y su borrador deben seguir disponibles.
2. Bitácora → filtrar → abrir una actividad → volver: debe conservarse el filtro. Revisar también el botón Atrás de Android.
3. Aulas → tarea → Avisos → Aulas: debe conservarse el detalle abierto. Revisar teclado, fuente ampliada y áreas seguras.
4. Más → borradores, centro, expediente y cuenta; cerrar sesión y comprobar que no aparece contenido de otra cuenta.

El APK y Google nativo siguen pendientes. Avisos conserva su lectura y filtros existentes: abrir el recurso exacto desde cada aviso requiere ampliar su modelo de destinos. La paginación nueva se limita a Bitácora; otros módulos conservan sus API actuales. Tampoco se incorporan GPS, push, caché completa ni sincronización en segundo plano. La adaptación visual de docente, supervisor y administración es el siguiente bloque de diseño.
