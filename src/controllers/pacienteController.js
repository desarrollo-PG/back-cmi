// controllers/pacienteController.js
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

class PacienteController {
  /**
   * Obtiene todos los pacientes con paginación y búsqueda
   */
  static async obtenerTodosLosPacientes(req, res) {
    try {
      const { pagina = 1, limite = 10, busqueda = '' } = req.query;
      const saltar = (parseInt(pagina) - 1) * parseInt(limite);

      const condicionBusqueda = busqueda ? {
        OR: [
          { nombres: { contains: busqueda, mode: 'insensitive' } },
          { apellidos: { contains: busqueda, mode: 'insensitive' } },
          { cui: { contains: busqueda, mode: 'insensitive' } }
        ]
      } : {};

      const [pacientes, total] = await Promise.all([
        prisma.paciente.findMany({
          where: {
            estado: 1,
            ...condicionBusqueda
          },
          skip: saltar,
          take: parseInt(limite),
          orderBy: {
            fechacreacion: 'desc'
          },
          include: {
            expedientes: {
              select: {
                idexpediente: true,
                numeroexpediente: true,
                historiaenfermedad: true
              }
            }
          }
        }),
        prisma.paciente.count({
          where: {
            estado: 1,
            ...condicionBusqueda
          }
        })
      ]);

      res.json({
        exito: true,
        datos: pacientes,
        paginacion: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total,
          totalPaginas: Math.ceil(total / parseInt(limite))
        }
      });
    } catch (error) {
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtiene un paciente específico por su ID
   */
  static async obtenerPacientePorId(req, res) {
    try {
      const { id } = req.params;

      const paciente = await prisma.paciente.findFirst({
        where: {
          idpaciente: parseInt(id),
          estado: 1
        },
        include: {
          expedientes: {
            select: {
              idexpediente: true,
              numeroexpediente: true,
              historiaenfermedad: true,
              fechacreacion: true
            }
          }
        }
      });

      if (!paciente) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Paciente no encontrado'
        });
      }

      res.json({
        exito: true,
        datos: paciente
      });
    } catch (error) {
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Crea un nuevo paciente en el sistema
   */
  static async crearPaciente(req, res) {
    try {
      const {
        nombres,
        apellidos,
        cui,
        fechanacimiento,
        genero,
        tipoconsulta,
        tipodiscapacidad,
        telefonopersonal,
        nombrecontactoemergencia,
        telefonoemergencia,
        nombreencargado,
        dpiencargado,
        telefonoencargado,
        municipio,
        aldea,
        direccion
      } = req.body;

      const usuario = req.usuario?.usuario || 'sistema';

      // Verificar que el CUI no exista
      const pacienteExistente = await prisma.paciente.findUnique({
        where: { cui }
      });

      if (pacienteExistente) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Ya existe un paciente con ese CUI'
        });
      }

      const paciente = await prisma.paciente.create({
        data: {
          nombres,
          apellidos,
          cui,
          fechanacimiento: new Date(fechanacimiento),
          genero,
          tipoconsulta,
          tipodiscapacidad: tipodiscapacidad || 'Ninguna',
          telefonopersonal,
          nombrecontactoemergencia,
          telefonoemergencia,
          nombreencargado,
          dpiencargado,
          telefonoencargado,
          municipio,
          aldea,
          direccion,
          usuariocreacion: usuario,
          estado: 1
        }
      });

      res.status(201).json({
        exito: true,
        mensaje: 'Paciente creado exitosamente',
        datos: paciente
      });
    } catch (error) {
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualiza la información de un paciente existente
   */
  static async actualizarPaciente(req, res) {
    try {
      const { id } = req.params;
      const usuario = req.usuario?.usuario || 'sistema';
      const datosActualizacion = { ...req.body };

      // Verificar que el paciente existe
      const pacienteExistente = await prisma.paciente.findFirst({
        where: {
          idpaciente: parseInt(id),
          estado: 1
        }
      });

      if (!pacienteExistente) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Paciente no encontrado'
        });
      }

      // Verificar unicidad del CUI si se está actualizando
      if (datosActualizacion.cui && datosActualizacion.cui !== pacienteExistente.cui) {
        const cuiExiste = await prisma.paciente.findFirst({
          where: { 
            cui: datosActualizacion.cui,
            idpaciente: { not: parseInt(id) }
          }
        });

        if (cuiExiste) {
          return res.status(400).json({
            exito: false,
            mensaje: 'Ya existe un paciente con ese CUI'
          });
        }
      }

      // Procesar fecha de nacimiento si está presente
      if (datosActualizacion.fechanacimiento) {
        datosActualizacion.fechanacimiento = new Date(datosActualizacion.fechanacimiento);
      }

      const pacienteActualizado = await prisma.paciente.update({
        where: {
          idpaciente: parseInt(id)
        },
        data: {
          ...datosActualizacion,
          usuariomodificacion: usuario,
          fechamodificacion: new Date()
        }
      });

      res.json({
        exito: true,
        mensaje: 'Paciente actualizado exitosamente',
        datos: pacienteActualizado
      });
    } catch (error) {
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Elimina lógicamente un paciente del sistema
   */
  static async eliminarPaciente(req, res) {
    try {
      const { id } = req.params;
      const usuario = req.usuario?.usuario || 'sistema';

      const pacienteExistente = await prisma.paciente.findFirst({
        where: {
          idpaciente: parseInt(id),
          estado: 1
        }
      });

      if (!pacienteExistente) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Paciente no encontrado'
        });
      }

      // Verificar si tiene expedientes asociados
      const expedientesAsociados = await prisma.expediente.count({
        where: {
          fkpaciente: parseInt(id),
          estado: 1
        }
      });

      if (expedientesAsociados > 0) {
        return res.status(400).json({
          exito: false,
          mensaje: 'No se puede eliminar el paciente porque tiene expedientes asociados'
        });
      }

      await prisma.paciente.update({
        where: {
          idpaciente: parseInt(id)
        },
        data: {
          estado: 0,
          usuariomodificacion: usuario,
          fechamodificacion: new Date()
        }
      });

      res.json({
        exito: true,
        mensaje: 'Paciente eliminado exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas básicas de los pacientes
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const [
        totalPacientes,
        pacientesPorGenero,
        pacientesRecientes,
        pacientesConExpedientes
      ] = await Promise.all([
        prisma.paciente.count({
          where: { estado: 1 }
        }),
        
        prisma.paciente.groupBy({
          by: ['genero'],
          where: { estado: 1 },
          _count: {
            genero: true
          }
        }),

        prisma.paciente.count({
          where: {
            estado: 1,
            fechacreacion: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),

        prisma.paciente.count({
          where: {
            estado: 1,
            expedientes: {
              some: {
                estado: 1
              }
            }
          }
        })
      ]);

      res.json({
        exito: true,
        datos: {
          totalPacientes,
          pacientesPorGenero,
          pacientesRecientes,
          pacientesConExpedientes
        }
      });
    } catch (error) {
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtiene la lista de pacientes disponibles para asignación
   */
  static async obtenerPacientesDisponibles(req, res) {
    try {
      const pacientesDisponibles = await prisma.paciente.findMany({
        where: {
          estado: 1
        },
        select: {
          idpaciente: true,
          nombres: true,
          apellidos: true,
          cui: true,
          fechanacimiento: true,
          genero: true
        },
        orderBy: [
          { apellidos: 'asc' },
          { nombres: 'asc' }
        ]
      });

      res.json({
        exito: true,
        datos: pacientesDisponibles
      });
    } catch (error) {
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = PacienteController;