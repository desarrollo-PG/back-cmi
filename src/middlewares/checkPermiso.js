/**
 * checkPermiso.js
 * Middleware dinámico: verifica si el rol del usuario tiene acceso
 * a una página específica según la tabla rol_permiso en BD.
 *
 * Los roles "Administrador" y "Sistemas" (por nombre) siempre tienen acceso total.
 * Cache en memoria con TTL de 5 minutos para no golpear la BD en cada request.
 */

const { prisma } = require('../config/prisma');

// Por NOMBRE, no por ID — el idrol de cada uno cambia entre entornos (local/produccion)
const ROLES_SUPERADMIN_NOMBRES = ['Administrador', 'Sistemas'];
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Map<"fkrol:rutaPagina", { tieneAcceso: bool, expires: number }>
const _cache = new Map();

// Cache del mapeo idrol -> nombre, para no consultar la BD en cada request
let _rolesPorId = null;
let _rolesPorIdExpira = 0;

async function esRolSuperadmin(fkrol) {
  const ahora = Date.now();
  if (!_rolesPorId || ahora > _rolesPorIdExpira) {
    const roles = await prisma.rol.findMany({ select: { idrol: true, nombre: true } });
    _rolesPorId = new Map(roles.map(r => [r.idrol, r.nombre]));
    _rolesPorIdExpira = ahora + CACHE_TTL;
  }
  return ROLES_SUPERADMIN_NOMBRES.includes(_rolesPorId.get(fkrol));
}

/**
 * Verifica si un rol (por fkrol) tiene acceso a una ruta de permiso.
 * Reutilizable tanto en middlewares de Express como en services (sin req/res).
 * @param {number} fkrol
 * @param {string} rutaPagina - Ruta de la página en la tabla permiso (ej: 'inventario')
 */
const tienePermiso = async (fkrol, rutaPagina) => {
  if (!fkrol) return false;

  // Superadmin: acceso total (resuelto por nombre de rol, con cache)
  if (await esRolSuperadmin(fkrol)) return true;

  // Revisar caché
  const cacheKey = `${fkrol}:${rutaPagina}`;
  const cached = _cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.tieneAcceso;
  }

  // Consultar BD: ¿tiene este rol permiso para esta página?
  const registro = await prisma.rol_permiso.findFirst({
    where: {
      fkrol,
      permiso: { ruta: rutaPagina }
    }
  });

  const tieneAcceso = !!registro;

  // Guardar en caché
  _cache.set(cacheKey, { tieneAcceso, expires: Date.now() + CACHE_TTL });

  return tieneAcceso;
};

/**
 * Middleware factory.
 * @param {string} rutaPagina - Ruta de la página en la tabla permiso (ej: 'inventario')
 */
const verificarPermiso = (rutaPagina) => {
  return async (req, res, next) => {
    try {
      const fkrol = req.usuario?.fkrol;

      if (!fkrol) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      if (await tienePermiso(fkrol, rutaPagina)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        detalles: { pagina: rutaPagina }
      });

    } catch (error) {
      // Si falla la BD (tablas no creadas, conexión, etc.) → permitir acceso
      // para no romper el sistema mientras se migra
      console.error(`[checkPermiso] Error verificando permiso '${rutaPagina}':`, error.message);
      return next();
    }
  };
};

/** Limpia toda la caché (usar cuando se actualicen permisos en la UI) */
const limpiarCachePermisos = () => {
  _cache.clear();
};

/** Limpia caché de un rol específico */
const limpiarCacheRol = (fkrol) => {
  for (const key of _cache.keys()) {
    if (key.startsWith(`${fkrol}:`)) _cache.delete(key);
  }
};

module.exports = { verificarPermiso, tienePermiso, limpiarCachePermisos, limpiarCacheRol };
