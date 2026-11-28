# Incremento 40 · Notificaciones push en la web y entrega 1.1

## Notificaciones push (web)

- **Backend**:
  - Tabla `suscripciones_push` (id = sha256 del endpoint, usuario, endpoint, llaves del navegador), creada con `python -m app.db.migrate_push`, que es idempotente, activa RLS y revoca el acceso a `anon` y `authenticated`. Se aplicó en `ssp_test` y en `ssp_entrega_20261127` con autorización del usuario.
  - `add_notice` encola el push en la sesión. Se envía solo en `after_commit`, con una sesión nueva; si la transacción se revierte, el push se descarta.
  - Si el servicio responde 404 o 410, la suscripción se elimina. Un fallo de push nunca afecta al evento académico.
  - Endpoints: `GET /push/capacidades` (clave pública), `POST /push/suscripciones` (máximo 10 navegadores por cuenta) y `POST /push/suscripciones/baja`.
  - Llaves VAPID propias en `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`, guardadas en el `.env` local y en Vercel, nunca en Git. Sin llaves, la app no ofrece activar las notificaciones.
- **App**:
  - `public/sw.js` muestra el aviso y, al tocarlo, abre la tarea, la actividad o el inicio.
  - `src/services/push.ts` y la fila "Notificaciones en este dispositivo" (`PushToggle`), en Avisos del alumno y del personal.
  - La fila solo aparece en navegadores compatibles y si el servidor tiene llaves.
  - En iPhone solo funciona con la web añadida a la pantalla de inicio (iOS 16.4 o superior). El APK no recibe push: necesitaría Firebase.

## Entrega 1.1 (mismo enlace)

La API y la web de `practicascc-entrega-27nov-2026` se actualizaron con todo lo de los incrementos 37 a 40: Google activo, sesión renovable, metas del alumno y asignaciones del administrador por páginas, y push. Versión `1.1.0-entrega.20261127`, `versionCode` 25.

## Verificación

- Backend: `test_push` 4/4 (envío tras confirmar, descarte tras revertir, limpieza 410, capacidades y baja) y `test_access_and_functional_base` 19/19.
- TypeScript correcto.
- API pública: centros por página, renovación de sesión y metas del alumno por página.
- Recorrido remoto de 4 roles por el formulario (`.expo/dev/verificar-entrega36.cjs`): 22 pantallas, 0 errores, 0 errores 5xx y 0 escrituras académicas.
- Push real (`.expo/dev/verificar-push39.cjs`) con Edge y un perfil temporal:
  - El alumno activa las notificaciones en el enlace público, el servidor envía y el servicio de push de Windows responde 201. Después se desactivan.
  - Las suscripciones de prueba se eliminaron.
  - El Chromium de Playwright no sirve para esta prueba: no tiene servicio push.
