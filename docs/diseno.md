# Revisión de las seis pantallas

Fuentes: `imagenesReferencias/imagen1.png`, `imagenesReferencias/imagen2.png` y [Manual de Marca UNSA](https://www.unsa.edu.pe/wp-content/uploads/2018/10/MANUAL-MARCA-UNSA.pdf), páginas 11–12.

## Paleta y lenguaje visual

| Uso | Color | Criterio |
| --- | --- | --- |
| Encabezados, botones, selección | `#5E151D` | Granate oficial UNSA, RGB 94/21/29, Pantone 7421 C |
| Color institucional secundario disponible | `#141E42` | Azul oficial UNSA, RGB 20/30/66; reservado para futuras extensiones |
| Fondo | `#FFFFFF` | Referencias |
| Tarjetas y campos | `#F7F4F3` | Neutro cálido inspirado en referencias |
| Bordes y separadores | `#E7DFDC` | Neutro cálido |
| Texto principal | `#252124` | Legibilidad sobre blanco |
| Texto secundario | `#746D6A` | Más oscuro que el plomo institucional para facilitar la lectura de texto pequeño |
| Validado | `#356520` / `#EAF3E1` | Estado semántico con texto explícito |
| Pendiente | `#89550D` / `#FAEFD9` | Estado semántico con texto explícito |

El granate de las imágenes es más claro que el valor oficial. Se conserva la composición y se aplica el color oficial. Los colores de estado son auxiliares de interfaz, no colores de marca UNSA. No se agrega dorado como supuesto color institucional. La mención UNSA es texto; no se ha inventado ni recreado el escudo.

La primera versión utiliza encabezados sólidos, tarjetas de 17 px de radio, botones de al menos 52 px, espacio entre bloques de 20 px y contenido de hasta 560 px. Usa tipografía de sistema en controles y Georgia/serif en marca, horas y fechas. El rediseño del alumno descrito al final sustituye esa composición por cabeceras claras, tipografía de sistema y listas, conservando el granate. La tipografía del isotipo oficial no se extrapola a los controles.

## Pantallas y comportamiento

1. **Ingreso:** marca PrácticasCC, correo institucional, contraseña, recuperación y acceso explícito a demo. Validación de formato; integración institucional pendiente.
2. **Inicio:** saludo, acumulación de horas, centro de prácticas, supervisora y siguiente entrega. Acceso a asistencia y nueva actividad.
3. **Asistencia:** indicador circular, tiempo transcurrido, entrada, salida y acceso al registro de actividad. La ubicación permanece sin verificar; no se simula una validación GPS exitosa.
4. **Nueva actividad:** fecha, horas y descripción, validación de entradas y guardado en estado de demo. El registro nace pendiente de revisión.
5. **Bitácora:** agrupación por mes, fecha, descripción, horas y estado. Total sincronizado con inicio y nuevas actividades.
6. **Avisos:** listas separadas, indicadores de lectura y contador en navegación. Tocar marca como leído durante la sesión.

## Ajustes a los datos de referencia

La referencia suma 148 horas: 48 pendientes, 60 validadas y 40 validadas. La implementación distingue 148 registradas de 100 validadas; agregar registros no incrementa las horas validadas. El subtítulo de bitácora muestra el número real de registros, en lugar de anunciar siete y mostrar tres. Los vencimientos de junio no se presentan como plazos vigentes respecto de la fecha actual.

## Validación en Windows

Después de migrar a Windows se ejecutaron npm ci, typecheck y export:web correctamente con Node/npm de Windows. Se corrigió el tipo de color de los iconos de navegación. Para el incremento 1 también se comprobó la navegación web automatizada; ver [INCREMENTO-01.md](INCREMENTO-01.md). Queda pendiente comprobar representación visual, teclado y áreas seguras en dispositivos con Expo Go.

## Exploración del rediseño móvil

El usuario ya revisó la app con Expo Go y quiere explorar una propuesta visual en Replit antes de incorporarla al proyecto. El [brief para Replit](BRIEF-DISENO-REPLIT.md) reúne identidad, navegación propuesta, cuatro roles, reglas funcionales y requisitos de Android. Se empieza por ingreso, inicio y bitácora con datos ficticios. La composición y tipografía nuevas se decidirán tras esa revisión; el granate institucional se conserva.

Tras revisar las dos propuestas nuevas de Inicio, el trabajo compartido usa FigJam/Figma y referencias de Mobbin. El [mapa de navegación](MAPA-NAVEGACION.md) concreta el recorrido del alumno y el esqueleto de los otros roles. La integración combina la jerarquía de próxima tarea con el resumen compacto de horas.

La comprobación del APK y Google nativo sigue pendiente. Conviene hacer una primera prueba cuando se integre el recorrido principal elegido y repetir la revisión del APK candidato antes del piloto; no asumir que la representación en Expo Go verifica el acceso nativo.

La [investigación de Ro y su adaptación](ANALISIS-RO.md) desarrolla la referencia elegida por el usuario: ocho imágenes públicas, principios de jerarquía y navegación, límites de la evidencia y reglas para PrácticasCC. El [FigJam compartido](https://www.figma.com/board/jGonBSevkECNERwniK406k/Untitled?node-id=4-2) contiene el análisis y el mapa del alumno. El [prototipo navegable](../design/prototipo-alumno.html) conserva datos ficticios y escenarios alternativos como referencia. El usuario acepta la dirección de menos tarjetas y tipografía sin serif, conservando el granate institucional.

El [incremento 21](INCREMENTO-21.md) integra esa dirección en la sesión real del alumno: Inicio, Bitácora, Aulas, Avisos y Más con pilas de detalles independientes. Inicio usa datos reales y la meta asignada; Bitácora consulta páginas de 20 actividades con filtros en servidor y totales globales. Los módulos compartidos adoptan cabeceras, campos y superficies del alumno, conservando los flujos existentes.

El [incremento 22](INCREMENTO-22.md) renueva Avisos con filas, detalle y destino de tarea o actividad. Los avisos nuevos se generan al publicar/editar tareas y revisar horas; los antiguos siguen siendo informativos. La bandeja también consulta páginas de 20 con filtros en servidor y conserva su contexto al regresar del recurso. Prioridad siguiente: revisión en Android, pantallas interiores y adaptación docente. La revisión física, el APK/Google nativo y la paginación de otros módulos siguen pendientes.

El [incremento 23](INCREMENTO-23.md) adapta Aula, Detalle de tarea y Preparar entrega. Aula separa Tareas, Notas y Recursos; muestra filas y páginas de 20, filtros sin búsqueda, promedio y contadores globales. La tarea se consulta individualmente y deja visibles el plazo, las instrucciones, la entrega y la revisión. El formulario conserva borrador y confirmación; adjuntos e historial se consultan al abrirlos. Continúa pendiente comprobar teclado y representación física en Android, completar las otras pantallas interiores y adaptar el docente.

El [incremento 25](INCREMENTO-25.md) extiende el diseño a Centro y supervisor, Metas y Expediente del alumno. Las metas usan filas con progreso y detalle desplegable; el expediente muestra requisitos y acciones antes de los datos secundarios. Se separa cumplimiento de requisitos de autorización de cierre. La consulta resumida evita transferir el historial completo de horas y tareas al abrir el expediente; el PDF requiere una acción explícita. Las listas de metas y prácticas conservan sus API completas actuales. La revisión física del teclado y la adaptación de otros módulos y roles continúan pendientes.

El [incremento 26](INCREMENTO-26.md) adapta Mensajes, Comunidad, Documento, Borradores y Guía. Las conversaciones cargan mensajes recientes y permiten consultar los anteriores; los anuncios usan resumen y detalle individual. Documentos separa materiales de cargas propias. Los borradores conservan también mensajes y respuestas con confirmación. Se mantiene la consulta manual de novedades: esta interfaz no implica push ni tiempo real. La adaptación de docente, supervisor y administración y la revisión física del recorrido completo siguen pendientes.
