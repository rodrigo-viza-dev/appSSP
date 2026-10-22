# PrácticasCC · UNSA

Aplicación de prácticas preprofesionales de Ciencias de la Comunicación de la UNSA, con Expo SDK 57, React Native, TypeScript y Expo Router para Android, iOS y web.

## Desarrollo en Windows

Abrir PowerShell en la carpeta del proyecto en Windows. Usar Node/npm de Windows; no reutilizar `node_modules` instalado en Linux.

```powershell
npm ci
# En otra terminal: iniciar C:\proyectos\appSSP-backend\scripts\iniciar-pruebas.ps1
npm run web
```

Abrir `http://localhost:5173`. `npm run web` usa ahora la API local de pruebas y comprueba su conexión a Supabase antes de iniciar Expo. Rechaza un segundo servidor en 5173: detener el anterior con Ctrl+C. Usar `localhost` para conservar el origen autorizado.

Para Android en la misma Wi-Fi, iniciar el backend con `scripts\iniciar-pruebas.ps1 -Lan` y la app con `npm run movil:pruebas`. Usar Expo Go compatible con SDK 57 para el ingreso SSP, o abrir en Chrome la dirección LAN que muestra el comando. Google nativo requiere OAuth y una compilación de desarrollo. Ver [acceso Google y revisión Android](docs/ACCESO-GOOGLE-Y-ANDROID.md). La verificación física en dispositivos sigue pendiente.

## Configuración de API

`npm run web` y `npm run web:pruebas` fijan `EXPO_PUBLIC_API_URL=http://localhost:8000` para su proceso. Para abrir deliberadamente otro backend, usar `npm run web:configurado`: respeta `.env.local`/el entorno y, sin configuración, conserva `https://back-cs-de-la-com.vercel.app`. `npm start` y las exportaciones también conservan esa configuración. Para cambiarla, copiar `.env.example` a `.env.local` y ajustar `EXPO_PUBLIC_API_URL`, sin `/api/v1`. Detener el Expo anterior y reiniciar después de cambiar la configuración. Las variables `EXPO_PUBLIC_` son públicas; no deben contener contraseñas ni secretos.

El login muestra el servidor elegido y distingue las cuentas ficticias locales de las cuentas de otros servidores. En Supabase de pruebas las tablas están en **`ssp_test`**, con `public` vacío. Las cuentas pertenecen a `ssp_test.users`, no a Supabase Auth; el login usa FastAPI/JWT. Consultar [diagnóstico de acceso y base](docs/INCREMENTO-17.md) y [preparación del entorno de prueba](docs/INCREMENTO-07.md). No reinicializar la base para intentar ver las tablas.

## Verificación

Con Node/npm de Windows:

```powershell
npm run typecheck
npm run test:api
npm run export:web
```

En cada incremento, ejecutar solo las comprobaciones necesarias para el cambio. `npm run test:navigation` comprueba acceso y demo; `npm run test:aulas`, aulas y tareas; `npm run test:centro`, el registro de centro/supervisor; `npm run test:avisos`, la bandeja; `npm run test:docencia`, revisión y calificación docente; `npm run test:asistencia`, el guardado de asistencia académica; `npm run test:horas`, la bitácora y revisión; `npm run test:tareas`, publicación y entrega escrita; `npm run test:auditoria`, consulta administrativa y filtros. Requieren Expo web abierto y Playwright/Chromium disponibles. Si `playwright-core` está fuera del proyecto, configurar `PLAYWRIGHT_CORE_PATH` con su ruta. El origen predeterminado es `http://localhost:5173`; `SSP_WEB_URL` permite cambiarlo. Estas pruebas usan respuestas simuladas; no certifican la integración real con el backend.

## Estado actual

Administración puede consultar los 200 registros recientes de auditoría, filtrar responsables/aulas y revisar cambios de asistencia por estudiante.

Cada incremento terminado se documenta, se verifica con Node/npm de Windows y se sube a GitHub con un commit propio de ese incremento. Los archivos locales y artefactos de pruebas permanecen excluidos de Git.

