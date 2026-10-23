# PrácticasCC · Brief para explorar el diseño en Replit

Documento para adjuntar al proyecto de prototipo. Las propuestas requieren revisión del usuario antes de incorporarse a la app existente. La identidad está definida en `docs/diseno.md`; la composición, jerarquía y navegación se pueden replantear.

## Objetivo y alcance

Diseñar un prototipo móvil navegable de PrácticasCC, aplicación de seguimiento de prácticas preprofesionales de Ciencias de la Comunicación de la UNSA, Perú. Prioridad Android, con una estructura adaptable a iOS y pantallas de diferentes tamaños.

La app existente usa Expo, React Native, TypeScript y Expo Router. Para esta exploración crear un proyecto móvil separado con esos mismos fundamentos y datos ficticios locales. Usar componentes compatibles con Expo Go para poder revisar la interfaz en el teléfono. El backend existente y sus permisos se conservan para la integración posterior.

Trabajar únicamente en presentación, navegación y estados simulados. No configurar autenticación real, Google OAuth, Supabase, bases de datos, servicios de correo ni despliegues. No necesita credenciales ni una copia de `.env`. El acceso de muestra y cualquier selector de rol deben identificarse como herramientas del prototipo; en la app real el servidor determina el rol.

## Identidad y dirección visual

- Nombre: PrácticasCC. Institución: Universidad Nacional de San Agustín de Arequipa. Escuela: Ciencias de la Comunicación.
- Granate institucional obligatorio: `#5E151D`. Azul institucional disponible como secundario: `#141E42`. Fondos claros y neutros cálidos; estados con colores semánticos y texto.
- Mantener identidad universitaria con una interfaz contemporánea: jerarquía tipográfica clara, encabezados compactos, buen espaciado, iconos consistentes y acciones fáciles de encontrar. Usar fotografía solo si cumple una función concreta.
- Explorar tipografía sans serif legible para la interfaz. La marca puede conservar un acento serif. Evitar texto pequeño para acomodar más controles.
- Usar el escudo solo si se proporciona un archivo oficial; no inventarlo. El granate no requiere llenar toda la pantalla con bloques de color.
- Proponer una composición propia. La referencia actual sirve para entender la app, no obliga a mantener sus tarjetas, tamaños o distribución.

## Información y navegación

El inicio del alumno debe permitir entender su avance y decidir su siguiente acción: horas validadas, pendientes de revisión, próxima entrega y acceso a registrar actividad. Dar prioridad a esa información y agrupar los módulos secundarios.

Propuesta inicial de cinco destinos para el alumno: **Inicio, Bitácora, Aulas, Avisos y Más**. "Registrar actividad" es una acción dentro del contexto, no una pestaña. Documentos y comunidad pertenecen al aula correspondiente. Más agrupa mi práctica (centro/supervisor, metas y expediente), mensajes, borradores, guía y cuenta. Consultar el [mapa de navegación por roles y trabajo en Figma](MAPA-NAVEGACION.md) para el detalle más reciente. Se puede proponer otra organización si se conservan accesos y permisos.

Las pantallas de detalle deben conservar el contexto al volver, con títulos claros y comportamiento coherente del botón Atrás de Android. Los otros roles necesitan destinos propios según sus tareas.

Decisión posterior del usuario: priorizar al alumno y después al docente. En esta primera etapa el alumno recibe listas ordenadas y filtros de estado, sin buscadores de texto. El docente sí necesita búsqueda de alumnos y entregas dentro de sus aulas. Preparar carga por bloques y conservación de contexto; la paginación de red se integra después con los servicios reales. Ver las reglas actualizadas en el mapa de navegación.

| Rol | Trabajo principal que debe poder representarse |
| --- | --- |
| Alumno | Consultar aulas, tareas, notas y avisos; registrar/corregir actividades; ver revisión de horas; entregar texto/archivo y consultar versiones; centro y supervisor; metas, expediente, mensajes, comunidad, documentos y borradores. |
| Docente | Aulas, publicar/editar tareas y ampliar plazos, revisar/calificar entregas, asistencia académica, seguimiento de alumnos, metas, comunidad, mensajes y revisión/cierre de expedientes. |
| Supervisor de empresa | Consultar sus practicantes vinculados, revisar/validar/rechazar horas con motivo y completar la evaluación del expediente. El cierre corresponde al docente o administración. |
| Administración | Usuarios y roles, aulas y matrículas, asignar prácticas y vincular supervisores, reportes, auditoría y operaciones académicas autorizadas. |

## Construcción por etapas

1. Presentar el mapa de navegación y dos alternativas de composición para **Inicio**. Mantener el mismo contenido en ambas para que la comparación sea visual y de jerarquía. Explicar brevemente diferencias de densidad y accesos.
2. Con la dirección elegida, construir **Ingreso, Inicio y Bitácora** navegables. Evaluar estas tres antes de extender el estilo.
3. Completar el recorrido del alumno: nueva actividad y su revisión previa, detalle/historial de horas, aula, tarea y entrega, avisos, centro, documentos, borradores y expediente. Incluir los estados relevantes.
4. Representar las pantallas de asistencia de la demo como una propuesta separada, claramente marcada. La asistencia académica docente es un flujo distinto.
5. Aplicar el sistema visual a los otros roles. Incluir al menos una revisión de horas del supervisor, una revisión de entrega del docente y una asignación administrativa, con sus confirmaciones.

