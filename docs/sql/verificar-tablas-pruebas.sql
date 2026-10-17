-- Solo lectura. Ejecutar en el proyecto Supabase de pruebas configurado en el backend.
-- Las cuentas de la aplicación están en ssp_test.users; no son cuentas de Supabase Auth.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('ssp_test', 'public')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

SELECT count(*) AS cuentas_ssp FROM ssp_test.users;
