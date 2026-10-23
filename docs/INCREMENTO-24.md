# Incremento 24 · Entrega remota del avance

Versión 0.2.0-avance.20261023. Web: https://practicascc-avance-23oct-2026.vercel.app. APK y su SHA-256: https://practicascc-avance-23oct-2026.vercel.app/descargas.

La entrega usa dos proyectos Vercel separados, una copia privada de 28 tablas en `ssp_presentacion_20261023`, siete cuentas ficticias y credenciales propias. Se excluyó una cuenta ajena a la demostración, sus registros dependientes, identidades Google, recuperaciones y auditoría anterior. No se modificó `ssp_test` ni se fusionó el backend con main. La copia no reemplaza un esquema existente y se comprobó el aislamiento de tipos enum y claves foráneas.

El frontend identifica el avance y solo muestra los accesos habilitados. Los adjuntos de esta entrega se limitan a 4 MB. Se agregó el monograma CC, sin recrear el escudo UNSA. Android se compiló localmente con JDK17, SDK36 y la clave debug previamente registrada: paquete `pe.edu.unsa.practicascc`, versión 0.2.0, código 24, Android 7+, ARM32/ARM64. APK de 52,8 MB firmado; no publicación de Play Store ni prueba de Google institucional.

La API utiliza las rutas nativas de FastAPI en Vercel, Python3.12 y respuestas privadas `no-store`. El proyecto web está desconectado de Git para evitar cambios automáticos en esta presentación. Los secretos del servidor permanecen fuera de Git y de los archivos para el líder.

Verificación: TypeScript y exportación web de 139 rutas; tres pruebas del aislamiento de la copia; revisión real de las cuatro cuentas en el enlace público, PDF, borrador, sesión y anchos 360/390/430, sin simulación de API, errores de navegador ni escrituras académicas. Firma y manifiesto del APK verificados. El APK se instaló en el Android autorizado y se comprobó el ingreso y la apertura de Bitácora; el recorrido automático se detuvo al buscar un contador fuera de pantalla. La revisión completa en Android sigue pendiente.

El paquete local `entregas/avance-2026-10-23/`, ignorado por Git, contiene APK, accesos privados, capturas, evidencia y mensaje para compartir. El líder recibe el enlace y los accesos ficticios; no se le enviaron mensajes automáticamente. La rama `presentacion/avance-2026-10-23` conserva el código de entrega; el desarrollo posterior debe usar otra rama y `ssp_test`.
