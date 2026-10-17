# Incremento 7 · Preparación del entorno de prueba

Actualización: la conexión y el recorrido real se completaron en el [incremento 8](INCREMENTO-08.md). Las credenciales pendientes descritas abajo corresponden al estado al preparar este incremento.

Se clonó el backend confirmado en la carpeta paralela `C:\proyectos\appSSP-backend` y se preparó una rama de desarrollo para trabajar sobre el Supabase vacío autorizado. La arquitectura sigue siendo Expo → FastAPI → PostgreSQL; el ejemplo de acceso directo a una tabla `todos` no corresponde a los contratos de esta app.

## Preparación

- Python de Windows y entorno virtual propio del backend, con sus dependencias instaladas.
- Configuración local ignorada por Git: URL PostgreSQL pendiente, secretos generados, proyecto de prueba esperado, esquema privado `ssp_test`, CORS local y archivos en `.local/uploads`.
- Inicializador con límite por entorno/proyecto/esquema, SSL, RLS y semilla ficticia: seis cuentas para los cuatro roles, dos aulas con propietarios distintos, prácticas activas, centros, supervisor, tareas, entregas y avisos.
- `scripts/iniciar-pruebas.ps1 -Inicializar` prepara la base; arranques posteriores comprueban las tablas antes de servir FastAPI en `http://localhost:8000`.
- `npm run web:pruebas` comprueba la disponibilidad del backend mediante `/dev/ready` y abre Expo en 5173 con la API local solo para ese proceso. No cambia la URL predeterminada del proyecto.

El backend incluye su guía reproducible en `docs/ENTORNO-PRUEBAS.md`. No se requieren supabase-js ni una autenticación adicional en Expo: SQLAlchemy se conecta a PostgreSQL y FastAPI conserva las reglas y sesiones existentes.

Preparación del backend subida en la rama [desarrollo/entorno-supabase-pruebas](https://github.com/BastleyNait/BACK-CS-DE-LA-COM/tree/desarrollo/entorno-supabase-pruebas), commit `1575977`. Se retiran del seguimiento las cachés Python que ya venían en ese repositorio.

## Credencial pendiente y verificación

La URL del proyecto y la clave publicable permiten usar la Data API, pero no reemplazan la conexión PostgreSQL. Para completar la conexión: Supabase → **Connect → Session pooler (5432)**, sustituir la contraseña de la base y guardar la cadena en `DATABASE_URL` del `.env` del backend. Los caracteres reservados de la contraseña deben codificarse para URL. No pegar ni subir esa cadena a Git.

Se comprobó la compilación Python, el caso que rechaza entornos/proyectos incorrectos, el hash de contraseña/JWT y la sintaxis de los lanzadores PowerShell. La creación de tablas y el recorrido real de escritura dependen de completar DATABASE_URL; todavía no se declaran verificados.

Fuente: [conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres). La skill oficial `supabase-postgres-best-practices` se instaló en el entorno local de Codex y no forma parte de las dependencias de la app.
