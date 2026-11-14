# DESIGN.md · PrácticasCC

Documento de sistema de diseño para agentes y personas. Describe **el sistema implementado** en Expo/React Native: los valores aquí listados existen en el código y son la referencia para cualquier pantalla o componente nuevo. Si este documento y el código difieren, manda el código y se corrige el documento en el mismo cambio.

Fuentes de verdad de tokens y componentes:

| Fuente | Contiene |
| --- | --- |
| `src/theme/student.tsx` | Tokens vigentes del sistema estudiante (aplicado a todos los roles desde el incremento 27) |
| `src/theme/index.ts` | Tokens del sistema clásico (pantallas aún no migradas) |
| `src/components/ui.tsx` | Botón, campo, tarjeta, badge, cabecera, iconos de pestaña, tipografía compartida |
| `src/features/alumno/components.tsx` | Filas, grupos, métricas, páginas y estilos del sistema estudiante |
| `src/features/alumno/paged-components.tsx` | Listas paginadas (PagedList, PageFooter, FilterChip) |
| `docs/diseno.md` | Decisiones históricas y justificación frente a las referencias y el Manual de Marca UNSA |

## 1. Tema visual y atmósfera

Móvil primero, institucional UNSA, sobrio y denso en información. Superficies cálidas (fondo crema, papel casi blanco), un solo acento (granate institucional) usado con moderación: acciones primarias, chevrons, chips seleccionados y enlaces. Sin sombras ni gradientes: la jerarquía se construye con bordes de 1 px y contraste entre fondo y papel. Tipografía de sistema en todos los controles; la serif queda reservada a la marca y a las horas del sistema clásico. Filas sobre tarjetas: los listados son grupos de filas toables, no bloques decorativos. Estados con texto explícito siempre acompañando al color.

## 2. Paleta de color y roles

Sistema vigente (student). El clásico se mantiene en pantallas no migradas; **no mezclar ambos sistemas en una misma pantalla nueva**.

| Token | Hex | Rol |
| --- | --- | --- |
| `primary` | `#5E151D` | Acciones primarias, chevrons, chips seleccionados, enlaces, pestaña activa. Granate oficial UNSA (Pantone 7421 C, RGB 94/21/29) |
| `soft` | `#F3E6E7` | Superficie granate suave (destacados discretos) |
| `background` | `#F7F4EF` | Fondo de pantalla (crema cálido) |
| `paper` | `#FFFDFA` | Grupos, filas, tarjetas y campos |
| `text` | `#292523` | Texto principal |
| `muted` | `#716861` | Texto secundario, subtítulos, metadatos |
| `border` | `#E7DFD7` | Bordes y separadores de 1 px |
| `green` / `greenSoft` | `#316E58` / `#EAF2ED` | Validado, éxito, horas validadas |
| `amber` / `amberSoft` | `#855817` / `#FAF0DF` | Pendiente, advertencia, horas por validar |
| `navy` | `#141E42` | Azul oficial UNSA, **reservado**: no usar sin decisión explícita |

Sistema clásico (legado): `background #FFFFFF`, `surface #F7F4F3`, `border #E7DFDC`, `text #252124`, `muted #746D6A`, `primarySoft #F4E9EB`, `success #356520/#EAF3E1`, `warning #89550D/#FAEFD9`.

Reglas de color: los verdes y ámbar son **auxiliares de estado**, no colores de marca. No agregar dorado ni otros colores institucionales supuestos. Los estados nunca se comunican solo con color (ver §7).

## 3. Tipografía

Familia: tipografía de sistema. En web `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; en nativo, la fuente por defecto de la plataforma. Sin serif en controles; `Georgia`/`serif` solo en marca y números de horas del sistema clásico.

Escala vigente (student):

| Uso | Estilo |
| --- | --- |
| Título de página | 23/30, weight 700, `text` |
| Título destacado (hero) | 28/34, weight 700, letter-spacing −0.5 |
| Título de sección | 16, weight 700 |
| Título de fila | 15/22, weight 600 |
| Texto secundario (muted) | 13/21, `muted` |
| Dato mini | 12/18 |
| Eyebrow (encabezado pequeño) | 11/17, letter-spacing 1.1, uppercase, weight 700, `muted` |
| Enlace/acción de texto | 13, weight 600, `primary` |
| Número de métrica | 28/34, weight 700, `tabular-nums`, con unidad a 15/500 |

Legado clásico: título de cabecera 21/700 blanco, subtítulo 13 `#E7CED1`, número serif 34 (Georgia), `typography.title` 17/24 600, `typography.body` 14/23 `muted`, error 13/20 `primary`.

