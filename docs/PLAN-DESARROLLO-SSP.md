# Plan de desarrollo funcional de PrácticasCC

Fecha: 15 de octubre de 2026. Alcance: aplicación móvil Expo y cambios necesarios en el backend SSP existente. Documento de planificación; no implica implementación ni publicación.

> Actualización de fuente: el usuario confirmó que el backend usado para despliegue es `BastleyNait/BACK-CS-DE-LA-COM`. Ver [revisión del backend desplegado](REVISION-BACKEND-DESPLEGADO.md), que prevalece sobre las observaciones del repositorio anterior en este documento. Se comprobó `https://back-cs-de-la-com.vercel.app` y su OpenAPI. En este despliegue faltan `/auth/me` y las operaciones de validación/evaluación del supervisor; las filas que las mencionan más abajo son objetivos pendientes de backend, no capacidades publicadas. El preflight desde la vista previa Expo es rechazado y los archivos usan almacenamiento temporal en Vercel.

## 1. Resultado esperado

Un estudiante inicia sesión, consulta su aula, registra su centro, conserva borradores de campo sin conexión, envía horas y entregas, recibe observaciones y descarga su expediente. El supervisor valida los registros de sus estudiantes y completa su evaluación. El docente controla asistencia académica, revisa tareas, sigue metas y autoriza el cierre. Administración gestiona usuarios, matrícula y periodos con trazabilidad.

