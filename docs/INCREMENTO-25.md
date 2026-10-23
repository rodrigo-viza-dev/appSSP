# Incremento 25 · Mi práctica para el alumno

El alumno encuentra centro, supervisor, metas y expediente con la misma composición de Inicio: cabeceras claras, listas, tipografía de sistema y granate UNSA. El trabajo continúa en `desarrollo/post-presentacion-2026-10-23`; la entrega etiquetada `avance-2026-10-23-v0.2.0` y sus enlaces permanecen separados.

## Recorrido

- **Centro y supervisor** separa los datos del centro y el contacto de supervisión. Distingue contacto registrado de cuenta vinculada y explica que los cambios de ficha requieren coordinación. Conserva registro, validación, revisión previa, confirmación y consulta tras un resultado incierto.
- **Mis metas** muestra objetivos completados, filtros Todas/En progreso/Completadas y filas con avance individual. El detalle explica quién define la meta y cómo se actualiza; las horas cuentan solo si están validadas. No suma cantidades de unidades distintas ni añade buscador al alumno. Las filas usan `FlatList`; la API de metas todavía devuelve su listado completo, sin paginación nueva.
- **Mis expedientes** presenta las prácticas por aula y periodo. **Mi expediente** prioriza el conteo de requisitos, las horas validadas y el estado del cierre. Permite consultar bitácora, tareas y metas; la evaluación, los criterios docentes y los datos de la práctica se despliegan al solicitarlos. El PDF se descarga únicamente al pulsar su botón.
- Los requisitos cumplidos no equivalen a un cierre autorizado: el alumno ve que corresponde al docente o a la coordinación. Un expediente cerrado muestra su copia conservada y la autorización, con consulta y descarga del PDF.
- Una práctica específica no disponible no cambia silenciosamente a otra práctica. El cliente también rechaza respuestas con identidad de otro alumno.
- Se habilitó el ajuste del espacio del teclado en Registrar/Corregir actividad y en el registro de centro/supervisor. La comprobación del teclado nativo sigue pendiente.
- Los controles desplegables y filtros comunican su estado tanto en Android como en web mediante las propiedades de accesibilidad correspondientes. La tipografía de los componentes compartidos del alumno declara la fuente de sistema en web para evitar una sustitución serif.

## Consulta resumida

Nuevo `GET /api/v1/expedientes/{practicaId}/resumen`, solo ALUMNO y con acceso limitado a la práctica propia. Devuelve datos básicos, criterios, evaluación, requisitos y cierre; omite las listas de horas, tareas y metas, las selecciones completas de requisitos y la revisión usada para autorizar el cierre.

En prácticas abiertas, calcula las horas validadas con un agregado SQL y consulta únicamente las tareas y metas exigidas para el checklist. No carga objetos individuales del historial de horas ni descripciones de tareas o entregas. En prácticas cerradas proyecta la copia ya conservada. El circuito completo de evaluación, configuración, cierre y PDF mantiene su consulta y sus permisos anteriores.

No hay migraciones, cambios de esquema, semilla ni escrituras académicas en Supabase. La app sigue accediendo mediante FastAPI. No se publica este incremento sobre la presentación.

## Verificación

TypeScript y cuatro pruebas nuevas del resumen con SQLite correctas. También pasan las ocho pruebas existentes del circuito de expediente afectado: coincidencia de requisitos, agregados, ausencia de historial, acceso propio, copia cerrada y reglas de cierre. Las escrituras de estas pruebas ocurren solo en SQLite en memoria.

`npm run test:practica` pasó cinco comprobaciones: consulta real local de centro, metas, expediente y PDF; retorno y detalles desplegados; expediente sin desbordamiento a 360/390/430 px; filtros y avance superior al objetivo; vacíos, error/reintento, permisos, identidad ajena y cierre con respuestas aisladas; y consulta real del expediente completo docente. No hubo errores de navegador, conexiones a otra API ni escrituras académicas reales. Las evidencias se guardan en `.expo/dev/practica25-*`, fuera de Git. La exportación web de 139 rutas y el bundle Android de 3,4 MB terminaron correctamente; no sustituyen la prueba física ni generan un APK nuevo. Los servidores propios de verificación quedaron cerrados.

## Revisión manual siguiente

Con API de desarrollo en `ssp_test` y Expo Go, recorrer Más → Centro y supervisor → Atrás; Más → Metas → filtros/detalle → Expediente; Más → Expediente → requisitos → metas → Atrás. Comprobar textos ampliados, desplazamiento, botón Atrás del teléfono y formularios con teclado. Estos cambios aún no forman parte del APK de presentación ya entregado.
