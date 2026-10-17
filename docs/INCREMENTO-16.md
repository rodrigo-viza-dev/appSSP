# Incremento 16 · Mensajería académica privada

El alumno matriculado y su docente responsable disponen de /mensajes y /conversacion. Acceso desde panel y aula, selección de aula, búsqueda de contacto, filtro de conversaciones sin leer, conversación cronológica, envío revisado y estados Enviado/Leído. La guía amplía su contenido a 17 artículos, incluidos administración, seguimiento y mensajes privados.

- El servidor comprueba el vínculo docente/alumno actual en cada lectura, envío y confirmación de lectura. No permite mensajes entre alumnos, a un contacto ajeno o a la propia cuenta; administración no consulta conversaciones privadas mediante este módulo.
- Retirar la matrícula o reasignar al docente revoca el acceso anterior sin borrar mensajes. Un aula concluida conserva consulta y confirmación de lectura, pero bloquea mensajes nuevos.
- El envío conserva solicitudId y contenido para reintentar sin duplicados. La escritura comparte bloqueo de aula con cambios de matrícula y estado.
- GET no marca leído. El destinatario confirma explícitamente los mensajes recibidos mediante PUT con IDs concretos; no puede marcar los mensajes propios o de otra conversación. La confirmación se refleja en el estado que consulta el remitente.
- La auditoría registra remitente, destinatario y aula, sin copiar el texto privado. No registra eventos por cada reintento o marca de lectura.

Se aclara también en la gestión del aula que retirar la matrícula elimina su avance actual, conservando los registros académicos independientes.

Se reutilizan MensajeDirecto y Auditoria; no hay migración, servicio externo, push ni tiempo real. Las pantallas actualizan por consulta. El acceso depende de pertenencia vigente; no se ofrece un archivo de conversaciones de aulas ya inaccesibles.

## Verificación

Tipos, exportación web de 33 rutas y siete unittest de backend: vínculo permitido, privacidad, envío idempotente, GET sin efectos, lectura autorizada y repetida, aula concluida, retiro e inputs limitados. test:mensajes comprueba envío con respuesta perdida, intercambio alumno/docente, contadores, lectura explícita, roles y servidor anterior.

Integración real: 21 comprobaciones entre cuentas ficticias de ssp_test; dos mensajes persistidos, reintentos concurrentes sin duplicados, lecturas explícitas guardadas, acceso ajeno 403, auditoría sin texto privado y cero errores/solicitudes a producción; evidencias locales ignoradas mensajes-integration.json y mensajes-*-mobile.png. No se envían comunicaciones a personas externas ni al líder del proyecto. Publicación de producción y mensajería fuera de esta app quedan fuera del incremento.
