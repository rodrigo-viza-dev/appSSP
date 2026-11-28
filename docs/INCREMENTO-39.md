# Incremento 39 · Asignaciones del administrador por páginas

/asignaciones ya no descarga todos los usuarios, aulas, centros y prácticas. La pantalla pasa al sistema de filas y chips de DESIGN.md:

- **Centros**: se cargan de 20 en 20, en orden alfabético, y la búsqueda (centro, alumno o correo) la hace el servidor. Al tocar un centro se ve el alumno, el contacto, la cuenta que supervisa y las aulas activas del alumno, con dos acciones: **Asignar práctica** y **Vincular o cambiar supervisor**.
- **Asignar práctica** abre una página propia. El aula se elige entre las aulas activas del alumno, que llegan con el centro (máximo 20), así que ya no hace falta la lista completa de aulas.
- **Vincular supervisor** abre un selector de cuentas de supervisor por páginas y con búsqueda (/admin/usuarios/pagina?rol=SUPERVISOR). Permite desvincular la cuenta actual y pide el motivo antes de confirmar.
- **Prácticas asignadas**: se cargan por páginas con búsqueda (/equipo/practicas/pagina) y cada una abre su expediente.
- **Crear cuenta de supervisor** abre una página propia.

## API

GET /admin/centros/pagina?q=&limite=20&cursor=, solo para ADMIN. Ordena por nombre de centro con desempate por ID, liga el cursor a la consulta y busca hasta 120 caracteres. /admin/asignaciones se mantiene por compatibilidad con el APK anterior, pero la app ya no lo usa.

## Verificación

- Backend: 	est_access_and_functional_base 19/19, con un caso nuevo de centros (orden, cursor, búsqueda, aulas activas, cuenta vinculada, 403 y 422).
- TypeScript correcto.
- Chromium contra ssp_test (.expo/dev/verificar-asignaciones38.cjs, solo lectura): centros por página, detalle, selector de supervisores con búsqueda y prácticas por página. 0 peticiones a listas completas, 0 escrituras, 0 errores y sin desborde a 390 px.
