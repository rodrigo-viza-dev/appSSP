# Incremento 17 · Entorno de ingreso y comprobación de Supabase

## Problema confirmado

Había dos procesos Expo en el puerto 5173: uno escuchaba en `::1` con la API de pruebas y otro en `::` con el backend público anterior. En Chromium, `http://localhost:5173` enviaba el login a `http://localhost:8000`, mientras `http://127.0.0.1:5173` lo enviaba a `https://back-cs-de-la-com.vercel.app`. La identificación del destino se hizo con credenciales ficticias de diagnóstico y solicitudes interceptadas; no se enviaron claves de pruebas al backend público. Sin el enlace y correo del intento del usuario, no se puede atribuir su rechazo particular a una cuenta concreta.

La consulta directa de PostgreSQL confirmó 21 tablas en `ssp_test`, todas con RLS, y cero tablas en `public`. Hay siete cuentas ficticias en `ssp_test.users`; sus contraseñas coinciden con TEST_SEED_PASSWORD local y las siete autenticaron con HTTP 200 contra FastAPI local. Las cuentas de la aplicación no aparecen en Supabase Auth: la arquitectura es Expo → FastAPI/JWT → PostgreSQL de Supabase. No se inicializó ni modificó la base para diagnosticarla.

## Cambio

- `npm run web` usa ahora el mismo arranque local comprobado que `web:pruebas`. Ambos rechazan otro servidor en 5173 y verifican `/dev/ready` con esquema `ssp_test` y entorno development/test antes de abrir Expo.
- `web:configurado` permite elegir deliberadamente el backend de `.env.local`/el entorno, con el respaldo público anterior. `npm start`, dispositivos y exportaciones mantienen su configuración existente; localhost móvil requiere una dirección alcanzable desde el teléfono.
- El login muestra el servidor elegido y explica qué cuentas corresponden al entorno local. Un 401 al ingresar informa de correo/contraseña incorrectos para ese entorno; los 401 posteriores indican sesión vencida.
- Se detuvieron los dos procesos Expo anteriores y se dejó un único servidor local iniciado mediante `npm run web`.
- Cinco pruebas antiguas de interfaz interceptan `/api/v1/**` independientemente del host para conservar su aislamiento al cambiar de entorno.
- [Consulta SQL de comprobación](sql/verificar-tablas-pruebas.sql), solo lectura, para revisar las tablas y el número de cuentas desde el proyecto Supabase correcto.

## Verificación

Con Node/npm de Windows: `typecheck`, los seis casos de `tests/api.test.cjs` y `test:navigation` correctos. La prueba de navegación usa respuestas simuladas y comprueba demo, paneles por rol y vencimiento de sesión. El arranque rechazó el puerto ocupado antes de retirar los duplicados y después inició correctamente conectado al esquema de pruebas.

`npm run test:login:real` ejecutó Chromium a 390 × 844, sin simular respuestas de la API: contraseña incorrecta → HTTP 401 con mensaje visible; contraseña local correcta de `alumno.prueba@unsa.edu.pe` → HTTP 200 y panel del alumno visible. Cero errores de página y cero solicitudes a APIs externas. El test solo permite la API local, conserva claves/JWT en memoria y no crea cuentas ni modifica datos académicos. Requiere Playwright/Chromium disponibles y `PLAYWRIGHT_CORE_PATH` si se usan fuera del proyecto.

Evidencia local excluida de Git: `.expo/dev/diagnostico-login-db.json`, `diagnostico-login-browser.json`, `login-real-integration.json` y capturas `login-*-mobile.png`. La consulta SQL y las siete autenticaciones son reales; la prueba inicial de destinos y `test:navigation` son diagnósticos con solicitudes interceptadas. No se volvió a ejecutar semilla ni migraciones.

## Acceso local

Abrir `http://localhost:5173` después de iniciar el backend de pruebas y `npm run web`. Usar una cuenta como `alumno.prueba@unsa.edu.pe` y la clave del archivo local del backend `.local/ACCESOS-PRUEBAS.md` (también TEST_SEED_PASSWORD en su `.env`). La contraseña institucional no autentica estas cuentas ficticias. No añadir contraseñas a Expo ni a Git. La sesión permanece en memoria; recuperación por correo e ingreso institucional siguen pendientes.
