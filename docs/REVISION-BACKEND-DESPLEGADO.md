# Backend que se usará para la integración

Revisión: 15 de octubre de 2026 (respuestas del servidor en UTC del 16 de octubre).

## Fuente y alcance

- Repositorio confirmado por el usuario: https://github.com/BastleyNait/BACK-CS-DE-LA-COM
- Rama revisada: `main`, SHA `dd3af513cb1943ffe2cfc1446538acf9de959cf3`.
- API: https://back-cs-de-la-com.vercel.app
- Swagger: https://back-cs-de-la-com.vercel.app/docs
- Contrato consultado: https://back-cs-de-la-com.vercel.app/openapi.json

Se revisaron archivos públicos y se hicieron consultas GET de salud/OpenAPI y una solicitud OPTIONS de CORS. No se inició sesión, crearon cuentas, subieron archivos ni modificaron datos. No se verificaron operaciones autenticadas ni conectividad de la base de datos. La salud responde un JSON fijo y no comprueba PostgreSQL. Tampoco se puede certificar el SHA desplegado a partir de la versión genérica 1.0.0 de OpenAPI.

Esta es la fuente principal para integrar el móvil. La revisión anterior del repositorio gllerenamo queda como comparación, no como prueba de las capacidades de este despliegue.

## Comprobaciones reales

| Comprobación | Resultado |
| --- | --- |
| `GET /` | HTTP 200, `{"status":"ok","app":"SSP Backend"}` |
| `GET /openapi.json` | HTTP 200, versión declarada 1.0.0; 55 rutas y 65 operaciones |
| Preflight para login desde la vista previa Expo | HTTP 400, `Disallowed CORS origin` |
| Autenticación y consultas a BD | No probadas |

El origen probado fue `https://app-ssp--6b07s4oeez.expo.app`. La respuesta permite `https://cs-comunicacion.vercel.app`. Para la versión web hay que alinear tanto los headers fijos de `vercel.json` como `CORS_ORIGINS` de FastAPI. Este resultado afecta al navegador; no demuestra un bloqueo CORS de clientes nativos.

## Funcionalidad publicada en OpenAPI

- Login, registro y solicitud de recuperación.
- Aulas, detalle del alumno, actividad reciente y materiales/archivos.
- Tareas, entregas y calificaciones por aula.
- Panel docente, practicantes, asistencia, revisión y libro de notas.
- Administración de usuarios, roles, aulas, matrícula, reportes y auditoría.
- Registro de empresa y contacto supervisor; resumen de empresa.
- Prácticas, bitácora, cierre y reporte textual.
- Metas, notificaciones consultables, anuncios, foros y mensajes.

No aparecen `/api/v1/auth/me`, edición de perfil, cambio de contraseña, refresh de token, listado de horas del supervisor, aprobación/rechazo de horas ni endpoints de evaluación final del supervisor. El dashboard empresarial cuenta pendientes, pero no completa el circuito de validación. No asumir cobertura por la existencia de modelos o contadores.

## Contratos para el primer incremento

| Operación | Contrato |
| --- | --- |
| Login | `POST /api/v1/auth/login`, JSON con `email` y `password` |
| Respuesta login | `token` y `user` con `id`, `nombres`, `apellidos`, `email`, `role` |
| Roles | `ALUMNO`, `PROFESOR`, `ADMIN`, `SUPERVISOR` |
| Aulas del alumno | `GET /api/v1/alumno/mis-aulas` |
| Práctica activa | `GET /api/v1/practicas/actual` |
| Historial de horas | `GET /api/v1/practicas/{practica_id}/horas` |
| Registro de horas | `POST /api/v1/practicas/{practica_id}/horas`: `horas` entero, `descripcion`, `fecha` opcional |
| Empresa propia | `GET /api/v1/empresa/mine` |

Mantener URL base sin duplicar `/api/v1`. Restaurar identidad con un endpoint autenticado de usuario actual que se debe agregar; conservar el usuario de login localmente no reemplaza validar su vigencia en servidor.

