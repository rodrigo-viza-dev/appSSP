# Incremento 19 · Acceso institucional y base funcional para revisión móvil

Se conectan los cuatro bloques pendientes de la base funcional y se prepara Google institucional. Todo opera en el backend de desarrollo y la base `ssp_test`; no hay despliegue de producción.

## Acceso

- Google para `@unsa.edu.pe`, verificado en servidor y vinculado por `sub`. Alta nueva solo ALUMNO; los usuarios existentes confirman su contraseña SSP en la primera vinculación y conservan su rol. Faltan credenciales OAuth y prueba real. Ver [configuración y Android](ACCESO-GOOGLE-Y-ANDROID.md).
- Sesión Android en SecureStore y restauración con `/auth/me`. Web conserva la sesión durante las recargas de la pestaña. La recuperación con código de un uso queda preparada; falta SMTP real.
- El cierre de sesión retira la credencial guardada. La recuperación de contraseña invalida sesiones previas. La app no almacena contraseñas.

## Prácticas y supervisores

- Nueva pantalla Administración → Asignar prácticas y vincular supervisores. Alta de cuenta de supervisor SSP, incluidos correos externos, sin envío de credenciales.
- Asignación a alumno matriculado, aula activa y centro propio; exige indicar horas y fundamento, sin inventar un umbral institucional. No crea otra práctica mientras exista una sin cerrar.
- Vínculo/reasignación con control del valor anterior, auditoría y revocación inmediata del acceso anterior. Un supervisor puede tener varios centros. No cambia vínculos de centros con expedientes cerrados.

## Documentos, tareas y entregas

- Selección y carga real de PDF/DOCX/ZIP de hasta 10 MB; MIME y contenido comprobados en servidor. Rechazo de archivos cifrados, rutas inseguras, ejecutables y archivos comprimidos con límites excesivos. Una validación de formato no equivale a un antivirus.
- Los archivos nuevos se conservan en una tabla privada de la base autorizada, con hash y metadatos. No dependen del disco temporal. Límite técnico inicial de 100 MB por cuenta. Antes de producción hay que dimensionar almacenamiento, respaldos y límites del despliegue; el transporte HTTP de Vercel puede imponer un límite inferior a 10 MB.
- Los alumnos solo ven sus documentos y materiales docentes; el docente responsable y administración tienen acceso al aula. Descarga autenticada y sin caché, con guardar/compartir en Android. Las cargas sin entrega pueden eliminarse; los archivos de entregas e historial se conservan.
- Entregas con texto o archivo. Reemplazo antes del vencimiento y mientras no exista calificación, con motivo, revisión e historial. Esa es la política implementada para este circuito, no un reglamento institucional confirmado. El cierre del expediente bloquea cambios.
- Edición docente de título, instrucciones y plazo, con motivo e historial. La ampliación es para la tarea completa; no hay prórroga individual por estudiante. Se conserva el plazo existente cuando solo se editan instrucciones. La calificación rechaza una versión de entrega obsoleta.

## Borradores y envío

- Actividades nuevas/corregidas y respuestas de tareas se guardan por cuenta, API y recurso en el dispositivo. Incluyen la clave de envío o revisión y el archivo ya subido cuando corresponda.
- Panel → Borradores y envíos pendientes permite continuar sin consultar aulas, eliminar borradores y enviar los confirmados cuando haya conexión. El contenido sin confirmar nunca se envía. La sincronización es explícita en primer plano; no funciona en segundo plano ni conserva una copia offline de todos los datos.
- Una respuesta incierta conserva el pendiente. La app consulta lo ya guardado antes de reenviar; el backend mantiene deduplicación y controles de revisión.

## Recorridos para revisar

1. Alumno: ingresar, recargar/reabrir, preparar una actividad, volver a Borradores y continuarla; guardar un envío pendiente y enviarlo al reconectar. Cambiar de cuenta debe ocultar los borradores de la anterior.
2. Alumno/docente: subir un documento, adjuntarlo y confirmar una entrega de prueba. Reemplazarla sin calificar, revisar versiones y descargar el adjunto desde el docente. Calificar y comprobar que ya no permite reemplazo.
3. Docente: ampliar el plazo de una tarea vencida, con motivo; el alumno vuelve a poder entregar según la hora del servidor.
4. Administración: crear supervisor ficticio, vincular centro y asignar una práctica de un alumno sin otra abierta y con matrícula. Cambiar supervisor y comprobar que el anterior pierde acceso.
5. Google: por ahora debe informar configuración pendiente. La prueba con cuenta real se hará al configurar OAuth y una compilación Android.

## Verificación

Pruebas focales Windows: 16 casos nuevos del backend y 8 del expediente aprobados en SQLite aislado; 6 pruebas API del cliente correctas. Tipos correctos, exportación web de 38 rutas y bundle Android generados. Chromium 390×844 contra la API real comprobó `/auth/me` para los cuatro roles, consulta de asignaciones ADMIN, restauración tras recarga, borrador recuperado con API desconectada y aislamiento al cambiar de cuenta; cero errores de página, APIs externas o escrituras académicas. Google y SMTP estaban desactivados en esta integración; sus dependencias se aislaron en las pruebas del backend.

Migración aditiva aplicada a `ssp_test` sin semillas. Las evidencias `base-funcional-integration.json`, `borradores-mobile.png` y `borrador-sin-api-mobile.png` quedan en `.expo/dev`, fuera de Git. La vista de tamaño móvil no sustituye la revisión en Android físico.

La consulta real de esquema encontró 28 tablas: las seis nuevas tienen RLS, anon/authenticated siguen sin USAGE sobre `ssp_test` y el índice del vínculo de supervisor ya permite varios centros. Evidencia local `schema19.json`.

Siguen fuera de este bloque: push, tiempo real, GPS/jornada, cartas y rúbrica institucionales, prórrogas individuales, renovación automática de sesión y publicación. La revisión en Android físico la realizará el usuario.
