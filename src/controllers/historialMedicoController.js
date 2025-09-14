// controllers/historialMedicoController.js
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

class HistorialMedicoController {

  // Obtener historial de un paciente
  async obtenerHistorialPorPaciente(req, res) {
    try {
      const { idpaciente } = req.params;
      console.log('🔍 Obteniendo historial para paciente ID:', idpaciente);
      
      // ✅ VALIDAR QUE EL PACIENTE EXISTA PRIMERO
      const pacienteExiste = await prisma.paciente.findUnique({
        where: { idpaciente: parseInt(idpaciente) }
      });

      if (!pacienteExiste) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }
      
      const historial = await prisma.detallehistorialclinico.findMany({
        where: { 
          fkpaciente: parseInt(idpaciente),
          estado: 1
        },
        include: {
          usuario: {
            select: {
              nombres: true,
              apellidos: true,
              puesto: true
            }
          },
          paciente: {
            select: {
              nombres: true,
              apellidos: true,
              expedientes: {
                select: {
                  numeroexpediente: true
                }
              }
            }
          }
        },
        orderBy: { fechacreacion: 'desc' }
      });
      
      console.log('✅ Registros encontrados:', historial.length);

      return res.status(200).json({
        success: true,
        message: 'Historial obtenido correctamente',
        data: historial,
        total: historial.length
      });

    } catch (error) {
      console.error('❌ Error al obtener historial:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener historial médico',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener info básica del paciente
  async obtenerInfoPaciente(req, res) {
    try {
      const { idpaciente } = req.params;
      console.log('🔍 Obteniendo info del paciente ID:', idpaciente);

      const paciente = await prisma.paciente.findUnique({
        where: { idpaciente: parseInt(idpaciente) },
        select: {
          idpaciente: true,
          nombres: true,
          apellidos: true,
          cui: true,
          rutafotoperfil: true,
          telefono: true,
          email: true,
          fechanacimiento: true,
          expedientes: {
            select: {
              numeroexpediente: true,
              fechacreacion: true
            }
          }
        }
      });

      if (!paciente) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      console.log('✅ Paciente encontrado:', paciente.nombres, paciente.apellidos);

      return res.status(200).json({
        success: true,
        message: 'Información del paciente obtenida correctamente',
        data: paciente
      });

    } catch (error) {
      console.error('❌ Error al obtener paciente:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información del paciente',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Crear nueva sesión
  async crearSesion(req, res) {
    try {
      const { 
        fkpaciente, 
        fkusuario, 
        fecha,
        recordatorio,
        notaconsulta,
        motivoconsulta,
        evolucion,
        diagnosticotratamiento
      } = req.body;

      console.log('🆕 Creando nueva sesión para paciente:', fkpaciente);

      // ✅ VALIDAR QUE EL PACIENTE Y USUARIO EXISTAN
      const [pacienteExiste, usuarioExiste] = await Promise.all([
        prisma.paciente.findUnique({ where: { idpaciente: parseInt(fkpaciente) }}),
        prisma.usuario.findUnique({ where: { idusuario: parseInt(fkusuario) }})
      ]);

      if (!pacienteExiste) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      if (!usuarioExiste) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const usuariocreacion = req.usuario?.usuario || req.usuario?.nombres || 'Sistema';

      const nuevaSesion = await prisma.detallehistorialclinico.create({
        data: {
          fkpaciente: parseInt(fkpaciente),
          fkusuario: parseInt(fkusuario),
          fecha: new Date(fecha),
          recordatorio: recordatorio || null,
          notaconsulta: notaconsulta || null,
          motivoconsulta,
          evolucion: evolucion || null,
          diagnosticotratamiento: diagnosticotratamiento || null,
          usuariocreacion,
          fechacreacion: new Date(),
          estado: 1
        },
        include: {
          usuario: {
            select: {
              nombres: true,
              apellidos: true,
              puesto: true
            }
          },
          paciente: {
            select: {
              nombres: true,
              apellidos: true
            }
          }
        }
      });

      console.log('✅ Sesión creada con ID:', nuevaSesion.idhistorial);

      return res.status(201).json({
        success: true,
        message: 'Sesión de historial creada correctamente',
        data: nuevaSesion
      });

    } catch (error) {
      console.error('❌ Error al crear sesión:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear sesión de historial médico',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Actualizar sesión
  async actualizarSesion(req, res) {
    try {
      const { idhistorial } = req.params;
      const { 
        recordatorio,
        notaconsulta,
        motivoconsulta,
        evolucion,
        diagnosticotratamiento
      } = req.body;

      console.log('🔄 Actualizando sesión ID:', idhistorial);

      // ✅ VERIFICAR QUE LA SESIÓN EXISTA
      const sesionExiste = await prisma.detallehistorialclinico.findUnique({
        where: { idhistorial: parseInt(idhistorial) }
      });

      if (!sesionExiste) {
        return res.status(404).json({
          success: false,
          message: 'Sesión de historial no encontrada'
        });
      }

      const usuariomodificacion = req.usuario?.usuario || req.usuario?.nombres || 'Sistema';

      const sesionActualizada = await prisma.detallehistorialclinico.update({
        where: { idhistorial: parseInt(idhistorial) },
        data: {
          recordatorio,
          notaconsulta,
          motivoconsulta,
          evolucion,
          diagnosticotratamiento,
          usuariomodificacion,
          fechamodificacion: new Date()
        },
        include: {
          usuario: {
            select: {
              nombres: true,
              apellidos: true,
              puesto: true
            }
          },
          paciente: {
            select: {
              nombres: true,
              apellidos: true
            }
          }
        }
      });

      console.log('✅ Sesión actualizada correctamente');

      return res.status(200).json({
        success: true,
        message: 'Sesión actualizada correctamente',
        data: sesionActualizada
      });

    } catch (error) {
      console.error('❌ Error al actualizar sesión:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar sesión',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Subir archivos para historial médico
  async subirArchivos(req, res) {
    try {
      const { idpaciente } = req.params;
      const archivos = req.files;

      console.log('📎 Subiendo archivos para paciente:', idpaciente);

      if (!archivos || archivos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se enviaron archivos para subir'
        });
      }

      // ✅ VERIFICAR QUE EL PACIENTE EXISTA
      const pacienteExiste = await prisma.paciente.findUnique({
        where: { idpaciente: parseInt(idpaciente) }
      });

      if (!pacienteExiste) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      const archivosInfo = archivos.map(archivo => ({
        nombreOriginal: archivo.originalname,
        nombreArchivo: archivo.filename,
        rutaArchivo: archivo.path,
        url: `/uploads/${archivo.filename}`,
        tamaño: archivo.size,
        tipo: archivo.mimetype
      }));

      console.log(`✅ ${archivos.length} archivos subidos correctamente`);

      return res.status(201).json({
        success: true,
        message: `${archivos.length} archivo(s) subido(s) correctamente`,
        data: {
          pacienteId: parseInt(idpaciente),
          archivos: archivosInfo,
          total: archivos.length
        }
      });

    } catch (error) {
      console.error('❌ Error al subir archivos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al subir archivos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

}

module.exports = new HistorialMedicoController();