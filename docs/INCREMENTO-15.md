# Incremento 15 · Administración y seguimiento académico

Administración dispone de directorio de usuarios y cambio confirmado de roles, creación de aulas con docente responsable, reasignación docente, conclusión/reactivación y gestión de matrículas. Añade reporte institucional y ficha individual para docente responsable/administración. Cuatro rutas nuevas: /administracion, /administrar-aula, /reportes y /seguimiento; accesos desde panel y lista de alumnos.

- Usuarios: búsqueda y filtro por rol. Impide cambiar la propia cuenta o dejar asignaciones académicas incompatibles; usa rol anterior esperado y repeticiones sin auditorías duplicadas. Los cambios de rol se serializan en PostgreSQL y revalidan al administrador tras esperar.
- Aulas: nombre, código único, periodo, descripción y docente. Clave de solicitud para reintentos; asignación y estado con valor anterior esperado. Concluir un aula conserva el contenido y bloquea publicaciones/matrículas; no cierra una práctica.
- Matrículas: búsqueda, filtros, inscripción y retiro revisados antes de confirmar. Revisión del padrón, bloqueo compartido con asistencia/comunidad y contador calculado desde las inscripciones. Repetir el mismo resultado no duplica matrícula/auditoría. El retiro conserva entregas, asistencia y práctica; elimina la inscripción actual y su avance de matrícula.
- Reporte: usuarios, aulas, prácticas, horas validadas promedio, notas y asistencia por aula; búsqueda, filtros y acceso a gestión. Las horas pendientes/rechazadas no se incluyen.
- Seguimiento: datos del estudiante y centro, horas validadas, asistencia, notas, retroalimentación e indicadores del servidor. Exige matrícula en el aula, además del permiso del docente. No inventa una práctica cuando no existe.

Se cierra la solicitud pública de roles ADMIN/PROFESOR/SUPERVISOR: el registro público solo acepta ALUMNO. No constituye verificación institucional ni habilita recuperación de correo. Los roles privilegiados se gestionan mediante administración autenticada.

La app consulta capacidades para administración y seguimiento antes de usar estos contratos. Se corrige el ingreso web durante la carga inicial: campos y botón se habilitan después del montaje, evitando capturar valores antes de la hidratación.

## Verificación

Tipos y exportación web de 31 rutas con Windows. Ocho unittest nuevos y los seis casos de asistencia afectados por el bloqueo compartido, correctos. test:administracion recorre creación con respuesta perdida/reintento, matrícula/retiro, reasignación, conclusión/reactivación, roles, reporte y seguimiento; detecta avisos React de texto inválido y protege accesos por rol.

Integración real: 22 comprobaciones en ssp_test, ocho eventos efectivos de auditoría, sin duplicados, conflictos 409, retiro de acceso 403 y cero errores de página/solicitudes a producción; evidencia local ignorada .expo/dev/administracion-integration.json y administracion-*-mobile.png. Se conserva el checkpoint para no repetir altas/escrituras si una revisión posterior es solo de consulta. Sin migración ni despliegue de producción.