## 4. Componentes y estados

- **Botón primario:** fondo `primary`, texto blanco 15/700, alto mínimo 54, radio 15, opacidad 0.5 deshabilitado y 0.8 presionado. El clásico usa alto 52 y radio 13.
- **Botón secundario:** fondo `paper`, borde 1 px `border`, texto `primary`. Es la opción por defecto para cancelar, actualizar y acciones reversibles.
- **Botón de texto:** alto mínimo 48, etiqueta 13/600 `primary`.
- **Campo de texto:** etiqueta 12/600 `muted` encima; entrada con fondo `paper`, borde `border`, radio 12, alto mínimo 50, texto 15–16 `text`; multilinea alto mínimo 110. La etiqueta es el `accessibilityLabel`.
- **Grupo de filas (`StudentGroup`):** contenedor `paper`, radio 20, borde 1 px, esquinas recortadas (`overflow: hidden`).
- **Fila (`StudentRow`):**padding 17, alto mínimo 76, separador inferior 1 px; título 15/600 + subtítulo 13 `muted`; chevron `›` en `primary` (25 px) cuando es toable; toda la fila es el objetivo táctil, no solo el texto.
- **Tarjeta:** radio 20 con borde 1 px (student) o radio 17 fondo `surface` (clásico), padding 20, gap 9–14.
- **Chip de filtro:** alto mínimo 48, radio 12, borde 1 px, fondo `paper`; seleccionado: fondo `primary`, texto blanco.
- **Badge de estado:** píldora radio 20, texto 11/600 sobre superficie suave; éxito/advertencia/neutro **con texto explícito** («Meta completada», «En progreso», «Pendiente de revisión»).
- **Métrica:** bloque radio 15, padding 15, número tabular 28 + unidad; el soft del color como fondo (`greenSoft` validado, `amberSoft` pendiente).
- **Barra de progreso:** pista de 6 px radio completo `border`, relleno `green` u `primary`; siempre con `accessibilityRole="progressbar"` y `accessibilityValue` (min/max/now).
- **Bloque prioritario:** tarjeta con borde 1 px y borde izquierdo de 4 px en `primary`; avisos con fondo `amberSoft`.
- **Cabecera de página:** fondo `background` (crema), título 23/700, subtítulo 13 `muted`, botón atrás de 48×48 con chevron `‹` en `primary`. El clásico conserva cabecera granate sólida con la marca UNSA como texto enmarcado (nunca el escudo).
- **Navegación por pestañas:** cinco pestañas por rol con historial independiente; iconos de línea dibujados con vistas (sin fuentes de iconos ni dependencias), activo en `primary`, inactivo en `muted`.
- **Listas paginadas (`PagedList`):** páginas de 20 en servidor; pie con contador exacto «N de M unidades», botón «Ver más» y botón secundario «Actualizar…»; búsqueda con espera explícita (`waiting`) que no borra lo visible; consulta de detalle individual solo al abrir el elemento; estados vacíos con texto `muted` que explica la causa y el siguiente paso.
- **Retroalimentación de consulta (`QueryFeedback`):** carga, error y vacío separados; el error ofrece reintentar y nunca reemplaza datos ya cargados. Un error de página siguiente no invalida lo mostrado.

## 5. Layout y espaciado