## Correcciones necesarias en el backend

### P0: antes de datos reales

1. **Registro privilegiado:** `app/routers/auth.py` acepta `body.role` del registro público y lo asigna. Forzar rol permitido y activación controlada; altas privilegiadas solo por personal autorizado.
2. **Permisos por práctica:** GET de horas filtra por ID sin comprobar pertenencia; POST de horas tampoco comprueba propietario. El cierre excluye únicamente ALUMNO y no exige docente responsable. `_practicas_visibles` devuelve todas las prácticas para roles distintos de ALUMNO/PROFESOR, incluyendo SUPERVISOR. Aplicar autorización por recurso y rol explícito.
3. **Archivos efímeros:** `app/core/config.py` elige `/tmp/uploads` cuando corre en Vercel; el router escribe bytes en ese directorio. El propio código reconoce que es efímero. Reemplazar por almacenamiento privado persistente antes de usarlo como evidencia. Una fila en BD no garantiza conservar el archivo.
4. **Horas:** registrar una actividad incrementa `horas_acumuladas` inmediatamente. Separar registradas y validadas; implementar aprobación/rechazo y recalcular con estados válidos.
5. **Entregas:** comprobar propiedad y aula del archivo, fecha límite del servidor, tipos permitidos y límite acordado de 10 MB. El router de archivos mantiene 20 MB.
6. **CORS web:** corregir los dos niveles de configuración y comprobar preflight desde desarrollo y vista previa autorizados. No hace falta permitir todos los orígenes.

### P1: completar procesos

- Agregar `/auth/me` y definir expiración, suspensión y recuperación de sesión.
- Recuperación real: actualmente solo retorna un mensaje; falta envío, token de un uso y restablecimiento.
- Completar rutas del supervisor: sus practicantes, registros pendientes, decisión con motivo, evaluación final y comprobación de pertenencia.
- Validar expediente completo en cierre: horas aprobadas, tareas requeridas, metas y ficha de empresa según reglas confirmadas.
- Generar PDF real: el reporte existente devuelve contenido textual en JSON.
- Diseñar idempotencia y conflictos para sincronización offline antes de habilitar reintentos automáticos de registros.
- El documento de despliegue publica cuentas semilla con contraseñas de ejemplo: confirmar con el responsable si siguen activas y retirarlas o rotarlas antes de operación real. No se utilizaron en esta revisión.

## Cambios respecto del plan previo

1. Ya existe una URL pública comprobada: fase 0 no empieza buscando dónde está alojado el servidor.
2. Sigue pendiente comprobar base de datos, datos de prueba y operaciones autenticadas.
3. `/auth/me` y las operaciones del supervisor requieren implementación en este repositorio; no basta conectarlas desde el móvil.
4. Las correcciones de permisos y almacenamiento preceden al piloto con datos reales.
5. El móvil puede avanzar con cliente API, login, rutas por rol y consultas, utilizando cuentas de prueba autorizadas. La restauración verificada de sesión depende de completar `/auth/me`.
6. Mantener la estimación del plan como provisional; el alcance de backend es mayor que una conexión de pantallas.

## Texto listo para compartir con el responsable del backend

«Ya identificamos la API https://back-cs-de-la-com.vercel.app y comprobamos salud y OpenAPI. Para conectar PrácticasCC necesitamos confirmar que este main corresponde al despliegue y disponer de cuentas de prueba por rol en un entorno autorizado. Detectamos pendientes: GET /api/v1/auth/me, permisos por práctica/usuario, alta pública sin selección de roles privilegiados, almacenamiento persistente para archivos y rutas del supervisor para validar horas y evaluación final. El preflight desde nuestra vista previa Expo devuelve Disallowed CORS origin; hay que alinear CORS_ORIGINS y vercel.json. ¿Qué cambios ya tienen previstos y en qué entorno podemos probar sin afectar datos reales?»

Texto preparado para que el usuario lo comparta. No se envió ningún mensaje.
