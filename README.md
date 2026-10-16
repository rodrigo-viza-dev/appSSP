# PrácticasCC · UNSA

Base inicial con Expo SDK 57, React Native, TypeScript y Expo Router para Android, iOS y web.

## Desarrollo en Windows

Abrir PowerShell en la carpeta del proyecto en Windows. Usar Node.js LTS y npm de Windows; no reutilizar `node_modules` instalado en Linux.

```bash
npm ci
npm start
```

Proyecto activo: `C:\proyectos\appSSP`; Codex puede editar los mismos archivos desde `/mnt/c/proyectos/appSSP`. La carpeta original de WSL queda como respaldo. Node Windows está en `C:\Program Files\nodejs\node.exe`. Si npm no está en PATH, usar `& 'C:\Program Files\nodejs\npm.cmd' start` desde PowerShell.

Desde Expo CLI, escanear el QR con una versión compatible de Expo Go, o pulsar `a` para Android y `w` para web. El simulador de iOS requiere macOS.

```bash
npm run typecheck
npm run export:web
```

Dependencias reinstaladas con npm de Windows. Verificación de tipos y exportación web de las seis pantallas correctas. La app no se ha comprobado visualmente en un dispositivo. No ejecutar herramientas del proyecto con npm/Node Linux.

## Compartir el primer avance

En PowerShell, desde esta carpeta:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publicar-avance.ps1
```

El script solicita acceso a tu cuenta Expo, vinculación del proyecto y subdominio, y devuelve una URL de vista previa. No se ha publicado todavía. Ver `docs/ESTADO-MIGRACION.md` y el mensaje listo para compartir en `docs/MENSAJE-AVANCE.md`.

## Estructura

- `src/app`: rutas y layout de navegación.
- `src/components`: componentes compartidos.
- `src/theme`: paleta institucional UNSA y tipografía.
- `src/state`: estado compartido de la demo, en memoria.

## Estado del diseño

Referencias revisadas: `imagenesReferencias/imagen1.png` y `imagenesReferencias/imagen2.png`.

Se implementaron ingreso, inicio, asistencia, nueva actividad, bitácora y avisos. Encabezados granate, navegación inferior, tarjetas neutras, horas en tipografía serif y etiquetas de estado siguen las referencias. Ver `docs/diseno.md` para las decisiones visuales.

Usar **Explorar demo** para recorrer los flujos. Ingresar y recuperar contraseña muestran el estado de integración pendiente; no autentican usuarios. Asistencia registra hora de entrada y salida en memoria; no verifica ubicación. Guardar una actividad actualiza la bitácora y las horas pendientes. Tocar un aviso lo marca como leído. Salir de la demo o recargar reinicia los datos. No hay persistencia, backend, GPS ni notificaciones push conectados.

Documentación: https://docs.expo.dev/get-started/create-a-project/
