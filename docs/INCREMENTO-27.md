# Incremento 27 · Navegación del personal por rol

Docente, supervisor y administración disponen de cinco pestañas con pilas independientes. Las pantallas existentes se abren dentro de la pestaña de origen y los enlaces anteriores se redirigen conservando aula, alumno, práctica o entrega.

| Rol | Pestañas |
| --- | --- |
| Docente | Inicio · Aulas · Seguimiento · Avisos · Más |
| Supervisor | Inicio · Practicantes · Horas · Avisos · Más |
| Administración | Inicio · Gestión · Reportes · Avisos · Más |

Inicio presenta el resumen real de la cuenta y sus acciones principales. Gestión agrupa usuarios/aulas, prácticas/supervisores, operación docente, expedientes y auditoría. Más reúne cuenta, metas, expedientes, guía y mensajería cuando corresponde al docente. El supervisor no recibe mensajería privada y administración no obtiene acceso a las conversaciones alumno/docente.

Seguimiento docente muestra prácticas asignadas y permite buscar nombre, aula o periodo; abre la ficha con su aula y alumno exactos. Los alumnos sin práctica siguen disponibles desde Aulas. Practicantes del supervisor abre el expediente de la práctica propia. Horas conserva los controles anteriores y deja de sustituir una práctica solicitada no disponible por la primera de la lista: muestra el estado y permite seleccionar una válida.

Los detalles comprueban el rol antes de montar un módulo. Los permisos del servidor siguen siendo la autoridad en cada consulta y escritura. Cambiar la navegación no concede atribuciones ni modifica evaluación, calificación, asistencia, vínculos o cierre. No se agregan endpoints, tablas, migraciones ni datos de prueba.

El código conserva el nombre `StudentLegacyRoute` por compatibilidad, pero el mapa común también resuelve los enlaces del personal. Los módulos docentes y administrativos utilizan el mismo router de la app para conservar el contexto. Los colores, cabeceras, campos y superficies reutilizan la dirección visual del alumno; sus funciones y formularios existentes permanecen disponibles.

Las pestañas cargan sus módulos al abrirlos. Las listas de prácticas, matrículas, entregas y otras vistas del personal conservan sus API completas actuales; este incremento no añade paginación de red a esas listas ni declara completada su adaptación interior. El alumno mantiene su navegación propia.

## Verificación

TypeScript y seis pruebas unitarias del mapa de rutas correctas: destinos por rol, pila de origen, parámetros/URL, práctica específica, permisos y compatibilidad del alumno. `npm run test:roles` pasó los recorridos de los cuatro perfiles con respuestas reales del API local: detalles, búsqueda conservada, expedientes/horas, asignaciones/reportes, enlaces anteriores y secciones denegadas sin consultar endpoints ajenos. No hubo errores de consola/página, otra API ni escrituras académicas. Los inicios se revisaron a 360/390/430 px y sus capturas se inspeccionaron. Evidencias en `.expo/dev/roles27-*`, fuera de Git. Exportación web de 270 rutas y bundle Android de 3,5 MB correctos; son variantes de navegación, no 270 funcionalidades diferentes. Los servidores propios de comprobación quedaron cerrados.

La entrega para el líder permanece fijada. La comprobación física de teclado, Atrás y áreas seguras y un APK candidato con los cambios posteriores continúan pendientes.
