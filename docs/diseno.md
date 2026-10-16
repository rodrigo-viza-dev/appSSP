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

Interfaz clara, encabezados sólidos, tarjetas de 17 px de radio, botones de al menos 52 px, espacio entre bloques de 20 px y contenido de hasta 560 px en pantallas anchas. Tipografía de sistema para controles y lectura; Georgia/serif para marca, horas y fechas, como en las referencias. La tipografía del isotipo oficial no se extrapola a todos los controles.

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

Después de migrar a Windows se ejecutaron npm ci, typecheck y export:web correctamente con Node/npm de Windows. Se corrigió el tipo de color de los iconos de navegación. Queda pendiente comprobar representación visual, teclado y áreas seguras en navegador y Expo Go. Ver `docs/ESTADO-MIGRACION.md`.
