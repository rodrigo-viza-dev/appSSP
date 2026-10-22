# Ingreso institucional con Google y revisión en Android

La integración acepta cuentas de Google Workspace cuyo dominio verificado sea `unsa.edu.pe`. El usuario creó un cliente OAuth Web y su identificador público ya está configurado en los entornos locales de la app y el backend, fuera de Git. La comprobación del incremento 20 carga el SDK y el botón reales con HTTP 200 desde `http://localhost:5173`. Falta que el usuario pruebe el ingreso con su cuenta. Codex no inició sesión en Google Cloud ni publicó una app.

## Qué datos se obtienen

El servidor verifica firma, emisor, audiencia y vencimiento del ID token mediante `google-auth`, además de `email_verified=true`, `hd=unsa.edu.pe` y correo `@unsa.edu.pe`. Vincula la identidad estable `sub` con una cuenta SSP. Usa correo, nombres y apellidos para el alta; no solicita Drive, Gmail, notas ni padrón universitario y no guarda tokens de Google.

Una cuenta nueva recibe únicamente ALUMNO y empieza sin matrículas ni prácticas. Una cuenta SSP existente conserva su rol y sus datos académicos; el nombre de Google no sobrescribe su ficha. Administración sigue asignando roles y acceso. Un supervisor con correo externo puede ingresar mediante SSP, pero no mediante Google institucional.

La primera vinculación con una cuenta SSP existente exige confirmar su contraseña SSP. Una coincidencia de correo por sí sola no conecta las cuentas. Si no conoces esa contraseña, primero hay que recuperarla. Después de vincularlas, basta con entrar con Google.

## Configuración en Google Cloud

1. Crear o seleccionar un proyecto y configurar Google Auth Platform: nombre de la app, correo de soporte, audiencia y usuarios de prueba. La opción Internal requiere un proyecto perteneciente a la organización Workspace correspondiente; no basta con escribir `unsa.edu.pe`. En un proyecto externo, revisar con la organización si sus políticas permiten la aplicación.
2. Crear un cliente OAuth de tipo **Web application**. Su identificador público se usa como audiencia del backend y `webClientId` de Android. Este cliente Web ya fue creado. Para probar el navegador en la PC, registrar `http://localhost` y `http://localhost:5173`, cada uno en su propia fila de **Orígenes autorizados de JavaScript**, y guardar. No incluyen rutas, espacios ni saltos de línea. No colocarlos en URI de redireccionamiento: este flujo usa callback JavaScript. Para producción, registrar el HTTPS autorizado. Los orígenes HTTP de IP privada no equivalen a localhost: para el navegador del teléfono usar HTTPS autorizado o el ingreso SSP local.
3. Crear un cliente OAuth **Android** para `pe.edu.unsa.practicascc` y la huella SHA-1 de la clave que firma la compilación. Una compilación con otra clave necesita registrar su huella. El identificador de paquete es el de esta app, no una acreditación de publicación institucional.
4. App `.env.local`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` contiene el ID Web. Backend `.env`: `GOOGLE_CLIENT_IDS` contiene ese mismo ID; admite CSV de audiencias expresamente autorizadas. Ambos están configurados en el equipo actual. Este flujo de ID token no usa el secreto del cliente. No colocar secretos en variables `EXPO_PUBLIC_` ni compartirlos por chat; rotar cualquier secreto expuesto desde Google Cloud.
5. Reiniciar ambos servidores y generar una compilación Android de desarrollo que incluya el módulo de Google. El ingreso nativo de Google no funciona en Expo Go. No se ha solicitado una compilación remota ni iniciado sesión en EAS.
6. En PC, abrir `http://localhost:5173` y probar una cuenta UNSA autorizada cuando Google acepte el origen. La revisión del acceso real y de las políticas Workspace debe hacerla el usuario; no se ha iniciado sesión automáticamente. Confirmar el rechazo de una cuenta personal y la conservación del rol en cuentas SSP vinculadas. Para Android nativo hace falta además el paso 3 y la compilación propia.

