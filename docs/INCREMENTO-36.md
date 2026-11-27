# Incremento 36 · Pulido final de pantallas principales

Preparación de la entrega final (27 de noviembre de 2026).

- **Inicio del alumno** según la referencia `imagenesReferencias/Inicio-Pr-xima-tarea-primero.png` (la versión que sigue el flujo: primero lo que hay que hacer, luego registrar, luego el avance): marca PrácticasCC arriba, saludo con nombre completo, aula y periodo de la práctica, chip de estado (en curso, lista para cierre o cerrada), sección "Lo próximo para ti" con la corrección pendiente o la próxima entrega (toda la tarjeta abre la tarea), botón Registrar actividad, horas en una tarjeta propia y accesos directos a Aulas y Avisos. "Actualizar mi resumen" pasa a ser un enlace de texto, así queda un solo botón principal.
- **Pestañas principales sin flecha "atrás"**: las raíces `/equipo/*` y `/alumno/*` son destinos de la barra inferior, no páginas apiladas. `useStackBack` (en `src/components/ui.tsx`) lo resuelve en `Header`, `StudentPage` y `ListHeading`.
- **Inicio del personal**: las cifras ocupan la fila completa aunque sean impares y "Actualizar resumen" es un enlace de texto.
- Se retiraron `imagen1.png` e `imagen2.png` de las referencias (decisión del usuario) y se añadieron las dos variantes del Inicio.

## Verificación

TypeScript correcto. Capturas reales de solo lectura en Chromium 390×844 de 23 pantallas de los cuatro roles contra `ssp_test` (`.expo/dev/capturar-final.cjs`, evidencias en `.expo/dev/final/`): 0 errores de navegador y 0 desbordes horizontales.