La prioridad es completar procesos con datos persistentes y permisos correctos. Mantener Expo, TypeScript, Expo Router y la identidad UNSA (#5E151D). Reutilizar componentes actuales. Evitar un rediseño general y no hacer de Figma una dependencia para implementar.

## 2. Estado comprobado

### App local

- Seis pantallas base: ingreso, inicio, asistencia, nueva actividad, bitácora y avisos.
- Estado compartido en `src/state/practice.tsx`, solamente en memoria.
- Ingreso real, cliente API y paneles de consulta por rol; sesión en memoria y demo separada. Ver [incremento 1](INCREMENTO-01.md) para el alcance y las comprobaciones realizadas.
- No hay restauración de sesión, almacenamiento seguro, persistencia de demo, archivos reales, sincronización ni push. La recuperación por correo sigue pendiente.
- Tipos, pruebas API, exportación web y navegación automatizada se verificaron en Windows para el incremento 1. La prueba visual en dispositivos sigue pendiente.
- Desarrollo web en `http://localhost:5173`; los preflight de login y consultas con Bearer aceptan ese origen desde el 16 de octubre.
- Vista previa registrada: https://app-ssp--6b07s4oeez.expo.app. No se comprobó su disponibilidad actual.

### Backend revisado

Repositorio: https://github.com/gllerenamo/PIS2026_Cs-Comunicacion, rama `develop`, commit `f4eebf86e42c80e1feced16f921e8bb9d6336f12`. Lectura estática de routers, modelos, esquemas y dependencias; sin ejecutar el servidor ni comprobar una base de datos desplegada.

El backend contiene JWT, perfiles, aulas, matrículas, tareas, calificaciones, archivos, prácticas, horas, empresas, supervisores, evaluaciones, asistencia académica, metas, notificaciones consultables, anuncios, foros, mensajes y administración.

El manual proporcionado describe FastAPI + PostgreSQL en Supabase y despliegue en Vercel. Usa URLs de ejemplo y señala adaptaciones pendientes. No constituye evidencia de un servicio público activo. Documento: https://docs.google.com/document/d/1mEV6n_qXCiGcLF2tkNrlxMHST41l8SP-ZL2xBTIvL34/edit

## 3. Brechas que condicionan la implementación

| Hallazgo | Trabajo necesario | Prioridad |
| --- | --- | --- |
| Roles reales `ALUMNO`, `PROFESOR`, `ADMIN`, `SUPERVISOR` | Mapear etiquetas de interfaz. Definir si coordinador necesita un rol propio; no asumir que equivale a administrador | P0 |
| Registro público recibe `role` y lo asigna | Impedir alta pública de roles privilegiados; flujo de invitación/activación y asignación administrativa | P0 |
| `get_current_user` verifica token/usuario, sin comprobación de cuenta activa observada | Definir activación, suspensión y revocación efectiva de acceso | P0 |
| Endpoints de horas y cierre con controles insuficientes por recurso | Validar propietario, docente asignado y supervisor vinculado en cada operación; denegar por defecto | P0 |
| Alta de horas suma pendientes; recálculo excluye solo rechazadas | Separar registradas, pendientes y validadas; solo validadas habilitan cierre | P0 |
| Entrega comprueba existencia de archivo, sin control observado de dueño/aula ni plazo | Vincular archivo, autor, tarea y aula; comprobar vencimiento con reloj del servidor | P0 |
| Archivos admiten 20 MB y usan directorio local | Acordar 10 MB para entregas, tipos permitidos y almacenamiento privado persistente | P0 |
| Recuperación devuelve mensaje sin enviar correo | Implementar token de un uso, expiración y servicio de correo | P1 |
| Cierre comprueba horas y empresa, sin expediente completo | Añadir evaluación final, tareas requeridas aprobadas, metas y permisos del responsable | P1 |
| Reporte final devuelve texto en JSON | Generar PDF descargable con permisos y versión del expediente | P1 |
| Avisos consultables no equivalen a push o tiempo real | Implementar eventos, destinatarios, dispositivos y entrega/reintento | P2 |

P0: antes del piloto con datos reales. P1: necesario para operación completa. P2: después de estabilizar el flujo principal, antes de declarar cubiertas las HU correspondientes.

## 4. Reglas de negocio por confirmar

No convertir el resumen de requisitos o valores predeterminados del código en reglamento confirmado.

1. Horas mínimas por especialidad, periodo y modalidad. El código usa 360 como predeterminado; confirmar fuente institucional.
2. Si 4 horas diarias es mínimo obligatorio, recomendación o admite excepciones; tratamiento de fracciones y jornadas máximas.
3. Definición de asistencia académica semanal frente a entrada/salida en empresa. Son registros distintos; el cronómetro actual no prueba asistencia.
4. Qué sucede con la cuarta inasistencia: alerta, solicitud de retiro o retiro formal. No retirar automáticamente sin regla aprobada.
5. Quién valida horas, quién puede corregir un rechazo y si existe segunda aprobación docente.
6. Entregas tardías, reemplazos, nota mínima aprobatoria y tareas obligatorias para cierre.
7. Diferencia de atribuciones entre asesor, coordinador y administrador.
8. Alta de supervisores con correo externo: el login actual restringe a `@unsa.edu.pe`, lo que debe adaptarse al flujo autorizado.
9. Alcance de la firma solicitada: aprobación registrada, OTP o firma digital con requisitos específicos. No llamar firma digital a una aprobación simple.
10. Periodo de conservación de expedientes, acceso posterior al cierre y responsables de restauración de respaldos.

Registrar resolución, responsable y fecha de cada decisión. Las decisiones pendientes no impiden construir servicios y navegación, pero bloquean automatismos que dependan de ellas.

## 5. Arquitectura propuesta

```text
Pantallas Expo Router por rol
    → módulos funcionales y validación de formularios
    → servicios tipados / cliente HTTP
    → FastAPI /api/v1
        → PostgreSQL: datos y auditoría
        → almacenamiento privado: archivos y PDF
        → correo / notificaciones / tareas programadas

Dispositivo: sesión segura + caché por cuenta + borradores + cola de sincronización
```

- Mantener este repositorio para móvil y el repositorio SSP como fuente del backend. No conectar móvil directamente a tablas de Supabase ni duplicar autenticación con Supabase Auth.
- `src/app`: rutas y composición. `src/features`: auth, aulas, prácticas, entregas, revisión, comunicación y administración. `src/services`: cliente y contratos. `src/storage`: sesión, borradores y cola. `src/components` y `src/theme`: reutilización visual.
- Separar sesión, datos remotos y estado de formulario. Mantener demo aislada mediante configuración y un origen de datos explícito.
- Configurar URL pública de API por entorno; ninguna clave de base de datos o servicio dentro de la app.
- Obtener contratos desde OpenAPI verificado. Adaptar nombres del backend en una capa central, sin traducir roles de forma diferente en cada pantalla.
- JWT en almacenamiento seguro nativo; definir sesión web por separado. No guardar contraseñas. Comprobar `/auth/me` al restaurar. Si no hay refresh disponible, pedir nuevo ingreso al expirar; no inventar un flujo de renovación.
- 401: recuperar sesión o pedir ingreso conservando borradores. 403: informar falta de permiso sin cerrar automáticamente una sesión válida. Manejar 409, 413, 422, timeout y desconexión con mensajes útiles.
- Caché y borradores aislados por usuario. Al salir, eliminar credenciales y datos sensibles según política; no enviar pendientes de una cuenta desde otra.
- Datos de tiempo en UTC y presentación en America/Lima. Fechas límite y permisos siempre se resuelven en servidor.
- Acciones críticas transaccionales e idempotentes; evitar duplicar horas o entregas al reintentar.
- En despliegue serverless, validar límites de carga, almacenamiento, generación de PDF y ejecución en segundo plano con documentación vigente antes de elegir proveedores.

## 6. Mapeo inicial de contratos existentes

Prefijo de todas las rutas siguientes: `/api/v1`. Existencia en código no significa prueba de integración aprobada.

| Flujo | Ruta observada | Consideración |
| --- | --- | --- |
| Ingreso / usuario | `POST /auth/login`, `GET /auth/me` | Respuesta login contiene `token` y `user` |
| Registro / recuperación | `POST /auth/register`, `POST /auth/recover` | Requieren correcciones descritas |
| Aulas del alumno | `GET /alumno/mis-aulas` | No usar la ruta ilustrativa `/practicante/mis-cursos` |
| Aula | `GET /alumno/aulas/{aula_id}` | Revisar membresía y datos expuestos |
| Tareas | `GET /alumno/aulas/{aula_id}/tareas` | Estados de UI deben contemplar pendientes y vencidos |
| Enviar entrega | `POST /alumno/aulas/{aula_id}/tareas/{tarea_id}/entregas` | Una entrega en el código actual; definir reemplazos |
| Archivos | `GET/POST /aulas/{aula_id}/archivos` | Verificar multipart, permisos y persistencia |
| Práctica actual | `GET /practicas/actual` | Contemplar ausencia de práctica y selección de periodo |
| Bitácora | `GET/POST /practicas/{practica_id}/horas` | Corregir permisos, validación y cómputo |
| Empresa | `GET /empresa/mine`, `POST /empresa` | Confirmar esquemas contra OpenAPI del entorno desplegado |
| Validación externa | `GET /empresa/horas`, `PUT /empresa/horas/{registro_id}` | Solo estudiantes vinculados al supervisor |
| Revisión docente | `GET /profesor/aulas/{aula_id}/entregas`, `PUT /profesor/entregas/{entrega_id}/calificar` | Confirmar esquema y autorización por aula |
| Avisos | `GET /notificaciones`, `PUT /notificaciones/{notif_id}/read` | No representan push |
| Cierre / reporte | `POST /practicas/{practica_id}/cerrar`, `POST /practicas/{practica_id}/reporte` | Cierre incompleto y reporte textual |

Ampliar esta tabla con request, response, errores, roles, ownership, paginación, archivo y prueba por operación en la fase 0. Toda ruta nueva debe marcarse como propuesta hasta existir en OpenAPI.

## 7. Navegación y usabilidad

| Rol | Navegación principal propuesta | Acción prioritaria |
| --- | --- | --- |
| Practicante | Inicio, Aulas, Bitácora, Avisos; perfil y empresa en Más | Registrar actividad / entregar tarea |
| Docente | Resumen, Aulas, Revisiones, Avisos | Revisar pendientes y tomar asistencia |
| Supervisor | Pendientes, Practicantes, Evaluaciones, Perfil | Validar horas con contexto suficiente |
| Administrador/coordinador | Resumen, Usuarios, Aulas, Reportes | Gestionar cuentas y matrículas |

No trasladar tablas anchas al móvil. Mostrar listas filtrables y detalle por estudiante. Acciones masivas y reportes extensos pueden aprovechar la web existente, manteniendo las operaciones esenciales accesibles en móvil.

Cada pantalla debe incluir estados de carga, vacío, error, sin conexión y éxito. Formularios con etiquetas visibles, teclado adecuado, errores junto al campo y conservación del texto. Botones accesibles, soporte de texto ampliado, lectores de pantalla y estados expresados con palabras, además de color. Avisar cuándo algo es borrador local, enviado, rechazado o validado. Confirmar rechazo y cierre; nunca mostrar éxito antes de la respuesta efectiva del servidor.

## 8. Fases y criterios de aceptación

### Fase 0 — Auditoría y contrato operativo (3–5 días hábiles)

- Confirmar rama, versión desplegada, URL real, OpenAPI, base de pruebas y responsables del backend.
- Matriz de HU: existente en código / probado / parcial / ausente; inventario de contratos y riesgos.
- Revisar permisos por recurso en todos los routers, no solo los hallazgos iniciales.
- Acordar reglas pendientes, datos semilla por rol y estrategia de archivos/despliegue.
- Ejecutar tipos y exportación con Node/npm Windows; probar la base en Android y navegador.

Salida: conexión comprobada contra entorno de pruebas, contratos versionados y backlog priorizado. Si falta infraestructura, el desarrollo puede avanzar con contratos y mocks explícitos; la integración real permanece pendiente.

### Fase 1 — Acceso y fundamento de integración (1–2 semanas)

HU-1, HU-2, HU-3 y base de HU-12.

- Corregir asignación pública de roles, activación, permisos y pertenencia en servidor.
- Cliente HTTP, sesión segura, restauración, logout y navegación por roles.
- Perfil, recuperación real y registro controlado con estados de activación.
- Datos de API separados de la demo; trazas técnicas sin tokens ni contraseñas.

Salida: cada rol entra a su pantalla, reinicia la app y recupera sesión; tokens vencidos se manejan; cuentas suspendidas y accesos a recursos ajenos se rechazan desde la API. Un usuario público no puede obtener privilegios eligiendo un rol.

### Fase 2 — Prácticas, empresa y bitácora completa (2 semanas)

HU-13, HU-14, HU-28/HU-43 y base de metas.

- Registro de centro y supervisor vinculado; práctica/periodo activo.
- Formulario de actividad, historial y detalle con motivo de rechazo.
- Borradores persistentes sin conexión y cola de envío con identificador único por operación.
- Totales separados y revisión externa; auditoría de actor, fecha y resultado.
- Corrección de pendientes y rechazados según reglas; bloqueo de cambios en validados salvo procedimiento autorizado.

Salida: crear borrador sin red, cerrar y abrir la app, reconectar y enviar exactamente una vez. Un rechazo no suma horas validadas. Otro supervisor no accede al registro. Repetir aprobación no duplica el acumulado.

### Fase 3 — Aulas, tareas, archivos y notas (2 semanas)

HU-4 a HU-10, HU-27/HU-54.

- Aulas por matrícula y periodo, materiales por semana y acceso a sesión virtual con ventana temporal.
- Lista de tareas, detalle, carga real PDF/DOCX/ZIP de hasta 10 MB y constancia de recepción.
- Archivos privados con validación de contenido/tipo/tamaño, propiedad y descarga autorizada.
- Revisión docente, nota 0–20, observación y estado; descarga individual y lote ZIP según límites del entorno.
- Gestionar cargas interrumpidas y archivos huérfanos. No declarar entrega completada solo porque terminó la carga.

Salida: una entrega puntual se conserva tras reinstanciar cliente/servidor; un archivo prohibido o sobredimensionado es rechazado también por API; el reloj del dispositivo no permite evadir el plazo; solo el docente responsable ve y califica la entrega. El alumno recibe y entiende la observación.

### Fase 4 — Seguimiento y operación académica (1–2 semanas)

HU-11, HU-12 completo, asistencia y metas.

- Dashboard docente con filtros, horas validadas, entregas pendientes y alertas explicables.
- Asistencia académica por sesión/semana, corrección auditada y alerta por umbral acordado.
- Metas por especialidad con evidencia y aprobación.
- Usuarios, roles, suspensión, aulas, asignación docente y matrículas.

Salida: matrícula y roles se reflejan en permisos reales; alertas derivan de datos verificables; asistencia académica y jornada en empresa se presentan separadas. Nunca ejecutar retiro irreversible solo por un contador local.

### Fase 5 — Evaluación, cartas y cierre (1–2 semanas)

Ficha final, cartas, HU-15 y HU-16.

- Evaluación del supervisor, evidencia y aprobación autenticada; OTP si se confirma como requisito.
- Carta de presentación PDF con plantilla institucional aprobada, emisor y registro.
- Checklist de cierre calculado en servidor: horas validadas, tareas obligatorias, metas, empresa y evaluación.
- PDF consolidado, acceso autorizado, expediente versionado y auditoría del cierre.

Salida: ningún cliente puede cerrar un expediente incompleto invocando directamente la API. El PDF abre en dispositivo y refleja notas, registros, responsables y estado real. Un expediente cerrado bloquea modificaciones incompatibles; cualquier reapertura requiere permiso y motivo.

### Fase 6 — Comunicación y notificaciones (1–2 semanas)

HU-17, anuncios, foros y chat.

- Anuncios docentes y foros con pertenencia al aula y respuestas.
- Mensajería privada y adjuntos autorizados, con paginación y estados de envío.
- Eventos de vencimiento, observación, nota y validación; bandeja persistente.
- Registro de dispositivos, consentimiento push, bajas al salir, reintentos y enlaces a la pantalla correspondiente.
- Elegir sondeo, tiempo real y procesamiento programado según infraestructura comprobada. No prometer procesos permanentes dentro de una función serverless sin soporte.

Salida: destinatarios correctos, mensajes privados inaccesibles a terceros, notificaciones sin duplicación y bandeja usable aunque se deniegue push. Verificar push con compilación y dispositivos compatibles.

### Fase 7 — Piloto y preparación para uso (1–2 semanas)

- Recorrido completo con al menos un usuario por rol, datos de prueba y un periodo.
- Pruebas de permisos, sesión, archivos, red inestable, sincronización, concurrencia y cierre.
- Verificar accesibilidad, teclado, navegación atrás, fechas y pantalla pequeña.
- Revisar dependencias y resolver riesgos aplicables; el reporte de vulnerabilidades de octubre debe actualizarse, no asumirse vigente.
- Migraciones reproducibles, respaldos y restauración ensayada; monitoreo y procedimiento de soporte.
- Guía breve por rol, lista de incidencias y correcciones del piloto.

Salida: ningún bloqueo crítico de acceso, pérdida de datos o permisos; escenarios esenciales aprobados y documentados. Preparar compilación candidata y procedimiento de publicación. Publicar requiere autorización concreta del usuario.

## 9. Pruebas y definición de terminado

Para cada HU: contrato real, permisos en backend, datos persistentes, estados de UI, errores recuperables y evidencia de aceptación. No considerar una HU terminada por tener una pantalla o un endpoint.

Pruebas prioritarias:

- API: matriz de roles y pertenencia; usuario A intentando operar recursos de B; alta privilegiada; suspensión y token expirado.
- Negocio: nota fuera de 0–20, plazo vencido, suma de horas validadas, repetición de envío, expediente incompleto y carrera entre validación/cierre.
- Archivos: contenido permitido, MIME inconsistente, tamaño, archivo ajeno, URL privada y persistencia tras reinicio/despliegue.
- Móvil: conservar borradores, no mezclar cuentas, recuperación tras caída durante envío, cierre de app y reconexión.
- Integración: estudiante registra → supervisor valida → docente revisa → expediente se cierra → PDF descargado.
- Operación: migraciones, respaldo/restauración y diagnóstico de una petición fallida sin exponer información sensible.

Instalación, tipos, pruebas y Expo con PowerShell en `C:\proyectos\appSSP`, usando Node/npm Windows. Operaciones Git que escriban metadatos, con Git Windows. No mezclar node_modules de Linux y Windows.

## 10. Estimación y dependencias

Estimación inicial: 10–15 semanas de trabajo para una persona con participación oportuna del responsable del backend, acceso a pruebas y decisiones académicas resueltas. Es una estimación de planificación, no una fecha comprometida; recalcular tras fase 0. Infraestructura, firma y reglas todavía no confirmadas pueden ampliar el alcance.

Hitos: acceso real (fase 1), primer circuito operativo de horas (fase 2), piloto académico con entregas y seguimiento (fase 4), expediente completo (fase 5), cobertura funcional y lanzamiento candidato (fase 7).

Dependencias externas: URL/versión real del API, usuarios de prueba por rol, responsable para cambios backend, almacenamiento privado, correo, credenciales de servicios gestionadas fuera del repositorio, plantilla institucional y validación reglamentaria. Para implementar no se necesitan contraseñas personales del usuario.

## 11. Primer incremento recomendado

Empezar por fase 0 y fase 1, con objetivo concreto: iniciar sesión contra FastAPI, restaurar la sesión y mostrar aula y práctica reales. A continuación cerrar el circuito de registro y validación de horas. Ese recorrido prueba integración, persistencia y permisos antes de extender el resto de módulos.

Entregables iniciales: matriz de endpoints y permisos, lista de cambios P0 del backend, configuración de entorno de ejemplo sin secretos, cliente API, sesión y navegación por rol, y evidencia de prueba con alumno/docente/supervisor/admin.
