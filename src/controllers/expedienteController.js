// controllers/expedienteController.js
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

class ExpedienteController {
  /**
   * Obtiene todos los expedientes con paginación y búsqueda
   */
  static async obtenerTodosLosExpedientes(req, res) {
    try {
      const { pagina = 1, limite = 10, busqueda = '' } = req.query;
      const saltar = (parseInt(pagina) - 1) * parseInt(limite);

      const condicionBusqueda = busqueda ? {
        OR: [
          { numeroexpediente: { contains: busqueda, mode: 'insensitive' } },
          { historiaenfermedad: { contains: busqueda, mode: 'insensitive' } }
        ]
      } : {};

      const [expedientes, total] = await Promise.all([
        prisma.expediente.findMany({
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
            paciente: {
              select: {
                idpaciente: true,
                nombres: true,
                apellidos: true,
                cui: true
              }
            }
          }
        }),
        prisma.expediente.count({
          where: {
            estado: 1,
            ...condicionBusqueda
          }
        })
      ]);

      res.json({
        exito: true,
        datos: expedientes,
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
   * Obtiene un expediente específico por su ID
   */
  static async obtenerExpedientePorId(req, res) {
    try {
      const { id } = req.params;

      const expediente = await prisma.expediente.findFirst({
        where: {
          idexpediente: parseInt(id),
          estado: 1
        },
        include: {
          paciente: {
            select: {
              idpaciente: true,
              nombres: true,
              apellidos: true,
              cui: true,
              fechanacimiento: true,
              genero: true
            }
          },
          detallereferirpaciente: {
            select: {
              idrefpaciente: true,
              comentario: true,
              fechacreacion: true,
              clinica: {
                select: {
                  idclinica: true,
                  nombreclinica: true
                }
              }
            }
          }
        }
      });

      if (!expediente) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Expediente no encontrado'
        });
      }

      res.json({
        exito: true,
        datos: expediente
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
   * Crea un nuevo expediente médico
   */
  static async crearExpediente(req, res) {
    try {
      const {
        fkpaciente,
        numeroexpediente,
        generarAutomatico = false,
        historiaenfermedad,
        antmedico,
        antmedicamento,
        anttraumaticos,
        antfamiliar,
        antalergico,
        antmedicamentos,
        antsustancias,
        antintolerantelactosa,
        antfisoinmunizacion,
        antfisocrecimiento,
        antfisohabitos,
        antfisoalimentos,
        gineobsprenatales,
        gineobsnatales,
        gineobspostnatales,
        gineobsgestas,
        gineobspartos,
        gineobsabortos,
        gineobscesareas,
        gineobshv,
        gineobsmh,
        gineobsfur,
        gineobsciclos,
        gineobsmenarquia,
        examenfistc,
        examenfispa,
        examenfisfc,
        examenfisfr,
        examenfissao2,
        examenfispeso,
        examenfistalla,
        examenfisimc,
        examenfisgmt
      } = req.body;

      const usuario = req.usuario?.usuario || 'sistema';
      let numeroExpedienteFinal;

      // Determinar el número de expediente
      if (generarAutomatico || !numeroexpediente || numeroexpediente.trim() === '') {
        numeroExpedienteFinal = await ExpedienteController._generarNumeroAutomatico();
      } else {
        numeroExpedienteFinal = numeroexpediente.trim();
        
        const expedienteExistente = await prisma.expediente.findUnique({
          where: { numeroexpediente: numeroExpedienteFinal }
        });

        if (expedienteExistente) {
          return res.status(400).json({
            exito: false,
            mensaje: 'Ya existe un expediente con ese número'
          });
        }
      }

      const expediente = await prisma.expediente.create({
        data: {
          fkpaciente: fkpaciente ? parseInt(fkpaciente) : null,
          numeroexpediente: numeroExpedienteFinal,
          historiaenfermedad,
          antmedico,
          antmedicamento,
          anttraumaticos,
          antfamiliar,
          antalergico,
          antmedicamentos,
          antsustancias,
          antintolerantelactosa: parseInt(antintolerantelactosa) || 0,
          antfisoinmunizacion,
          antfisocrecimiento,
          antfisohabitos,
          antfisoalimentos,
          gineobsprenatales,
          gineobsnatales,
          gineobspostnatales,
          gineobsgestas: parseInt(gineobsgestas) || null,
          gineobspartos: parseInt(gineobspartos) || null,
          gineobsabortos: parseInt(gineobsabortos) || null,
          gineobscesareas: parseInt(gineobscesareas) || null,
          gineobshv,
          gineobsmh,
          gineobsfur: gineobsfur ? new Date(gineobsfur) : null,
          gineobsciclos,
          gineobsmenarquia,
          examenfistc: examenfistc ? parseFloat(examenfistc) : null,
          examenfispa,
          examenfisfc: parseInt(examenfisfc) || null,
          examenfisfr: parseInt(examenfisfr) || null,
          examenfissao2: examenfissao2 ? parseFloat(examenfissao2) : null,
          examenfispeso: examenfispeso ? parseFloat(examenfispeso) : null,
          examenfistalla: examenfistalla ? parseFloat(examenfistalla) : null,
          examenfisimc: examenfisimc ? parseFloat(examenfisimc) : null,
          examenfisgmt,
          usuariocreacion: usuario,
          estado: 1
        }
      });

      res.status(201).json({
        exito: true,
        mensaje: `Expediente creado exitosamente con número: ${numeroExpedienteFinal}`,
        datos: expediente
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
   * Actualiza un expediente existente
   */
  static async actualizarExpediente(req, res) {
    try {
      const { id } = req.params;
      const usuario = req.usuario?.usuario || 'sistema';
      const datosActualizacion = { ...req.body };

      const expedienteExistente = await prisma.expediente.findFirst({
        where: {
          idexpediente: parseInt(id),
          estado: 1
        }
      });

      if (!expedienteExistente) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Expediente no encontrado'
        });
      }

      // Verificar si el número de expediente ya existe
      if (datosActualizacion.numeroexpediente && 
          datosActualizacion.numeroexpediente !== expedienteExistente.numeroexpediente) {
        const numeroExiste = await prisma.expediente.findFirst({
          where: { 
            numeroexpediente: datosActualizacion.numeroexpediente,
            idexpediente: { not: parseInt(id) }
          }
        });

        if (numeroExiste) {
          return res.status(400).json({
            exito: false,
            mensaje: 'Ya existe un expediente con ese número'
          });
        }
      }

      // Convertir fecha si existe
      if (datosActualizacion.gineobsfur) {
        datosActualizacion.gineobsfur = new Date(datosActualizacion.gineobsfur);
      }

      // Procesar campos numéricos y decimales
      const camposNumericos = ['antintolerantelactosa', 'gineobsgestas', 'gineobspartos', 
                              'gineobsabortos', 'gineobscesareas', 'examenfisfc', 'examenfisfr'];
      const camposDecimales = ['examenfistc', 'examenfissao2', 'examenfispeso', 
                              'examenfistalla', 'examenfisimc'];

      camposNumericos.forEach(campo => {
        if (datosActualizacion[campo] !== undefined && 
            datosActualizacion[campo] !== null && 
            datosActualizacion[campo] !== '') {
          datosActualizacion[campo] = parseInt(datosActualizacion[campo]);
        }
      });

      camposDecimales.forEach(campo => {
        if (datosActualizacion[campo] !== undefined && 
            datosActualizacion[campo] !== null && 
            datosActualizacion[campo] !== '') {
          datosActualizacion[campo] = parseFloat(datosActualizacion[campo]);
        }
      });

      const expedienteActualizado = await prisma.expediente.update({
        where: {
          idexpediente: parseInt(id)
        },
        data: {
          ...datosActualizacion,
          usuariomodificacion: usuario,
          fechamodificacion: new Date()
        }
      });

      res.json({
        exito: true,
        mensaje: 'Expediente actualizado exitosamente',
        datos: expedienteActualizado
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
   * Elimina lógicamente un expediente
   */
  static async eliminarExpediente(req, res) {
    try {
      const { id } = req.params;
      const usuario = req.usuario?.usuario || 'sistema';

      const expedienteExistente = await prisma.expediente.findFirst({
        where: {
          idexpediente: parseInt(id),
          estado: 1
        }
      });

      if (!expedienteExistente) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Expediente no encontrado'
        });
      }

      // Verificar si tiene referencias asociadas
      const referenciasAsociadas = await prisma.detallereferirpaciente.count({
        where: {
          fkexpediente: parseInt(id),
          estado: 1
        }
      });

      if (referenciasAsociadas > 0) {
        return res.status(400).json({
          exito: false,
          mensaje: 'No se puede eliminar el expediente porque tiene referencias asociadas'
        });
      }

      await prisma.expediente.update({
        where: {
          idexpediente: parseInt(id)
        },
        data: {
          estado: 0,
          usuariomodificacion: usuario,
          fechamodificacion: new Date()
        }
      });

      res.json({
        exito: true,
        mensaje: 'Expediente eliminado exitosamente'
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
   * Obtiene estadísticas básicas de los expedientes
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const [
        totalExpedientes,
        expedientesRecientes,
        expedientesConPacientes,
        expedientesSinPacientes
      ] = await Promise.all([
        prisma.expediente.count({
          where: { estado: 1 }
        }),
        
        prisma.expediente.count({
          where: {
            estado: 1,
            fechacreacion: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),

        prisma.expediente.count({
          where: {
            estado: 1,
            fkpaciente: {
              not: null
            }
          }
        }),

        prisma.expediente.count({
          where: {
            estado: 1,
            fkpaciente: null
          }
        })
      ]);

      res.json({
        exito: true,
        datos: {
          totalExpedientes,
          expedientesRecientes,
          expedientesConPacientes,
          expedientesSinPacientes
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
   * Obtiene expedientes disponibles (sin paciente asignado)
   */
  static async obtenerExpedientesDisponibles(req, res) {
    try {
      const expedientesDisponibles = await prisma.expediente.findMany({
        where: {
          estado: 1,
          fkpaciente: null
        },
        select: {
          idexpediente: true,
          numeroexpediente: true,
          historiaenfermedad: true,
          fechacreacion: true
        },
        orderBy: {
          numeroexpediente: 'asc'
        }
      });

      res.json({
        exito: true,
        datos: expedientesDisponibles
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
   * Genera y devuelve un número de expediente automático
   */
  static async generarNumeroExpediente(req, res) {
    try {
      const nuevoNumero = await ExpedienteController._generarNumeroAutomatico();

      res.json({
        exito: true,
        datos: { numeroexpediente: nuevoNumero }
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
   * Método privado para generar número de expediente automáticamente
   */
  static async _generarNumeroAutomatico() {
    try {
      const ultimoExpediente = await prisma.expediente.findFirst({
        orderBy: {
          idexpediente: 'desc'
        },
        select: {
          numeroexpediente: true
        }
      });

      let nuevoNumero;
      
      if (ultimoExpediente && ultimoExpediente.numeroexpediente) {
        const coincidencia = ultimoExpediente.numeroexpediente.match(/EXP-(\d+)/);
        
        if (coincidencia) {
          const ultimoNumero = parseInt(coincidencia[1]);
          nuevoNumero = `EXP-${String(ultimoNumero + 1).padStart(6, '0')}`;
        } else {
          const numeros = ultimoExpediente.numeroexpediente.replace(/\D/g, '');
          const ultimoNumero = numeros ? parseInt(numeros) : 0;
          nuevoNumero = `EXP-${String(ultimoNumero + 1).padStart(6, '0')}`;
        }
      } else {
        nuevoNumero = 'EXP-000001';
      }

      // Verificar que el número generado no exista
      const existe = await prisma.expediente.findUnique({
        where: { numeroexpediente: nuevoNumero }
      });

      if (existe) {
        nuevoNumero = `EXP-${Date.now()}`;
      }

      return nuevoNumero;
    } catch (error) {
      return `EXP-${Date.now()}`;
    }
  }
}

module.exports = ExpedienteController;