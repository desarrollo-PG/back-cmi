
const { prisma } = require('../config/prisma');
const { tienePermiso } = require('./checkPermiso');

const validarReferido = {

  validarCreacion: async (req, res, next) => {
    try {
      const {
        fkpaciente,
        fkexpediente,
        fkclinica
      } = req.body;

      const errores = [];

      if (!fkpaciente) errores.push('fkpaciente es requerido');
      if (!fkexpediente) errores.push('fkexpediente es requerido');
      if (!fkclinica) errores.push('fkclinica es requerido');

      if (fkpaciente && !Number.isInteger(Number(fkpaciente))) {
        errores.push('fkpaciente debe ser un número entero');
      }
      if (fkexpediente && !Number.isInteger(Number(fkexpediente))) {
        errores.push('fkexpediente debe ser un número entero');
      }
      if (fkclinica && !Number.isInteger(Number(fkclinica))) {
        errores.push('fkclinica debe ser un número entero');
      }

      if (errores.length > 0) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Errores de validación',
          errores
        });
      }

      next();

    } catch (error) {
      console.error('Error en validarCreacion:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error en validación',
        error: error.message
      });
    }
  },

  validarExistencia: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({
          ok: false,
          mensaje: 'ID de referido inválido'
        });
      }

      const referido = await prisma.detallereferirpaciente.findFirst({
        where: {
          idrefpaciente: Number(id),
          estado: 1
        }
      });

      if (!referido) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Referido no encontrado o inactivo'
        });
      }

      req.referido = referido;
      next();

    } catch (error) {
      console.error('Error en validarExistencia:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al validar existencia del referido',
        error: error.message
      });
    }
  },

  validarPermisoVer: async (req, res, next) => {
    try {
      const referido = req.referido;
      const usuario = req.usuario;

      if (!referido) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Referido no encontrado'
        });
      }

      const usuarioConRol = await prisma.usuario.findUnique({
        where: { idusuario: usuario.idusuario },
        include: { rol: true }
      });

      const esAdmin = usuarioConRol.rol.nombre.toLowerCase().includes('admin');
      const esCreador = referido.fkusuario === usuario.idusuario;
      const esDeClinicaDestino = usuarioConRol.fkclinica === referido.fkclinica;

      if (!esAdmin && !esCreador && !esDeClinicaDestino) {  
        return res.status(403).json({
          ok: false,
          mensaje: 'No tiene permisos para ver este referido'
        });
      }

      next();

    } catch (error) {
      console.error('Error en validarPermisoVer:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al validar permisos',
        error: error.message
      });
    }
  },

validarPermisoConfirmar: async (req, res, next) => {
  try {
    const referido = req.referido;
    const usuario = req.usuario;

    if (!referido) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Referido no encontrado'
      });
    }

    if (referido.confirmacion4 === 1) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Este referido ya fue completado'
      });
    }

    const usuarioConRol = await prisma.usuario.findUnique({
      where: { idusuario: usuario.idusuario },
      include: { rol: true }
    });

    const esAdmin = await tienePermiso(usuarioConRol.fkrol, 'referidos-autorizar');

    if (referido.confirmacion2 === 0 && referido.confirmacion1 === 1) {
      if (!esAdmin) {
        return res.status(403).json({
          ok: false,
          mensaje: 'Solo administradores pueden aprobar en esta etapa (Confirmación 2)'
        });
      }
      return next();
    } 
    
    else if (referido.confirmacion3 === 0 && referido.confirmacion2 === 1) {
      if (!esAdmin) {
        return res.status(403).json({
          ok: false,
          mensaje: 'Solo administradores pueden aprobar en esta etapa (Confirmación 3)'
        });
      }
      
      if (referido.usuarioconfirma2 === usuario.usuario) {
        return res.status(400).json({
          ok: false,
          mensaje: 'No puede aprobar dos veces el mismo referido'
        });
      }
      return next();
    } 
    
    else if (referido.confirmacion4 === 0 && referido.confirmacion3 === 1) {
      
      if (usuarioConRol.fkclinica !== referido.fkclinica) {
        return res.status(403).json({
          ok: false,
          mensaje: 'Solo usuarios asignados a la clínica destino pueden aprobar esta etapa final'
        });
      }
      
      return next();
    } 
    else {
      
      return res.status(400).json({
        ok: false,
        mensaje: 'No se puede aprobar en esta etapa del referido'
      });
    }

  } catch (error) {
    console.error('ERROR en validarPermisoConfirmar:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al validar permisos de confirmación',
      error: error.message
    });
  }
},

validarPermisoActualizar: async (req, res, next) => {
  try {
    const referido = req.referido;
    const usuario = req.usuario;

    if (!referido) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Referido no encontrado'
      });
    }

    if (referido.confirmacion4 === 1) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se puede modificar un referido completado'
      });
    }
    
    const usuarioConRol = await prisma.usuario.findUnique({
      where: { idusuario: usuario.idusuario },
      include: { rol: true }
    });

    const esAdmin = await tienePermiso(usuarioConRol.fkrol, 'referidos-autorizar');
    const esCreador = referido.fkusuario === usuario.idusuario;

    const esEtapa4 = referido.confirmacion3 === 1 && referido.confirmacion4 === 0;
    const soloActualizaDocumentoFinal = req.body.rutadocumentofinal !== undefined && 
                                       Object.keys(req.body).length === 1;
    
    if (esEtapa4 && soloActualizaDocumentoFinal) {
      if (usuarioConRol.fkclinica !== referido.fkclinica && !esAdmin) {
        return res.status(403).json({
          ok: false,
          mensaje: 'Solo usuarios de la clínica destino pueden subir el documento final'
        });
      }
      
      return next();
    }

    if (!esAdmin && !esCreador) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Solo el creador del referido o un administrador pueden modificarlo'
      });
    }

    next();

  } catch (error) {
    console.error('Error en validarPermisoActualizar:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al validar permisos de actualización',
      error: error.message
    });
  }
},

validarDatosActualizacion: (req, res, next) => {
    try {
      const { fkclinica, comentario, rutadocumentoinicial, rutadocumentofinal } = req.body;

      if (fkclinica === undefined && comentario === undefined && rutadocumentoinicial === undefined && rutadocumentofinal === undefined) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Debe proporcionar al menos un campo para actualizar'
        });
      }

      if (fkclinica && !Number.isInteger(Number(fkclinica))) {
        return res.status(400).json({
          ok: false,
          mensaje: 'fkclinica debe ser un número entero'
        });
      }

      next();

    } catch (error) {
      console.error('Error en validarDatosActualizacion:', error);
      return res.status(500).json({
        ok: false,
        mensaje: 'Error en validación de datos',
        error: error.message
      });
    }
  },

};

module.exports = validarReferido;