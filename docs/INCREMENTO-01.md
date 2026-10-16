# Incremento 1: ingreso API y paneles por rol

Implementado el 15 de octubre de 2026.

## Incluido

- Cliente HTTP con URL configurable, Bearer token, tiempo máximo de 20 segundos y cancelación al abandonar el panel.
- Login real contra `/api/v1/auth/login`, comprobación de forma de respuesta y roles admitidos.
- Sesión exclusivamente en memoria; no guarda contraseña, JWT en disco ni identidad persistente.
- Panel autenticado: alumno consulta aulas y práctica; docente, administrador y supervisor consultan sus resúmenes.
- Carga, vacío, error, actualización y salida de sesión. Un 401 termina la sesión; un 403 muestra falta de permisos.
- Demo original separada y disponible. No se conectan sus escrituras al servidor.
- Se admite correo externo para supervisores con cuenta autorizada.

## Ejecutar en PowerShell Windows

```powershell
Set-Location C:\proyectos\appSSP
npm run web
# o npm run start para abrir desde un dispositivo compatible
```

La URL predeterminada es `https://back-cs-de-la-com.vercel.app`. Para cambiarla, copiar `.env.example` a `.env.local` y ajustar `EXPO_PUBLIC_API_URL`, sin `/api/v1`. Nunca agregar secretos a una variable EXPO_PUBLIC. Recargar la app después de cambiar la configuración.

## Verificación realizada

Con Node/npm Windows: `npm run typecheck`, `npm run export:web` y `node --test tests/api.test.cjs`: correctos. Cinco pruebas locales con respuestas simuladas comprueban envío de login, distinción 401/403, error de red, consultas del alumno con Bearer y rechazo de sesiones incompletas/roles desconocidos. No representan una prueba autenticada del servidor real.

Posteriormente se comprobaron las cuentas de prueba que autorizó el usuario:

| Cuenta | Login real | Consulta real |
| --- | --- | --- |
| `admin@unsa.edu.pe` | HTTP 200, rol ADMIN | `/admin/resumen`: HTTP 200 |
| `profesor@unsa.edu.pe` | HTTP 200, rol PROFESOR | `/profesor/resumen`: HTTP 200 |
| `alumno@unsa.edu.pe` | HTTP 200, rol ALUMNO | `/alumno/mis-aulas` y `/practicas/actual`: HTTP 200 |

El alumno recibe un aula y no tiene práctica activa. Las contraseñas no se agregaron a código ni configuración. Las pruebas no modificaron datos del servidor.

Se ejecutó `tests/browser-navigation.cjs` en Chromium con Node de Windows, a 390 × 844 px, contra Expo web local. Pasaron: entrar/salir de demo tres veces, acceso directo a ruta protegida, panel y salida para ADMIN/PROFESOR/ALUMNO, y 401 con retorno al ingreso. No se detectaron errores de React. Los paneles de esta prueba usan respuestas simuladas explícitas; no son una prueba de integración web contra producción.

El ciclo de redirecciones se corrigió centralizando la navegación en `Stack.Protected`. Los botones de entrar/salir de demo solo cambian el estado; no ejecutan redirecciones simultáneas. Esto elimina la competencia entre redirecciones de pantalla y de layout.

Pruebas locales en PowerShell:

```powershell
npm run test:api
# Con Expo web abierto y playwright-core disponible:
# $env:PLAYWRIGHT_CORE_PATH = "ruta completa a playwright-core"
npm run test:navigation
```

La prueba de navegación requiere Playwright/Chromium en Windows. Se reutilizó una instalación existente para esta verificación; no se añadieron dependencias ni se descargaron navegadores. `SSP_WEB_URL` permite cambiar el origen de la prueba (predeterminado: `http://localhost:8081`).

## Bloqueo web comprobado

El preflight de login desde `http://localhost:8081` devuelve HTTP 400, `Disallowed CORS origin`. El servidor responde con `Access-Control-Allow-Origin: https://cs-comunicacion.vercel.app`. No se evitó este control con proxies ni opciones inseguras del navegador.

Texto listo para compartir con el responsable del backend:

«Las cuentas admin, profesor y alumno ingresan y consultan sus paneles con HTTP 200. Para probar PrácticasCC en navegador, el preflight POST de `/api/v1/auth/login` desde `http://localhost:8081` devuelve HTTP 400, `Disallowed CORS origin`. Por favor agrega ese origen de desarrollo y `https://app-ssp--6b07s4oeez.expo.app` a `CORS_ORIGINS`, alinea los headers de `vercel.json` y redespliega. También necesitamos GET `/api/v1/auth/me` para implementar restauración verificada de sesión. Avísame cuando esté listo para repetir la prueba web completa».

El usuario comparte este texto; no se envió ningún mensaje.

## Pendiente para validar integración completa

- Cuentas de prueba ADMIN, PROFESOR y ALUMNO autorizadas por el usuario: login y consultas verificados con HTTP 200. El alumno tiene un aula y no tiene práctica activa. No se modificaron datos.
- Prueba manual Android y accesibilidad/teclado en dispositivos. La navegación web automatizada ya pasó.
- Corregir CORS en backend para navegador de desarrollo y vista previa. No usar proxies para ocultar ese problema.
- Agregar `/auth/me` y resolver verificación/restauración antes de persistir sesión.
- Corregir permisos y acumulados del backend antes del piloto con datos reales.
- Los acumulados se etiquetan como valores del servidor, que pueden incluir horas pendientes; no se presentan como validados.
- Las rutas de demo siguen protegidas por su estado de demo; los paneles reales se protegen por sesión. Los permisos efectivos dependen del backend.
- No se implementaron recuperación por correo, registro de usuarios, escritura real de bitácora, archivos, push ni publicación.

Referencias consultadas: https://docs.expo.dev/guides/environment-variables/ y https://docs.expo.dev/router/advanced/authentication/ .
