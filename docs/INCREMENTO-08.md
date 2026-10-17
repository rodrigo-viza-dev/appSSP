# Incremento 8 · Integración con Supabase de pruebas

La app se conectó a FastAPI local y al Supabase de pruebas preparado en el incremento 7. Se verificaron operaciones reales con datos ficticios, además de corregir el estado accesible de las casillas de asistencia en web.

## Corrección

Las casillas mostraban «Presente» visualmente, pero `accessibilityState.checked` no producía `aria-checked` con la versión instalada de React Native Web. Lectores de pantalla y herramientas de automatización no podían distinguir su estado. Se usa `aria-checked`, admitido por los tipos de React Native y por web, manteniendo el estado sincronizado con la lista y la revisión previa al guardado.

La prueba existente de asistencia ahora comprueba la casilla marcada y desmarcada, y simula todas las solicitudes `/api/v1/**` para funcionar también cuando Expo usa la API local. Fuente: [accesibilidad de React Native Web](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web-docs/src/pages/docs/concepts/accessibility.md).

## Evidencia · 16 de octubre de 2026

- Comprobación de base: esquema `ssp_test`, 20 tablas con RLS y sin permiso de uso para `anon` ni `authenticated`.
- Login de seis cuentas ficticias: HTTP 200. Resúmenes de administración y supervisor y práctica activa del alumno: HTTP 200. Acceso a aula ajena rechazado para docente/alumno: HTTP 403/404.
- Chromium móvil contra `localhost`: el docente confirma una nota 17; aparece en el libro y luego en la cuenta del alumno, junto con la observación guardada.
- Asistencia: el docente desmarca al alumno, revisa y confirma la ausencia; una consulta posterior al servidor conserva `presente=false`.
- Avisos: marcado individual HTTP 204 y nueva consulta con `leida=true`.
- Recorrido Chromium sin errores de página ni solicitudes a la API de producción.
- Tipos y recorrido existente `test:asistencia` ejecutados con Node/npm de Windows. La integración utiliza solicitudes reales al entorno de pruebas; el recorrido de regresión usa respuestas simuladas.

## Uso local

App: `http://localhost:5173`. API: `http://localhost:8000/docs`. Arranque: `scripts\iniciar-pruebas.ps1` en el backend y `npm run web:pruebas` en la app. No hace falta repetir la inicialización si las tablas ya existen.

Los accesos ficticios se conservan en `.local/ACCESOS-PRUEBAS.md` del backend, fuera de Git. Los verificadores y evidencias locales permanecen en `.expo/dev/`. No se guardan secretos en esta documentación.

El siguiente trabajo funcional es el circuito de horas. Creación de tareas, almacenamiento persistente de archivos y mejoras del control de asistencia en el servidor siguen en el plan.
