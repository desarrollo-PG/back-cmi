
const { prisma } = require('../config/prisma');

let rolesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtener roles desde cache
 */
async function obtenerRolesParaMensajes() {
  const ahora = Date.now();

  if (!rolesCache || !cacheTimestamp || (ahora - cacheTimestamp) > CACHE_DURATION) {
    rolesCache = await prisma.rol.findMany({
      where: { estado: 1 },
      select: { idrol: true, nombre: true }
    });
    cacheTimestamp = ahora;
  }

  return rolesCache;
}

/**
 * Middleware para verificar si el usuario tiene uno de los roles permitidos, por NOMBRE.
 * El idrol de cada rol puede variar entre entornos (local/produccion) e incluso entre
 * momentos distintos del mismo entorno, pero el nombre es estable — por eso esta es la
 * forma segura de proteger rutas para roles especificos como "Administrador" o "Sistemas".
 * @param {...string} nombresRolesPermitidos - Nombres de los roles que pueden acceder
 */
const checkRoleByName = (...nombresRolesPermitidos) => {
  return async (req, res, next) => {
    try {
      const fkrol = req.usuario.fkrol;

      if (!fkrol) {
        return res.status(403).json({
          success: false,
          message: 'No se pudo determinar el rol del usuario'
        });
      }

      const roles = await obtenerRolesParaMensajes();
      const rolUsuario = roles.find(r => r.idrol === fkrol);
      const tienePermiso = !!rolUsuario && nombresRolesPermitidos.includes(rolUsuario.nombre);

      if (!tienePermiso) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esa acción',
          detalles: {
            tuRol: rolUsuario ? rolUsuario.nombre : `ID: ${fkrol}`,
            rolesPermitidos: nombresRolesPermitidos
          }
        });
      }

      next();
    } catch (error) {
      console.error('Error en checkRoleByName:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

module.exports = { byName: checkRoleByName };
