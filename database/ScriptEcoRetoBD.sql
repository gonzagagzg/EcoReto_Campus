--Ver BDs
SELECT datname AS base_de_datos
FROM pg_database
WHERE datistemplate = false;

CREATE DATABASE ecoretobd;