## Reglas del producto que el diseño debe respetar

- Las horas registradas y las validadas son cantidades distintas. Ejemplo coherente: 148 h registradas = 100 h validadas + 48 h pendientes. El progreso hacia la meta utiliza las validadas. La meta de horas depende de cada práctica; no inventar una regla institucional.
- Los estados deben tener nombres comprensibles: pendiente, validado, rechazado, borrador y pendiente de envío. Un borrador guardado en el dispositivo no equivale a un envío recibido por el servidor.
- Las correcciones y rechazos requieren contexto, motivo e historial. Las acciones de envío, validación, calificación, reasignación y cierre necesitan revisión/confirmación proporcional a su efecto.
- Una entrega puede reemplazarse antes del plazo y mientras no tenga calificación; conserva versiones. Los adjuntos actuales son PDF/DOCX/ZIP de hasta 10 MB. Representar selección, validación, carga, éxito y error.
- Un expediente cerrado conserva su copia y bloquea cambios académicos relacionados. No ofrecer un botón de reapertura como si ya existiera.
- Borradores disponibles en el dispositivo y envío explícito de pendientes confirmados al recuperar conexión. No prometer sincronización automática ni acceso offline a todas las aulas.
- Avisos consultables no equivalen a notificaciones push. GPS y validación de ubicación siguen pendientes. Un reloj o una marca de entrada de la demo no demuestran control de jornada real.
- El diseño de ingreso contempla Google institucional `@unsa.edu.pe`, cuenta SSP, recuperación y demo. En este prototipo se simulan; no solicitar contraseñas reales. Conservar el diseño oficial del botón de Google.
- La mensajería privada existente corresponde a alumno/docente por vínculo de aula. No extenderla automáticamente a todos los roles.
- Usar ejemplos de comunicación: cobertura de eventos, producción de notas, edición de audio, contenidos institucionales e informes de prácticas. Fechas coherentes y hora de Lima.

## Requisitos de uso móvil

- Trabajar con dimensiones adaptables. Revisar anchos de 360, 390 y 430 unidades lógicas; el tamaño físico depende de la densidad del teléfono. Sin desplazamiento horizontal en los flujos principales.
- Respetar las áreas seguras, recorte de cámara, barra de estado y navegación por gestos o botones. El contenido puede extender su fondo hasta los bordes, pero los controles deben permanecer accesibles.
- Controles con área táctil mínima de 48 × 48 dp; botones principales de aproximadamente 52–56 dp. Dar espacio entre acciones cercanas.
- Texto de lectura aproximadamente 16 sp y soporte al tamaño de fuente del sistema. Contraste de al menos 4.5:1 para texto habitual y 3:1 para texto grande. No comunicar estados solo por color.
- Iconos con etiquetas o nombres accesibles. Revisar lectura con TalkBack, orden de foco y estados de controles. Mantener una familia de iconos coherente.
- Formularios con etiquetas permanentes, teclado adecuado y errores junto al campo. El teclado no debe ocultar el campo activo ni impedir alcanzar el botón de confirmación. Conservar datos al volver; advertir antes de descartar cambios sin guardar.
- Probar descripciones largas, apellidos extensos, aulas con nombres largos, listas vacías, archivos con nombres largos y usuarios sin práctica asignada.
- Incluir carga, vacío, error con reintento, envío en curso, éxito, sesión vencida y desconexión. Evitar que un doble toque genere dos operaciones.
- Utilizar listas, secciones y detalles para distribuir la información. Mantener una acción principal clara por contexto y movimientos breves que respeten la preferencia de reducir animaciones.

## Qué revisar antes de elegir

En el teléfono, comprobar que se entiende el avance sin abrir varios menús, se encuentra registrar actividad fácilmente y queda claro si algo está guardado, enviado o validado. Revisar escritura con el teclado abierto, botón Atrás, texto ampliado y contraste. Recorrer el flujo completo con un usuario sin práctica y con una actividad rechazada.

Al extender el diseño, revisar un flujo de cada rol. La apariencia debe ser consistente y las acciones diferentes según responsabilidad.

## Entrega que se necesita de Replit

- Prototipo navegable y capturas de las pantallas elegidas, incluyendo formularios con teclado y estados de error/vacío.
- Código fuente exportable, recursos utilizados y sus licencias.
- Archivo con colores, tipografía, espaciado, radios, tamaños y estados de componentes; preferir constantes reutilizables.
- Mapa de navegación por rol e inventario de componentes: encabezado, navegación, listas, tarjetas, etiquetas de estado, campos, acciones y confirmaciones.
- Lista de decisiones visuales y de comportamientos simulados. Estos archivos servirán para adaptar el diseño al proyecto actual conservando servicios, permisos y datos.

## Referencias consultadas

- [Replit: crear y previsualizar una app móvil](https://docs.replit.com/features/artifact-types/building-mobile-apps).
- [Android: accesibilidad, contraste y áreas táctiles](https://developer.android.com/guide/topics/ui/accessibility/apps).
- [Android: bordes y áreas ocupadas por el sistema](https://developer.android.com/develop/ui/views/layout/edge-to-edge).
- Identidad existente: `docs/diseno.md`, con fuente en el Manual de Marca UNSA. Referencias visuales originales: `imagenesReferencias/imagen1.png` e `imagen2.png`.
