# Ro como referencia para PrácticasCC

Revisión del 22 de octubre de 2026. Dirección propuesta, pendiente de revisión visual del usuario. No modifica todavía las pantallas Expo ni sus servicios.

## Qué se investigó

La referencia corresponde a **Ro: Online Healthcare**, de Roman Health Medical LLC, vinculada a ro.co. Se inspeccionaron visualmente las ocho imágenes promocionales públicas de su ficha de Apple y se contrastaron con las páginas oficiales de producto y ayuda. La consulta pública de Apple devolvió la versión 4.9.0; las imágenes promocionales pueden representar momentos diferentes del producto y no prueban su comportamiento actual completo.

La [galería de Mobbin compartida por el usuario](https://mobbin.com/apps/ro-ios-ba654651-4a36-4b50-93ba-70bbf2a42430/100bfcd9-dc08-5c72-b64e-0309228bfceb/screens) no expuso sus 154 pantallas a la herramienta. No se revisaron esos 154 estados, ni se accedió a una cuenta, al código interno o a flujos privados. El estudio compara estructura, jerarquía y lenguaje visibles; las consecuencias de uso son hipótesis que debemos validar.

Fuentes consultadas:

- [Ficha oficial de Ro en App Store](https://apps.apple.com/us/app/ro-online-healthcare/id1585858911), con sus ocho imágenes promocionales.
- [Consulta pública de Apple para esa app](https://itunes.apple.com/lookup?id=1585858911&country=us), identificación y URLs de las imágenes.
- [Ro Patient App](https://ro.co/os/patient/), organización alrededor de objetivos, próximos pasos y acompañamiento.
- [Configuración inicial de la app](https://care.getroman.com/hc/en-us/articles/8156106479245-How-to-set-up-the-Ro-mobile-app), acceso por correo, retorno a la app y opciones iniciales.
- [Funciones disponibles](https://care.getroman.com/hc/en-us/articles/8158097525133-Available-features-on-the-Ro-app), límites entre web y móvil. Algunos detalles de ayuda no coinciden con lo mostrado en las imágenes; no se asume equivalencia entre versiones.

## Lectura de las ocho imágenes

El número corresponde al orden devuelto por Apple. Son composiciones promocionales con teléfonos parcialmente recortados, no capturas completas de una sesión.

| Imagen | Observación visual | Adaptación propuesta para PrácticasCC |
| --- | --- | --- |
| 1. Presentación | Un mensaje dominante, pocas opciones y una acción visible. | Explicar el beneficio del ingreso institucional con brevedad; mantener SSP y Google según las capacidades reales. |
| 2. Exploración | Una opción principal y alternativas subordinadas, con accesos inferiores reconocibles. | Destacar el siguiente paso sin convertir Inicio en una lista de todos los módulos. |
| 3. Detalle | Contexto arriba, acciones relacionadas y lista de información debajo. | En un aula, mostrar su identidad y después tareas, materiales y comunidad; en una tarea, instrucciones, entrega y estado. |
| 4. Inicio | Saludo discreto, situación expresada en lenguaje cotidiano, pocos asuntos y espacio libre. | Encabezado que explique si hay entrega o corrección; evitar un saludo enorme que desplace lo útil. |
| 5. Seguimiento | Resultado claro, actualización, filas con estados y secuencia de eventos. | Diferenciar recibido, en revisión, validado y por corregir; conservar fechas y observaciones en el detalle. |
| 6. Mensajes | Autor y contexto legibles, bloques tranquilos y respuesta cerca de la conversación. | Mantener aula y docente identificables. Respetar la mensajería alumno/docente existente. |
| 7. Progreso | Una cifra central, periodo y evolución; el detalle aparece al consultarlo. | Priorizar horas validadas respecto de la meta configurada; separar pendientes. Añadir gráficos solo si responden una pregunta útil. |
| 8. Gestión | Resumen breve, una acción dominante y filas separadas con opciones secundarias. | Agrupar centro, supervisor y expediente en Mi práctica. Mostrar edición solo cuando el rol y el estado la permitan. |

## Qué produce esa sensación de orden

Mi lectura es que Ro reduce decisiones simultáneas. La navegación responde a áreas reconocibles, mientras cada pantalla revela solo el detalle necesario para actuar. Las capturas no demuestran por sí solas que un flujo tenga menos errores o sea más rápido; eso exige probar tareas con personas.

Para PrácticasCC proponemos seis reglas:

1. **Situación antes que catálogo.** Inicio responde qué necesita atención y cómo va la práctica. Una corrección pendiente tiene más urgencia que horas recibidas que solo esperan validación. La posición de los bloques permanece estable.
2. **Cinco destinos persistentes.** Inicio, Bitácora, Aulas, Avisos y Más. Cambiar de pestaña conserva el detalle y los filtros; los enlaces explícitos a una lista abren esa lista. Volver desde un aviso recupera el contexto del aviso.
3. **Una acción dominante por contexto.** Registrar actividad en Inicio; revisar y enviar dentro del formulario; revisar entrega dentro de la tarea. Las alternativas usan menor peso visual. La tarea del inicio tiene un enlace, sin competir con otro botón lleno.
4. **El estado debe orientar.** Un borrador aún no fue enviado; recibido no significa validado; una observación requiere una corrección concreta. Un error de consulta nunca se representa como ausencia de pendientes.
5. **Filas para contenido repetido.** Reservar tarjetas para la próxima acción o un resumen relevante; usar listas con separadores para actividades, opciones y atributos. El espacio libre ordena grupos y no sustituye información necesaria.
6. **Texto cercano y preciso.** Explicar el resultado y el siguiente paso. No prometer revisión inmediata, sincronización automática, ubicación verificada o notificaciones que el sistema no ofrece.

## Cómo queda el Inicio propuesto

Marca y perfil compactos → saludo breve y situación actual → próxima entrega o corrección → registrar actividad → avance compacto → borradores y última actividad.

La información de avance conserva las distinciones del sistema: 100 h validadas + 48 h pendientes = 148 h registradas. La barra de una meta usa únicamente las validadas. **200 h es un dato ficticio del prototipo**, no una norma UNSA; en el producto se toma la meta configurada para esa práctica.

Conservar el granate institucional **#5E151D**, neutros cálidos y estados acompañados por texto. Esta exploración usa tipografía de sistema sin serif para títulos y cifras; propone una alternativa a la dirección anterior, no una nueva tipografía institucional. La selección final sigue pendiente.

En Android se deben verificar áreas seguras, teclado, botón Atrás, tamaño de texto, controles de al menos 48 dp y respuesta al gesto de volver. La apariencia iOS de Ro no determina esos comportamientos. Las animaciones se decidirán al integrar el recorrido; las imágenes estáticas no permiten reconstruir las de Ro.

## Material preparado para revisar

- [FigJam compartido: análisis y navegación](https://www.figma.com/board/jGonBSevkECNERwniK406k/Untitled?node-id=4-2): seis patrones, sus adaptaciones y mapa editable del alumno.
- [Seis vistas en el mismo FigJam](https://www.figma.com/board/jGonBSevkECNERwniK406k/Untitled?node-id=7-94): Inicio, Bitácora, Registrar actividad, Tarea y entrega, Avisos y Más. Son capturas para comparar la propuesta, no capas de interfaz editables.
- [Prototipo navegable del alumno](../design/prototipo-alumno.html): HTML autónomo con datos ficticios, sin dependencias externas. Abrir `C:\proyectos\appSSP\design\prototipo-alumno.html` con el navegador de la PC; no requiere iniciar servidores.
- [Mapa por roles y reglas de navegación](MAPA-NAVEGACION.md): alcance completo propuesto. El prototipo visual actual se concentra en el alumno.

Recorrido recomendado:

1. Desde Inicio, abrir la tarea y volver; registrar una actividad, revisar el resumen y confirmar el envío de muestra.
2. En Bitácora, filtrar, abrir un registro, cambiar de pestaña y regresar. Comprobar que conserva el filtro al volver a la lista.
3. Abrir Aulas → aula → tarea y revisar la entrega. Desde Avisos, abrir la misma tarea y volver al aviso de origen.
4. En Más, encontrar centro/supervisor, metas, expediente, mensajes, borradores y guía sin recorrer un panel enorme.
5. Cambiar el selector de escenarios. Revisar corrección, práctica por asignar, envío bloqueado sin conexión y error con reintento. Escribir en un formulario y salir: permite guardar o seguir editando.

El prototipo conserva cambios solo en memoria hasta recargar. En el escenario sin conexión simula el bloqueo de envío; no prueba almacenamiento, servidor ni acceso offline reales. Adjuntar archivo solo representa nombre, extensión y tamaño; no sube su contenido. Los mensajes, expediente y materiales son vistas de muestra. El retorno se prueba con el control de la interfaz; el botón Atrás de Android y el historial del navegador requieren la integración Expo posterior.

## Verificación y paso siguiente

Revisión focal con Node y Chromium de Windows: Inicio a 360, 390 y 430 px, y recorrido a 390 px. Se comprobaron las cinco pestañas visibles, ausencia de desbordamiento horizontal en las vistas inspeccionadas, conservación de filtros/contexto, borradores independientes, revisión antes del envío, retorno desde avisos y estados alternativos. Cero errores de página y peticiones externas. Las evidencias locales quedan fuera de Git en `.expo/dev/prototipo-*`; no constituyen una prueba de APK.

Primero revisar jerarquía, claridad y navegación con este material. Después trasladar el recorrido elegido a Expo, extendiendo la navegación persistente a las cuentas autenticadas. Probar entonces Android físico y el primer APK con Google nativo; completar luego las vistas de docente, supervisor y administración sobre las mismas reglas.
