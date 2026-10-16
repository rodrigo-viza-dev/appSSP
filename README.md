# PrácticasCC · UNSA

Aplicación de prácticas preprofesionales de Ciencias de la Comunicación de la UNSA, con Expo SDK 57, React Native, TypeScript y Expo Router para Android, iOS y web.

## Desarrollo en Windows

Abrir PowerShell en la carpeta del proyecto en Windows. Usar Node/npm de Windows; no reutilizar `node_modules` instalado en Linux.

```powershell
npm ci
npm run web
```

Abrir `http://localhost:5173`. Tanto `npm start` como `npm run web` usan el puerto 5173, permitido por el backend. Usar `localhost` en la URL para conservar el origen autorizado.

Para dispositivos, ejecutar `npm start` y escanear el QR con una versión compatible de Expo Go, o pulsar `a` para Android. El simulador de iOS requiere macOS. La verificación física en dispositivos sigue pendiente.

## Configuración de API

La URL predeterminada es `https://back-cs-de-la-com.vercel.app`. Para cambiarla, copiar `.env.example` a `.env.local` y ajustar `EXPO_PUBLIC_API_URL`, sin `/api/v1`. Reiniciar Expo después de cambiar la configuración. Las variables `EXPO_PUBLIC_` son públicas; no deben contener contraseñas ni secretos.

## Verificación

Con Node/npm de Windows:

```powershell
npm run typecheck
npm run test:api
npm run export:web
```

`npm run test:navigation` requiere Expo web abierto y Playwright/Chromium disponibles. Si `playwright-core` está fuera del proyecto, configurar `PLAYWRIGHT_CORE_PATH` con su ruta. El origen predeterminado es `http://localhost:5173`; `SSP_WEB_URL` permite cambiarlo. Estas pruebas usan respuestas simuladas; no certifican la integración real con el backend.

## Estado actual

- Ingreso real contra la API, sesión en memoria, cierre de sesión y paneles de consulta por rol. Un HTTP 401 devuelve al ingreso.
- Demo separada con seis pantallas: ingreso, inicio, asistencia, nueva actividad, bitácora y avisos.
- La demo permite registrar actividades, simular entrada/salida y marcar avisos como leídos; se reinicia al salir o recargar.
- La sesión no se restaura al recargar. No se implementaron GPS, persistencia de la demo, notificaciones push, recuperación por correo ni escrituras reales de bitácora.

El alcance y las comprobaciones del incremento están en [docs/INCREMENTO-01.md](docs/INCREMENTO-01.md). Las dependencias pendientes de backend están en [docs/REVISION-BACKEND-DESPLEGADO.md](docs/REVISION-BACKEND-DESPLEGADO.md).

## Estructura

- `src/app`: rutas y layout de navegación.
- `src/components`: componentes compartidos.
- `src/theme`: paleta institucional UNSA y tipografía.
- `src/state`: sesión y estado compartido de la demo, en memoria.
- `src/services`: cliente HTTP y contratos de API.
- `tests`: pruebas de API y navegación.
- `imagenesReferencias`: mockups de las seis pantallas.

## Diseño

Referencias revisadas: `imagenesReferencias/imagen1.png` y `imagenesReferencias/imagen2.png`.

Encabezados granate `#5E151D`, navegación inferior, tarjetas neutras, horas en tipografía serif y etiquetas de estado siguen las referencias. Ver [docs/diseno.md](docs/diseno.md) para las decisiones visuales.

## Archivos locales

`.gitignore` excluye dependencias, compilaciones, cachés, logs, configuración de herramientas, credenciales y archivos personales de continuidad. El contexto de Codex, los reportes de migración y los lanzadores del equipo permanecen locales. Se conservan en Git el código, `package-lock.json`, `.env.example`, las pruebas, las referencias visuales y la documentación técnica.
