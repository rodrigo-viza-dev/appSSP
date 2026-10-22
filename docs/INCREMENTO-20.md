# Incremento 20 · Cliente OAuth Web y acceso local desde Android

El identificador público del cliente OAuth Web creado por el usuario queda configurado en `.env.local` de la app y `.env` del backend, fuera de Git. Los servidores se reiniciaron con esa configuración. El flujo usa Google Identity Services y verificación del ID token en el servidor; no necesita el secreto OAuth ni se almacenó el compartido por chat.

## Comportamiento

- En localhost y HTTPS, la app carga el SDK oficial de Google cuando también está habilitado en el backend. Google decide si el origen está autorizado para ese cliente.
- En una dirección HTTP de la Wi-Fi, informa cómo abrir Google desde la PC o un HTTPS autorizado y conserva el formulario SSP, sin iniciar peticiones a Google.
- Si el SDK no carga en 15 segundos, muestra el acceso alternativo SSP. El aviso del formulario distingue las credenciales SSP del botón institucional.
- La prueba nueva `test:google:real` usa un navegador limpio, no pulsa el botón ni inicia sesión en cuentas. Distingue cargar el SDK de obtener una respuesta válida del botón.

## Verificación

TypeScript y las dos pruebas de origen pasaron con Node/npm de Windows. Contra el backend local de pruebas, `/auth/capacidades` habilita Google para `unsa.edu.pe` y un token inválido recibe 401, sin altas ni escrituras académicas.

Chromium a 390×844 carga el SDK, los estilos y el iframe del botón con **HTTP 200** tras guardar el usuario los dos orígenes `http://localhost` y `http://localhost:5173` en el cliente Web. `npm run test:google:real` pasa. La vista LAN conserva SSP y no hace peticiones a Google. No hubo peticiones de inicio de sesión, errores de navegador ni conexiones a otra API. La aceptación del origen no verifica el consentimiento ni las políticas Workspace para una cuenta: esa prueba manual sigue pendiente.

Evidencias locales: `.expo/dev/google20-integration.json`, `google20-localhost-mobile.png` y `google20-wifi-mobile.png`, fuera de Git. No se repitieron migraciones, semillas ni suites académicas ya aprobadas. La revisión en Android físico, el cliente OAuth Android con SHA-1 y la compilación nativa siguen pendientes. No hay despliegue público ni correo SMTP configurado.

Ver [configuración Google y Android](ACCESO-GOOGLE-Y-ANDROID.md).