- Ingreso SSP contra la API, sesión segura en Android, restauración con `/auth/me`, cierre de sesión y paneles por rol. Web conserva sesión durante recargas de la pestaña. El cliente Web de Google ya está configurado localmente y su botón real funciona en localhost; falta revisar el ingreso con una cuenta. HTTP por Wi-Fi conserva el acceso SSP. Ver [incremento 20](docs/INCREMENTO-20.md). La recuperación SSP está preparada; falta SMTP real.
- El alumno abre sus aulas y consulta tareas, entregas, calificaciones y observaciones. Puede entregar texto o archivos privados PDF/DOCX/ZIP de hasta 10 MB y reemplazar una entrega sin calificar antes del vencimiento, conservando versiones. El docente puede editar instrucciones y ampliar el plazo de la tarea con motivo. Los plazos se muestran en hora de Lima y se comprueban en servidor.
- **Mi centro de prácticas** permite consultar y registrar el centro y su supervisor. Cada registro requiere revisar y confirmar los datos; los resultados inciertos se consultan antes de repetir un envío. Registrar el contacto no crea una cuenta de supervisor ni asigna una práctica.
- **Prácticas y supervisores**, desde Administración, crea cuentas SSP de supervisor, vincula/reasigna su acceso y asigna prácticas a alumnos matriculados con centro propio y horas requeridas explícitas. Una cuenta puede supervisar varios centros; cambiar el vínculo revoca el acceso anterior.
- **Borradores y envíos pendientes** conserva actividades y respuestas por cuenta y entorno en el dispositivo. Permite continuar sin API si la sesión guardada aún está vigente y enviar los pendientes confirmados al reconectar, comprobando resultados antes de reenviar. La sincronización es explícita en primer plano.
- **Expediente** conecta evaluación del supervisor, requisitos de cierre, autorización docente y PDF privado. Conserva una copia al cerrar y bloquea cambios posteriores incompatibles.
- **Mis avisos** consulta los avisos de la cuenta para los cuatro roles, con contador compartido, filtros y marcado individual o masivo confirmado por el backend. Actualizar consulta nuevos avisos; no son notificaciones push.
- **Docencia** permite a profesores y administración abrir sus aulas, consultar el avance de estudiantes, revisar entregas, guardar una nota entera de 0 a 20 con observaciones y consultar el libro de notas. La calificación requiere revisión y confirmación; un resultado incierto se consulta antes de reenviar.
- **Asistencia académica** permite consultar una fecha, revisar presentes/ausentes y confirmar la lista completa del aula. Con el backend actualizado distingue propuesta, registro parcial y asistencia guardada; valida padrón/revisión y evita sobrescribir cambios concurrentes. Conserva el historial de alumnos retirados y audita cada cambio. Con el servidor anterior permite consulta. Esta asistencia se diferencia de las jornadas y horas de prácticas.
- Demo separada con seis pantallas: ingreso, inicio, asistencia, nueva actividad, bitácora y avisos.
- La demo permite registrar actividades, simular entrada/salida y marcar avisos como leídos; se reinicia al salir o recargar.
- GPS, persistencia de la demo y notificaciones push siguen pendientes. La bitácora y los documentos nuevos del backend de pruebas se conservan en la base privada de Supabase. Google y correo necesitan configuración externa antes de usarse con cuentas reales.

El alcance y las comprobaciones están en [incremento 1](docs/INCREMENTO-01.md), [incremento 2](docs/INCREMENTO-02.md), [incremento 3](docs/INCREMENTO-03.md), [incremento 4](docs/INCREMENTO-04.md), [incremento 5](docs/INCREMENTO-05.md) e [incremento 6](docs/INCREMENTO-06.md). Los incrementos recientes incorporan [conexión de pruebas](docs/INCREMENTO-07.md), [integración verificada](docs/INCREMENTO-08.md), [bitácora y validación de horas](docs/INCREMENTO-09.md) , [publicación y entrega escrita](docs/INCREMENTO-10.md), [asistencia con padrón y auditoría](docs/INCREMENTO-11.md) y [consulta administrativa de cambios](docs/INCREMENTO-12.md). Para estas funciones actualizadas, iniciar el backend de desarrollo y ejecutar `npm run web:pruebas`; la app comprueba que el servidor tenga las capacidades actualizadas. Las dependencias del despliegue anterior están en [docs/REVISION-BACKEND-DESPLEGADO.md](docs/REVISION-BACKEND-DESPLEGADO.md).

## Estructura

- `src/app`: rutas y layout de navegación.
- `src/components`: componentes compartidos.
- `src/theme`: paleta institucional UNSA y tipografía.
- `src/state`: sesión y estado compartido; la demo permanece en memoria.
- `src/storage`: credencial de sesión y borradores aislados por cuenta/API.
- `src/services`: cliente HTTP y contratos de API.
- `src/features`: consultas y presentación de módulos funcionales.
- `src/utils`: formato de fechas compartido.
- `tests`: pruebas de API y navegación.
- `imagenesReferencias`: mockups de las seis pantallas.

## Diseño

Referencias revisadas: `imagenesReferencias/imagen1.png` y `imagenesReferencias/imagen2.png`.

Encabezados granate `#5E151D`, navegación inferior, tarjetas neutras, horas en tipografía serif y etiquetas de estado siguen las referencias. Ver [docs/diseno.md](docs/diseno.md) para las decisiones visuales.

## Archivos locales

`.gitignore` excluye dependencias, compilaciones, cachés, logs, configuración de herramientas, credenciales y archivos personales de continuidad. El contexto de Codex, los reportes de migración y los lanzadores del equipo permanecen locales. Se conservan en Git el código, `package-lock.json`, `.env.example`, las pruebas, las referencias visuales y la documentación técnica.
