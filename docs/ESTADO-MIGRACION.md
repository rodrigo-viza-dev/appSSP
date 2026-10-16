# Estado real · 9 de octubre de 2026

## Ubicación activa

El proyecto se copió a `C:\proyectos\appSSP`, accesible en WSL como `/mnt/c/proyectos/appSSP`. Se copiaron fuentes, imágenes, package-lock.json y el historial Git, incluyendo cambios sin confirmar. No se copiaron node_modules Linux, .expo, dist ni carpetas .aws/.codex/.agents. La carpeta original permanece como respaldo y no debe usarse para continuar editando.

## Comprobaciones realizadas con Windows

- PowerShell 5.1 disponible y utilizado desde WSL mediante interoperabilidad.
- `npm ci` ejecutado con `C:\Program Files\nodejs\npm.cmd`: correcto, 601 paquetes instalados.
- `npm run typecheck`: correcto después de ajustar `TabIcon.color` al tipo `ColorValue` de React Native.
- `npm run export:web`: correcto; generó dist y las rutas de las seis pantallas.
- Sintaxis de `scripts/publicar-avance.ps1`: comprobada con el parser de PowerShell, sin errores.
- EAS CLI descargado mediante npx de Windows; `whoami --non-interactive` devuelve **Not logged in**.
- La instalación informó 29 vulnerabilidades de dependencias (10 moderadas, 19 altas). No se ejecutó npm audit fix ni se alteraron versiones automáticamente; revisar antes de un lanzamiento de producción.

No se ha probado visualmente la interfaz en un navegador o dispositivo. La corrección del tipo de color no cambia el código de ejecución de la exportación web comprobada.

## Lo que debe completar el usuario

En PowerShell:

```powershell
Set-Location C:\proyectos\appSSP
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publicar-avance.ps1
```

El script verifica y exporta, solicita iniciar sesión en Expo, vincula un proyecto con eas init y publica con eas deploy una **vista previa**, no producción. El usuario debe entrar con su cuenta, elegir organización/proyecto y subdominio, y compartir la URL resultante. No debe proporcionar credenciales a Codex.

La invocación con ExecutionPolicy Bypass se limita a ese proceso de PowerShell; no cambia permanentemente la política del sistema.

Mensaje preparado en `docs/MENSAJE-AVANCE.md`.

No se publicó nada ni se generó todavía una URL. No hay cuenta Expo vinculada confirmada.

## Continuidad

VS Code fue abierto en C:\proyectos\appSSP. Se lanzó una nueva consola Windows/WSL con Codex; se verificó un proceso Codex activo con directorio /mnt/c/proyectos/appSSP. Puede requerir la confirmación de confianza de la carpeta o autenticación propia de Codex en su ventana; esas interacciones no se completaron desde esta sesión.

Contexto en `docs/CONTEXTO-CODEX.md`, reglas en `AGENTS.md`. El lanzador `scripts/continuar-codex.sh` abre una nueva sesión con ese resumen como prompt y pide inicialmente solo lectura y confirmación del estado. No es un traslado literal del historial del chat ni implica permisos automáticos sobre todas las cuentas.