- Contenido con ancho máximo **560 px**, centrado, padding lateral 20 y gap entre secciones 22 (clásico: 20).
- Radios: 12 (campos, chips), 15 (botones, métricas, avisos), 20 (grupos, tarjetas student), 17 (tarjetas clásicas).
- Objetivos táctiles: botones ≥ 52–54 px, filas ≥ 76 px, atrás y botones de texto ≥ 48 px.
- Estructura de página: cabecera → bloques apilados con gap 22; dentro de un bloque, gap 12–14; filas «etiqueta: valor» con `space-between`.
- Los formularios usan `KeyboardAvoidingView` y `keyboardShouldPersistTaps="handled"`: el teclado no tapa el campo activo ni rompe los toques.

## 6. Profundidad y elevación

Un solo nivel: **cero sombras, cero gradientes**. La profundidad se sugiere con: borde 1 px `border`, contraste fondo crema vs papel, y el borde izquierdo de 4 px en `primary` para prioridad. Ningún componente flota salvo los modales del sistema. Si algo parece necesitar sombra, se resuelve con borde y contraste.

## 7. Do's and Don'ts

Sí:

- Estados con texto explícito junto al color; `accessibilityRole`, `accessibilityLabel` y `accessibilityValue` en controles e indicadores.
- Paginación de 20 con búsqueda en servidor y totales globales en módulos con volumen; detalle exacto al abrir.
- Confirmaciones explícitas del servidor después de cada escritura («guardada y confirmada por el servidor»).
- Botón secundario para cancelar/actualizar; el primario reserva la acción principal de la pantalla.
- Conservar filtros, búsqueda y página al regresar de un detalle.
- Fechas y horas con texto académico legible; las horas válidas son solo las validadas.

No:

- Recrear el escudo UNSA: la mención institucional es texto; en web, monograma CC. No inventar dorado ni otros colores de marca.
- Sombras, gradientes, serif en controles, iconos por fuente de iconos.
- Simular o anunciar como implementados: GPS/jornadas, push, tiempo real, prórrogas individuales, sincronización en segundo plano; si aparecen en interfaz, con marca «Próximamente» y sin pantallas que fingan funcionamiento.
- Listados completos sin paginar en módulos con volumen; contadores globales aproximados.
- Mezclar tokens clásicos y estudiante en una pantalla nueva; duplicar valores de token en estilos locales.

## 8. Comportamiento responsive

- Puntos de verificación obligatorios: **360, 390 y 430 px de ancho** con alto 844; la suite automatizada exige cero scroll horizontal (`scrollWidth <= innerWidth + 1`).
- Ancho máximo de contenido 560 px; en pantallas anchas el contenido queda centrado sobre el fondo crema.
- Los subtítulos largos se truncam con elipsis a ~180 caracteres antes de romper la fila; el detalle completo vive en la pantalla del elemento.
- Los tamaños móviles se prueban en cada recorrido de Playwright; ninguna fila o formulario debe desbordar en 360 px.

## 9. Guía rápida para agentes

Paleta mínima para generar UI consistente: fondo `#F7F4EF`, papel `#FFFDFA`, acento y texto de acción `#5E151D`, texto `#292523`, secundario `#716861`, borde `#E7DFD7`, validado `#316E58`/`#EAF2ED`, pendiente `#855817`/`#FAF0DF`.

Recetas:

- «Pantalla nueva de listado» → `StudentPage` + `PagedList` de 20 con `PageFooter`, búsqueda `useSearch`, estados de `QueryFeedback` y botón secundario de actualización en el pie.
- «Elemento de lista» → `StudentRow` dentro de `StudentGroup`; navegación con `router.push` a la ruta exacta con parámetros (`aulaId`, `practicaId`…).
- «Métrica o resumen» → bloques `metric` con número tabular y `Badge` con texto explícito; progreso con barra accesible.
- «Formulario» → `Field` con etiqueta como `accessibilityLabel`, validación previa, `ContentForm` para formularios de contenido y confirmación explícita del servidor.
- «Estado» → `Badge` con texto; nunca solo color; pendiente usa `amber`, validado usa `green`.
- Antes de crear un estilo nuevo, consultar `src/theme/student.tsx` y `src/features/alumno/components.tsx`: si el valor ya existe, reutilizarlo; si falta, agregarlo al tema y documentarlo aquí.
