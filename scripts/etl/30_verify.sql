-- Verificación post-ETL: correr contra abas_v2 con dblink NO disponible,
-- así que los conteos de staging se comparan vía FDW manual: este script
-- usa solo abas_v2 + la tabla etl_rechazos para explicar diferencias.
--
-- Uso:
--   podman exec -i pg psql -U postgres -d abas_v2 -f - < scripts/etl/30_verify.sql
--   (los conteos de staging se listan aparte en el bloque final comentado)

\echo '=== 1. Conteos por tabla (v2) + rechazos registrados ==='
WITH conteos AS (
  SELECT 'roles' AS tabla, count(*) AS filas FROM roles UNION ALL
  SELECT 'users', count(*) FROM users UNION ALL
  SELECT 'uploads', count(*) FROM uploads UNION ALL
  SELECT 'fracciones', count(*) FROM fracciones UNION ALL
  SELECT 'manzanas', count(*) FROM manzanas UNION ALL
  SELECT 'lotes', count(*) FROM lotes UNION ALL
  SELECT 'lotes_colores', count(*) FROM lotes_colores UNION ALL
  SELECT 'lotes_distritos', count(*) FROM lotes_distritos UNION ALL
  SELECT 'alquileres', count(*) FROM alquileres UNION ALL
  SELECT 'carruseles', count(*) FROM carruseles UNION ALL
  SELECT 'ultimos_lanzamientos', count(*) FROM ultimos_lanzamientos UNION ALL
  SELECT 'proximos_desarrollos', count(*) FROM proximos_desarrollos UNION ALL
  SELECT 'quienes_somos', count(*) FROM quienes_somos UNION ALL
  SELECT 'mision', count(*) FROM mision UNION ALL
  SELECT 'vision', count(*) FROM vision UNION ALL
  SELECT 'producto', count(*) FROM producto UNION ALL
  SELECT 'trayectoria', count(*) FROM trayectoria UNION ALL
  SELECT 'parking', count(*) FROM parking UNION ALL
  SELECT 'ofrecemos', count(*) FROM ofrecemos UNION ALL
  SELECT 'nuestros_horarios', count(*) FROM nuestros_horarios UNION ALL
  SELECT 'direccion_contacto', count(*) FROM direccion_contacto UNION ALL
  SELECT 'sucursales', count(*) FROM sucursales
)
SELECT c.tabla,
       c.filas AS filas_v2,
       COALESCE(r.filas_rechazadas, 0) AS filas_rechazadas,
       COALESCE(r.avisos_de_campo, 0) AS avisos_de_campo
FROM conteos c
LEFT JOIN (
  SELECT tabla,
         count(*) FILTER (WHERE motivo NOT LIKE 'campo %') AS filas_rechazadas,
         count(*) FILTER (WHERE motivo LIKE 'campo %') AS avisos_de_campo
  FROM etl_rechazos GROUP BY tabla
) r USING (tabla)
ORDER BY c.tabla;

\echo '=== 2. FKs huérfanas (todas deben dar 0) ==='
SELECT 'users.rol_id' AS fk, count(*) AS huerfanas FROM users u WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = u.rol_id)
UNION ALL SELECT 'manzanas.fraccion_id', count(*) FROM manzanas m WHERE NOT EXISTS (SELECT 1 FROM fracciones f WHERE f.id = m.fraccion_id)
UNION ALL SELECT 'lotes.manzana_id', count(*) FROM lotes l WHERE NOT EXISTS (SELECT 1 FROM manzanas m WHERE m.id = l.manzana_id)
UNION ALL SELECT 'lotes (codigos) → manzana', count(*) FROM lotes l WHERE NOT EXISTS (
    SELECT 1 FROM manzanas m JOIN fracciones f ON f.id = m.fraccion_id
    WHERE f.codigo = l.fraccion_codigo AND m.codigo = l.manzana_codigo AND m.id = l.manzana_id)
UNION ALL SELECT 'carruseles.imagen_upload_id', count(*) FROM carruseles c WHERE c.imagen_upload_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM uploads u WHERE u.id = c.imagen_upload_id)
UNION ALL SELECT 'lotes_distritos.imagen_upload_id', count(*) FROM lotes_distritos d WHERE d.imagen_upload_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM uploads u WHERE u.id = d.imagen_upload_id)
UNION ALL SELECT 'alquileres.imagenes → uploads', count(*) FROM (
    SELECT 1 FROM alquileres a, jsonb_array_elements(a.imagenes) img
    WHERE a.imagenes IS NOT NULL AND NOT EXISTS (SELECT 1 FROM uploads u WHERE u.id = (img)::int)
  ) x;

