# Incremento 18 · Evaluación del supervisor, expediente y cierre conectado

Se completa el recorrido de evaluación y autorización de cierre con datos del backend de desarrollo. No se publica producción.

- Panel por rol y nuevas rutas protegidas `/expedientes` y `/expediente`.
- Supervisor vinculado registra desempeño, fortalezas, aspectos por mejorar, conclusión y conformidad. Puede actualizarlo antes del cierre con control de revisión.
- Alumno consulta requisitos y evaluación y abre bitácora, tareas y metas de la práctica seleccionada.
- Docente/admin confirma qué tareas y metas exige y el criterio académico; la nota mínima es opcional y no se presenta como regla institucional.
- Checklist calculado en servidor: matrícula, centro/supervisor, requisitos confirmados, horas validadas, evaluación favorable vigente y tareas/metas exigidas.
- Cierre docente con fundamento y revisión del expediente. Guarda copia v1 y auditoría; el mismo reintento no duplica el cierre. Bloquea cambios de horas, metas, evaluación y notas de la práctica cerrada.
- Descarga PDF autenticada en web y opción de guardar/compartir en móvil. El PDF en curso se identifica como seguimiento; el final conserva los datos revisados al cerrar.
- La ficha individual, bitácora y metas enlazan al expediente. Guía ampliada con tres artículos por rol. El cliente muestra los motivos de error de negocio del servidor.

Backend: columna aditiva `evaluaciones.contenido`, nueva tabla `expedientes_practicas`, rutas `/expedientes`, ReportLab y migración limitada a la base de pruebas. Detalles en `docs/EXPEDIENTE-Y-CIERRE.md` del backend.

## Qué revisar en la app

1. **Supervisor:** panel → Evaluar practicantes y ver expedientes → Completar evaluación → revisar y confirmar. Probar una evaluación con mejoras y luego actualizarla a favorable.
2. **Alumno:** panel → Mi expediente de prácticas. Revisar pendientes, evaluación, accesos a tareas/metas/bitácora y descarga del PDF en curso.
3. **Docente:** panel → Expedientes y cierre de prácticas, o seguimiento individual → Consultar evaluación y cierre. Elegir requisitos, criterio y nota mínima cuando corresponda.
4. **Cierre:** el botón debe habilitarse únicamente con todos los requisitos cumplidos. Al confirmar, conservar copia final y bloquear cambios posteriores. Usar una práctica ficticia destinada a cierre.

## Validación

Por indicación del usuario, las comprobaciones se reservan para el final del desarrollo; no se ejecutan suites entre cambios. El recorrido manual queda disponible en el entorno local después de la integración. La revisión en dispositivos físicos sigue pendiente.

Comprobaciones finales realizadas: TypeScript correcto y 16 pruebas aisladas del backend aprobadas (8 del expediente y 8 de horas). Cubren permisos, requisitos incompletos, evaluación con revisión/reintentos, cambios de supervisor, bloqueo del cierre antiguo, datos obsoletos, copia conservada al cerrar y PDF privado con texto escapado. No se repitieron las suites completas.

## Pendientes del plan general

Sesión persistente/recuperación, borradores sin conexión, archivos privados de entregas, reemplazos/prórrogas, push/tiempo real, jornada/GPS y paginación. Carta institucional y rúbrica oficial requieren plantilla/criterios aprobados; no se presentan como emitidos.
