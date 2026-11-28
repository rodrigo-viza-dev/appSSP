# Incremento 38 · Acceso por rol, Resend, sesión renovable y metas del alumno por páginas

- **Acceso solo con Google, configurable.** PASSWORD_LOGIN_ROLES en el backend indica qué roles pueden ingresar con contraseña.
  - Vacío: entran todos los roles (modo actual).
  - Con SUPERVISOR: alumnos, docentes y administradores entran solo con Google @unsa.edu.pe (el backend ya validaba el dominio). La primera entrada con Google vincula sin contraseña la cuenta creada por administración. La pantalla de ingreso indica a los supervisores que usen correo y contraseña.
  - Ver docs/ACCESO-Y-CORREO.md del backend.
- **Correo con Resend.** Basta RESEND_API_KEY en el .env del backend. Se probó el envío SMTP con la bandeja de pruebas de Resend. Sin dominio propio, solo entrega al correo dueño de la cuenta.
- **Sesión deslizante.** POST /auth/renovar entrega un token nuevo si el actual sigue vigente y no fue revocado. La app lo renueva en el mismo objeto de sesión, sin recargar las pantallas, al pasar la mitad de la vida del token (cada 10 minutos y al volver a la app).
- **Metas del alumno por páginas.** La pantalla usa /equipo/practicas/{id}/metas/pagina, ahora abierto al alumno para sus propias prácticas, con los filtros Todas, En progreso y Completadas en el servidor. Se eliminó getMetas, que cargaba la lista completa. Las listas de prácticas del alumno (metas y expediente) siguen completas porque cada alumno tiene muy pocas prácticas, con una sola abierta a la vez.
- **Google en la entrega.** Se activó GOOGLE_CLIENT_IDS en la API de la entrega. La contraseña sigue habilitada para todos los roles, para que las cuentas ficticias de revisión funcionen.

## Verificación

- Backend: 	est_access_and_functional_base 18/18 (modo solo Google y renovación) y 	est_staff_pages OK (el alumno ve sus metas).
- TypeScript correcto.
- /auth/renovar probado contra la API local: entrega un token nuevo y responde 401 con un token inválido.
- Metas reales en Chromium (.expo/dev/verificar-metas38.cjs): 2 peticiones paginadas y 0 a la lista completa.
- En el enlace público, el botón de Google carga sin errores de origen.
- 	est:practica se detiene antes de metas, en la etapa Centro: espera un texto ("Correo del supervisor") que ya no existe en los datos reales. Queda pendiente actualizarla.
