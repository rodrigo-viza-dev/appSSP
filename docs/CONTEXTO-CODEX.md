# Contexto de continuidad · 9 de octubre de 2026

Este archivo resume las decisiones y el estado de la conversación anterior. No es una transcripción literal. Revisar los archivos antes de asumir que los pasos pendientes ya se ejecutaron.

## Actualización · 15 de octubre de 2026

La app ya tiene ingreso real y paneles de consulta por rol contra `https://back-cs-de-la-com.vercel.app`, del repositorio `BastleyNait/BACK-CS-DE-LA-COM`. Sesión en memoria y demo separada. Las cuentas de prueba ADMIN, PROFESOR y ALUMNO fueron autorizadas por el usuario; login y consultas reales respondieron HTTP 200. El alumno tiene un aula, sin práctica activa.

Navegación centralizada con `Stack.Protected` después de corregir un ciclo al salir de demo. Tipos, exportación web y pruebas API pasaron con Windows. Chromium comprobó tres ciclos de entrada/salida, rutas protegidas, paneles por rol y sesión expirada sin errores de React; los paneles del navegador se probaron con respuestas simuladas.

Pendientes de backend: CORS rechaza `http://localhost:8081` y la vista previa Expo; falta `/auth/me`, almacenamiento persistente de archivos y varias operaciones del supervisor. Ver `docs/INCREMENTO-01.md`, `docs/REVISION-BACKEND-DESPLEGADO.md` y `docs/PLAN-DESARROLLO-SSP.md` antes de asumir capacidades completadas. El resto de este documento describe el estado histórico de la primera demo.

## Objetivo y preferencias

Crear con Expo una app de prácticas preprofesionales de Ciencias de la Comunicación de la UNSA, llamada PrácticasCC. El usuario quiere un primer avance navegable que pueda compartir rápidamente con su líder. Prefiere alta calidad visual siguiendo sus mockups y la identidad institucional.

Todas sus herramientas de desarrollo y empaquetado están en Windows: Node, npm y VS Code. Codex se usa en WSL, distribución `kali-linux`. El usuario pidió no ejecutar la app ni las herramientas del proyecto con Node/npm de Linux. Autorizó mover el proyecto a Windows y abrir una nueva sesión de Codex con contexto; luego habilitó acceso completo para realizar la preparación y pidió identificar cualquier vinculación que deba hacer personalmente.

## Rutas

- Origen: `/home/rodriflow/proyectos/appSSP`.
- Origen UNC: `\\wsl.localhost\kali-linux\home\rodriflow\proyectos\appSSP`.
- Destino previsto: `C:\proyectos\appSSP`, WSL `/mnt/c/proyectos/appSSP`.
- Node Windows: `C:\Program Files\nodejs\node.exe`.
- npm Windows: `C:\Program Files\nodejs\npm.cmd`.
- VS Code Windows: `C:\Users\rodri\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd`.
- Codex WSL encontrado en `/home/rodriflow/.nvm/versions/node/v26.5.0/bin/codex`.

## Referencias y diseño

El enlace original de Claude no fue accesible: https://claude.ai/artifact/2KKDHWdXCrCgpjDCo6giJe. Después el usuario proporcionó `imagenesReferencias/imagen1.png` y `imagen2.png`, que sí fueron revisadas visualmente: seis pantallas, encabezados granate, fondo blanco, tarjetas cálidas, navegación inferior y cifras serif.

Manual oficial: https://www.unsa.edu.pe/wp-content/uploads/2018/10/MANUAL-MARCA-UNSA.pdf. Granate RGB 94/21/29 = `#5E151D`, azul RGB 20/30/66 = `#141E42`. No se inventó escudo ni se atribuyó el dorado como color oficial. Decisiones completas en `docs/diseno.md`.

## Implementación

Expo SDK 57, React 19.2.3, React Native 0.86.3, TypeScript y Expo Router; dependencias fijadas mediante package-lock.json. Paleta clara institucional.

- `src/app/index.tsx`: ingreso, validación de correo/contraseña, mensajes de integración pendiente y botón Explorar demo.
- `src/app/(tabs)/_layout.tsx`: Inicio, Asistencia, Bitácora y Avisos.
- `src/app/(tabs)/index.tsx`: resumen, centro Radio Yaraví, supervisora Marisol Chávez, siguiente entrega, acciones y salida de demo.
- `src/app/(tabs)/asistencia.tsx`: entrada/salida en memoria y cronómetro; ubicación explícitamente sin verificar.
- `src/app/nueva-actividad.tsx`: formulario con fecha, horas y descripción; validaciones; inserta pendiente y vuelve a bitácora.
- `src/app/(tabs)/bitacora.tsx`: agrupación mensual y totales sincronizados.
- `src/app/(tabs)/avisos.tsx`: avisos leídos/no leídos y contador.
- `src/components/ui.tsx`: componentes visuales reutilizables e iconos de líneas sin dependencias nuevas.
- `src/state/practice.tsx`: estado compartido en memoria. Recarga o salida reinicia la demo.
- `src/theme/index.ts`: colores UNSA y tipografía.

Datos de mockup: 48 horas pendientes, 60 y 40 validadas. Se distingue total registrado de 148 h de total validado de 100 h. No se presentan antiguos vencimientos de junio como plazos vigentes.

No existen backend, autenticación real, GPS, persistencia ni push. No solicitar contraseñas reales para probar la demo.

## Verificación previa y problema Windows

La base provisional inicial pasó tipos y exportación web en Linux antes de que el usuario indicara usar Windows. Las seis pantallas posteriores NO habían sido compiladas al preparar este contexto.

El usuario intentó `npm ci` con npm Windows desde la carpeta UNC original de WSL, que contenía node_modules Linux, y recibió ENOTEMPTY al borrar node_modules/.bin. Se recomendó una sola copia activa en Windows, reinstalando dependencias con npm Windows. No actualizar npm como supuesto arreglo ni copiar node_modules Linux.

## Compartir el avance

Recomendación: vista previa web mediante EAS Hosting; el líder abre URL sin instalar nada. `app.json` ya tiene web.output static. En PowerShell Windows: npm ci, npm run typecheck, npm run export:web. Para publicar se necesita cuenta Expo, proyecto EAS y autorización de publicación; vinculación/inicio de sesión podrían requerir al usuario. No se ha generado ni compartido una URL.

Guía consultada: https://docs.expo.dev/deploy/web/. EAS CLI puede invocarse con npx eas-cli@latest. Para mostrar por videollamada basta npm run web y compartir pantalla.

Texto sugerido: «Te comparto el primer avance de PrácticasCC. Incluye seis pantallas basadas en los mockups, con la paleta institucional UNSA. Pulsa Explorar demo para revisar la navegación, registrar una actividad y consultar los avisos. Esta versión demuestra la interfaz y los flujos; la autenticación institucional y la ubicación aún están pendientes».

## Continuar

Primero revisar `docs/ESTADO-MIGRACION.md` si existe para conocer el resultado real de migración/verificación. Evitar ejecutar trabajo duplicado al abrir la nueva sesión. Comprobar que el proyecto activo está en /mnt/c/proyectos/appSSP, usar herramientas Windows y continuar preparando la presentación al líder. No publicar ni cambiar cuentas sin autorización.