Si Google devuelve **403 / origin is not allowed**, comprobar que se editó el mismo cliente Web que usa la app y que ambos orígenes quedaron guardados en el apartado JavaScript. El SDK puede cargar y dibujar parte del botón aunque Google rechace su iframe; eso no demuestra que el ingreso esté habilitado. En Windows, `npm run test:google:real` comprueba SDK y respuesta real del botón, rechazo de un token inválido y, si está indicada, la dirección LAN. No inicia sesión ni modifica datos académicos. Requiere Playwright/Chromium y los servidores locales activos; admite `SSP_API_URL`, `SSP_WEB_URL` y `SSP_WEB_LAN_URL`. Guarda evidencia local fuera de Git y falla si Google todavía rechaza el cliente.

Android usa autolinking sin Firebase. `app.config.js` fija el paquete y evita activar el plugin de Firebase sin archivos de configuración. Para iOS habría que añadir su cliente y `GOOGLE_IOS_URL_SCHEME`; no está preparado un cliente iOS.

## Revisión local con Android

PC y teléfono deben estar en la misma Wi-Fi. Abrir dos PowerShell de Windows:

```powershell
cd C:\proyectos\appSSP-backend
.\scripts\iniciar-pruebas.ps1 -Lan
```

```powershell
cd C:\proyectos\appSSP
npm run movil:pruebas
```

El segundo comando muestra el QR y la dirección de Windows. Escanear con Expo Go compatible con el SDK de este proyecto para probar SSP, o abrir en Chrome Android la dirección `http://IP-DE-WINDOWS:5173`. Si Windows pide permiso de red al servidor, autorizar la red privada de confianza para esta prueba. Ambos scripts admiten `-LanHost` si hay varias interfaces. Detener el Expo anterior antes de usar el puerto 5173.

Usar las cuentas ficticias ya existentes; la clave está en la nota local de accesos, fuera de Git. No usar la contraseña de Google en el formulario SSP. El código no crea una publicación pública ni un túnel.

## Sesión, recuperación y borradores

Android conserva el JWT y los datos públicos de sesión en SecureStore. Al abrir, consulta `/auth/me`; un token vencido o revocado exige ingreso. Si la API no responde y el token guardado sigue dentro de su vencimiento, permite continuar borradores con el aviso de desconexión. El servidor comprueba siempre los permisos cuando se envían datos. No hay renovación automática del token.

En web se usa sessionStorage: la sesión sobrevive a recargas de la misma pestaña. Los borradores usan almacenamiento local por cuenta y API, permanecen al salir y se eliminan desde Borradores. En Android los borradores usan AsyncStorage, no almacenamiento cifrado. No hay caché completa de las aulas ni trabajo en segundo plano. Para recuperar un formulario sin red, abrir Borradores desde el panel; primero hay que haberlo preparado con conexión.

Los envíos pendientes requieren confirmación del alumno. Al reconectar, pulsar **Enviar pendientes confirmados**; se consultan resultados y se mantienen las claves de deduplicación o revisión. Editar un pendiente lo devuelve a borrador hasta confirmarlo otra vez. Un error o conflicto conserva el contenido para revisión.

La recuperación SSP necesita `SMTP_HOST`, `SMTP_PORT` (587 con STARTTLS), `SMTP_FROM` y, cuando corresponda, `SMTP_USER`/`SMTP_PASSWORD` en el backend. Sin servicio configurado se muestra como pendiente. Los códigos tienen 20 minutos, un solo uso y se guardan como hash; cambiar la contraseña revoca las sesiones anteriores. No se ha configurado ni probado un envío real de correo.

Fuentes: [configuración oficial de Google y orígenes locales](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [OpenID Connect de Google](https://developers.google.com/identity/openid-connect/openid-connect), [verificación del ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Google en Expo](https://docs.expo.dev/guides/google-authentication/), [configuración Expo del módulo nativo](https://react-native-google-signin.github.io/docs/setting-up/expo), [SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/).
