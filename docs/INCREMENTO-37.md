# Incremento 37 · Entrega final (27 de noviembre de 2026)

Versión 1.0.0-entrega.20261127. Web: https://practicascc-entrega-27nov-2026.vercel.app. API: https://practicascc-api-entrega-27nov-2026.vercel.app.

Se usa el mismo método que en la entrega del 23 de octubre (incremento 24), con proyectos y datos nuevos:

- **Datos**: copia privada en el esquema `ssp_entrega_20261127`, hecha desde `ssp_test`. Tiene 28 tablas y solo las cuentas ficticias de revisión (alumno, profesor, supervisor y admin `.prueba@unsa.edu.pe`, más las de gestión), con una contraseña y una clave JWT propias. No se copian las identidades Google, las recuperaciones ni la auditoría anterior. `ssp_test` no se modificó. El script `app/db/presentation_snapshot.py` del backend ahora acepta `SNAPSHOT_SCHEMA`, `SNAPSHOT_VERSION`, `SNAPSHOT_WEB_PROJECT` y `SNAPSHOT_API_PROJECT`; sin ellas conserva los valores del 23 de octubre.
- **API**: proyecto Vercel `practicascc-api-entrega-27nov-2026` con el código de la rama `desarrollo/post-presentacion-2026-10-23`. Los secretos se guardan cifrados en Vercel y en `.expo/dev/entrega36/servidor-secreto.json` (ignorado por Git). CORS permite solo la web de la entrega y el puerto local 5174.
- **Web**: exportación estática de Expo (`EXPO_PUBLIC_API_URL` apunta a la API de la entrega, `EXPO_PUBLIC_PRESENTATION_VERSION` y adjuntos de hasta 4 MB) en el proyecto Vercel `practicascc-entrega-27nov-2026`. Ese proyecto no está conectado a Git, así que el desarrollo posterior no cambia la entrega. La pantalla de ingreso indica "Versión de revisión" y no muestra el acceso demo.
- No se tocó `back-cs-de-la-com.vercel.app` (main del equipo) ni los proyectos y el esquema del 23 de octubre.

## Verificación

- Pruebas del script de copia: 3/3.
- API pública: OpenAPI con 124 rutas, ingreso de los cuatro roles y CORS correcto para la web.
- Web pública: no sirve archivos locales (`.env.local`, `.vercel`), es decir, devuelven 404.
- Recorrido real en Chromium 390×844 (`.expo/dev/verificar-entrega36.cjs`): los cuatro roles entran por el formulario y recorren 20 pantallas principales. Resultado: 0 errores de navegador, 0 errores 5xx, 0 escrituras académicas y 0 desbordes. Capturas en `.expo/dev/entrega36/capturas/`.

## No incluido

Google institucional, envío de correo (SMTP), GPS, notificaciones push, renovación de sesión y APK nuevo. La paginación pendiente (asignaciones del administrador, metas y expediente del alumno) funciona con listas completas: es correcta con el volumen actual, pero no escala.