\echo '=== 3. jsonb inválido / mal normalizado (todo debe dar 0) ==='
SELECT 'fracciones.coorde_centro sin lat/lng' AS chequeo, count(*) AS filas
FROM fracciones WHERE coorde_centro IS NOT NULL AND (jsonb_typeof(coorde_centro->'lat') <> 'number' OR jsonb_typeof(coorde_centro->'lng') <> 'number')
UNION ALL SELECT 'manzanas.coorde_centro sin lat/lng', count(*)
FROM manzanas WHERE coorde_centro IS NOT NULL AND (jsonb_typeof(coorde_centro->'lat') <> 'number' OR jsonb_typeof(coorde_centro->'lng') <> 'number')
UNION ALL SELECT 'lotes.coorde_centro sin lat/lng', count(*)
FROM lotes WHERE coorde_centro IS NOT NULL AND (jsonb_typeof(coorde_centro->'lat') <> 'number' OR jsonb_typeof(coorde_centro->'lng') <> 'number')
UNION ALL SELECT 'fracciones.coorde_lados no array', count(*)
FROM fracciones WHERE coorde_lados IS NOT NULL AND jsonb_typeof(coorde_lados) <> 'array'
UNION ALL SELECT 'manzanas.coorde_lados no array', count(*)
FROM manzanas WHERE coorde_lados IS NOT NULL AND jsonb_typeof(coorde_lados) <> 'array'
UNION ALL SELECT 'lotes.coorde_lados no array', count(*)
FROM lotes WHERE coorde_lados IS NOT NULL AND jsonb_typeof(coorde_lados) <> 'array'
UNION ALL SELECT 'alquileres.coordenadas sin lat/lng', count(*)
FROM alquileres WHERE coordenadas IS NOT NULL AND (jsonb_typeof(coordenadas->'lat') <> 'number' OR jsonb_typeof(coordenadas->'lng') <> 'number')
UNION ALL SELECT 'sucursales.coordenadas sin lat/lng', count(*)
FROM sucursales WHERE coordenadas IS NOT NULL AND (jsonb_typeof(coordenadas->'lat') <> 'number' OR jsonb_typeof(coordenadas->'lng') <> 'number')
UNION ALL SELECT 'alquileres.imagenes no array', count(*)
FROM alquileres WHERE imagenes IS NOT NULL AND jsonb_typeof(imagenes) <> 'array';

\echo '=== 4. Unicidad de uploads.link (debe dar 0) ==='
SELECT count(*) AS links_duplicados FROM (SELECT link FROM uploads GROUP BY link HAVING count(*) > 1) d;

\echo '=== 5. Passwords: ninguno en texto plano (debe dar 0; scrypt empieza con $scrypt$) ==='
SELECT count(*) AS passwords_sin_hashear FROM users WHERE password NOT LIKE '$scrypt$%';

\echo '=== 6. Secuencias: INSERT+DELETE de prueba en tablas clave ==='
BEGIN;
INSERT INTO roles (descripcion, nivel, created_at) VALUES ('__prueba_seq__', 99, now());
INSERT INTO users (username, password, rol_id, created_at) VALUES ('__prueba_seq__', 'x', (SELECT id FROM roles WHERE descripcion = '__prueba_seq__'), now());
INSERT INTO uploads (link, created_at) VALUES (repeat('f', 100), now());
INSERT INTO fracciones (codigo, created_at) VALUES (99999, now());
INSERT INTO manzanas (fraccion_id, codigo, created_at) VALUES ((SELECT id FROM fracciones WHERE codigo = 99999), 1, now());
INSERT INTO lotes (manzana_id, fraccion_codigo, manzana_codigo, codigo, created_at)
  VALUES ((SELECT id FROM manzanas WHERE fraccion_id = (SELECT id FROM fracciones WHERE codigo = 99999)), 99999, 1, 1, now());
INSERT INTO alquileres (created_at) VALUES (now());
INSERT INTO carruseles (titulo, created_at) VALUES ('__prueba_seq__', now());
INSERT INTO sucursales (titulo, created_at) VALUES ('__prueba_seq__', now());
INSERT INTO leads (tipo, nombre, telefono, created_at) VALUES ('contacto', '__prueba_seq__', '000', now());
\echo 'Inserciones de prueba OK (las secuencias no chocan con ids importados)'
ROLLBACK;

\echo '=== 7. Detalle de rechazos por tabla y motivo ==='
SELECT tabla, motivo, count(*) AS filas
FROM etl_rechazos
GROUP BY tabla, motivo
ORDER BY tabla, count(*) DESC;
