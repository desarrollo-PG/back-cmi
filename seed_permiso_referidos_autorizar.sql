-- =============================================================
-- SEED: Permiso "Referidos: Autorizar" (sub-permiso de Referidos)
-- Reemplaza el hardcode `fkrol === 1 || fkrol === 7` (que asumia
-- erroneamente que el rol 7 era Auxiliar Administrativa) usado para
-- decidir quien puede aprobar las fases 2/3 y otras acciones de
-- administrador dentro de Referidos. Ejecutar UNA SOLA VEZ.
-- =============================================================

-- 1. Insertar el permiso (orden = siguiente disponible, sin hardcodear numero)
INSERT INTO permiso (nombre, descripcion, ruta, icono, orden)
SELECT
  'Referidos: Autorizar',
  'Aprobar fases 2 y 3, editar/eliminar cualquier referido y gestionar documentos como administrador',
  'referidos-autorizar',
  'fa-check-double',
  COALESCE(MAX(orden), 0) + 1
FROM permiso
ON CONFLICT (ruta) DO NOTHING;

-- 2. Asignar por nombre de rol (no por ID, que cambia entre entornos)
INSERT INTO rol_permiso (fkrol, fkpermiso)
SELECT r.idrol, p.idpermiso FROM rol r, permiso p
WHERE p.ruta = 'referidos-autorizar' AND r.nombre IN ('Administrador', 'Sistemas', 'Auxiliar Administrativa')
ON CONFLICT DO NOTHING;

-- Verificar resultado
SELECT r.nombre AS rol, STRING_AGG(p.ruta, ', ') AS permisos
FROM rol r
JOIN rol_permiso rp ON r.idrol = rp.fkrol
JOIN permiso p ON rp.fkpermiso = p.idpermiso
WHERE p.ruta = 'referidos-autorizar'
GROUP BY r.nombre
ORDER BY r.nombre;
