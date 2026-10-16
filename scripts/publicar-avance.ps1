# Ejecutar desde PowerShell de Windows. Publica una vista previa, no produccion.
$ErrorActionPreference = 'Stop'
$taskProject = Split-Path -Parent $PSScriptRoot
$taskNpm = 'C:\Program Files\nodejs\npm.cmd'
$taskNpx = 'C:\Program Files\nodejs\npx.cmd'
if (!(Test-Path $taskNpm)) { throw 'No se encontro npm de Windows en C:\Program Files\nodejs.' }
Set-Location -LiteralPath $taskProject

& $taskNpm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Revisar los errores de TypeScript antes de publicar.' }
& $taskNpm run export:web
if ($LASTEXITCODE -ne 0) { throw 'La exportacion web fallo.' }

Write-Host 'Inicia sesion en tu cuenta Expo en esta terminal. No compartas tu clave con Codex.'
& $taskNpx --yes eas-cli@latest login
if ($LASTEXITCODE -ne 0) { throw 'No se completo el inicio de sesion Expo.' }

Write-Host 'Vincula el proyecto a tu cuenta Expo si aun no esta vinculado.'
& $taskNpx --yes eas-cli@latest init
if ($LASTEXITCODE -ne 0) { throw 'No se completo la vinculacion del proyecto.' }

Write-Host 'Se publicara la demo web como vista previa. Elige el subdominio solicitado.'
& $taskNpx --yes eas-cli@latest deploy
if ($LASTEXITCODE -ne 0) { throw 'No se completo la publicacion de la vista previa.' }
Write-Host 'Comparte la URL indicada arriba con tu lider. Pulsa Explorar demo para recorrerla.'
