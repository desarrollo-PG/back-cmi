
const { prisma } = require('../config/prisma');
const { tienePermiso } = require('../middlewares/checkPermiso');

const referirService = {

  async crearReferido(datos, tx = null) {
    try {
      const prismaClient = tx || prisma;
      const {
        fkusuario,
        fkpaciente,
        fkexpediente,
        fkclinica,
        comentario,
        usuariocreacion
      } = datos;

      const paciente = await prismaClient.paciente.findUnique({
        where: { idpaciente: fkpaciente, estado: 1 }
      });

      if (!paciente) {
        throw new Error('Paciente no encontrado o inactivo');
      }

      const expediente = await prismaClient.expediente.findFirst({
        where: {
          idexpediente: fkexpediente,
          fkpaciente: fkpaciente,
          estado: 1
        }
      });

      if (!expediente) {
        throw new Error('Expediente no encontrado o no pertenece al paciente');
      }

      const clinica = await prismaClient.clinica.findUnique({
        where: { idclinica: fkclinica, estado: 1 }
      });

      if (!clinica) {
        throw new Error('Clínica no encontrada o inactiva');
      }

      const usuariosClinica = await prismaClient.usuario.count({
        where: {
          fkclinica: fkclinica,
          estado: 1
        }
      });

      if (usuariosClinica === 0) {
        throw new Error(`No hay usuarios asignados a la clínica ${clinica.nombreclinica}`);
      }

      const nuevoReferido = await prismaClient.detallereferirpaciente.create({
        data: {
          fkusuario,
          fkpaciente,
          fkexpediente,
          fkclinica,
          comentario,
          confirmacion1: 1,
          usuarioconfirma1: usuariocreacion,
          confirmacion2: 0,
          confirmacion3: 0,
          confirmacion4: 0,
          usuariocreacion,
          estado: 1
        }
      });

      return nuevoReferido;

    } catch (error) {
      console.error('Error en crearReferido service:', error);
      throw error;
    }
  },

  async obtenerReferidos({ tipo, usuario, search, page, limit }) {
    try {
      const skip = (page - 1) * limit;
      
      let whereClause = {
        estado: 1
      };

      const usuarioConRol = await prisma.usuario.findUnique({
        where: { idusuario: usuario.idusuario },
        include: { rol: true }
      });

      const esAdmin = usuarioConRol?.rol?.nombre?.toLowerCase().includes('admin');

      switch (tipo) {
        case 'pendientes':
          if (esAdmin) {
            whereClause.OR = [
              { confirmacion2: 0, confirmacion1: 1 },
              { confirmacion3: 0, confirmacion1: 1, confirmacion2: 1 }
            ];
          } else {
            whereClause.fkclinica = usuarioConRol.fkclinica;
            whereClause.confirmacion4 = 0;
            whereClause.confirmacion3 = 1;
          }
          break;

        case 'recibidos':
          whereClause.fkclinica = usuarioConRol.fkclinica;
          break;

        case 'completados':
          whereClause.confirmacion1 = 1;
          whereClause.confirmacion2 = 1;
          whereClause.confirmacion3 = 1;
          whereClause.confirmacion4 = 1;
          
          if (!esAdmin) {
            whereClause.OR = [
              { fkusuario: usuario.idusuario },
              { fkclinica: usuarioConRol.fkclinica } 
            ];
          }
          break;

        default:
          if (!esAdmin) {
            whereClause.OR = [
              { fkusuario: usuario.idusuario },
              { fkclinica: usuarioConRol.fkclinica } 
            ];
          }
      }

      if (search) {
        whereClause.paciente = {
          OR: [
            { nombres: { contains: search, mode: 'insensitive' } },
            { apellidos: { contains: search, mode: 'insensitive' } },
            { cui: { contains: search, mode: 'insensitive' } }
          ]
        };
      }

      const [referidos, total] = await Promise.all([
        prisma.detallereferirpaciente.findMany({
          where: whereClause,
          include: {
            paciente: {
              select: {
                idpaciente: true,
                nombres: true,
                apellidos: true,
                cui: true,
                fechanacimiento: true
              }
            },
            clinica: {
              select: {
                idclinica: true,
                nombreclinica: true
              }
            },
            usuario: {
              select: {
                idusuario: true,
                nombres: true,
                apellidos: true,
                profesion: true
              }
            }
          },
          orderBy: {
            fechacreacion: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.detallereferirpaciente.count({ where: whereClause })
      ]);

      return {
        data: referidos,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Error en obtenerReferidos service:', error);
      throw error;
    }
  },

  async obtenerReferidoPorId(id, usuario) {
    try {
      const referido = await prisma.detallereferirpaciente.findFirst({
        where: {
          idrefpaciente: id,
          estado: 1
        },
        include: {
          paciente: true,
          expediente: true,
          clinica: true,
          usuario: {
            select: {
              idusuario: true,
              nombres: true,
              apellidos: true,
              profesion: true,
              correo: true
            }
          }
        }
      });

      if (!referido) {
        return null;
      }

      const usuarioConRol = await prisma.usuario.findUnique({
        where: { idusuario: usuario.idusuario },
        include: { rol: true }
      });

      const esAdmin = usuarioConRol?.rol?.nombre?.toLowerCase().includes('admin');
      const esInvolucrado = 
      referido.fkusuario === usuario.idusuario || 
      usuarioConRol.fkclinica === referido.fkclinica;

      if (!esAdmin && !esInvolucrado) {
        throw new Error('No tiene permisos para ver este referido');
      }

      return referido;

    } catch (error) {
      console.error('Error en obtenerReferidoPorId service:', error);
      throw error;
    }
  },

  async confirmarReferido(id, usuario, comentarioAdicional) {
    try {
      
      const referido = await prisma.detallereferirpaciente.findFirst({
        where: {
          idrefpaciente: id,
          estado: 1
        }
      });

      if (!referido) {
        throw new Error('Referido no encontrado');
      }

      if (referido.confirmacion4 === 1) {
        throw new Error('Este referido ya fue completado');
      }

      const usuarioConRol = await prisma.usuario.findUnique({
        where: { idusuario: usuario.idusuario },
        include: { rol: true, clinica: true }
      });

      const esAdmin = await tienePermiso(usuarioConRol.fkrol, 'referidos-autorizar');
      const usuarioNombre = usuario.usuario;
      let campoActualizar = {};
      let mensaje = '';

      if (referido.confirmacion2 === 0 && referido.confirmacion1 === 1) {
        if (!esAdmin) {
          throw new Error('Solo administradores pueden aprobar en esta etapa');
        }
        campoActualizar = {
          confirmacion2: 1,
          usuarioconfirma2: usuarioNombre,
          usuariomodificacion: usuarioNombre,
          fechamodificacion: new Date()
        };
        mensaje = ' Confirmación administrativa 1 registrada correctamente';

      } 
      
      else if (referido.confirmacion3 === 0 && referido.confirmacion2 === 1) {
        if (!esAdmin) {
          throw new Error('Solo administradores pueden aprobar en esta etapa');
        }
        if (referido.usuarioconfirma2 === usuarioNombre) {
          throw new Error('No puede aprobar dos veces el mismo referido');
        }
        campoActualizar = {
          confirmacion3: 1,
          usuarioconfirma3: usuarioNombre,
          usuariomodificacion: usuarioNombre,
          fechamodificacion: new Date()
        };
        mensaje = 'Confirmación administrativa 2 registrada correctamente';

      } 
      
    else if (referido.confirmacion4 === 0 && referido.confirmacion3 === 1) {
      if (!referido.rutadocumentofinal) {
        throw new Error('Debe subir el documento final antes de aprobar');
      }

      if (usuarioConRol.fkclinica !== referido.fkclinica) {
        throw new Error('Solo usuarios asignados a la clínica destino pueden aprobar esta etapa');
      }
      campoActualizar = {
        confirmacion4: 1,
        usuarioconfirma4: usuarioNombre,
        usuariomodificacion: usuarioNombre,
        fechamodificacion: new Date()
      };
      mensaje = 'Referido completado exitosamente. Paciente transferido a nueva clínica.';

    } else {
      throw new Error('No se puede aprobar en esta etapa');
    }

    if (comentarioAdicional) {
      const comentarioActual = referido.comentario || '';
      campoActualizar.comentario = comentarioActual 
        ? `${comentarioActual}\n---\n${usuarioNombre}: ${comentarioAdicional}`
        : comentarioAdicional;
    }

    console.log('💾 Actualizando referido en BD...');
    const referidoActualizado = await prisma.detallereferirpaciente.update({
      where: { idrefpaciente: id },
      data: campoActualizar,
      include: {
        paciente: true,
        clinica: true,
        usuario: {
          select: {
            nombres: true,
            apellidos: true
          }
        }
      }
    });

    // ✅ NUEVO: Si se completó el referido (confirmacion4), actualizar la clínica del paciente
    if (referidoActualizado.confirmacion4 === 1) {
      console.log('🏥 Transfiriendo paciente a nueva clínica...');
      await prisma.paciente.update({
        where: { idpaciente: referidoActualizado.fkpaciente },
        data: {
          fkclinica: referidoActualizado.fkclinica,
          usuariomodificacion: usuarioNombre,
          fechamodificacion: new Date()
        }
      });
      console.log('✅ Paciente transferido exitosamente a clínica:', referidoActualizado.clinica.nombreclinica);
    }

    console.log('✅ Referido actualizado exitosamente');
    return {
      referido: referidoActualizado,
      mensaje
    };

    } catch (error) {
      console.error('💥 ERROR en confirmarReferido service:', error);
      throw error;
    }
  },

  async actualizarReferido(id, datos, usuario, usuarioModificador, tx = null) {
    try {
      const prismaClient = tx || prisma;
      const referido = await prismaClient.detallereferirpaciente.findFirst({
        where: {
          idrefpaciente: id,
          estado: 1
        }
      });

      if (!referido) {
        throw new Error('Referido no encontrado');
      }

      const usuarioConRol = await prismaClient.usuario.findUnique({
        where: { idusuario: usuario.idusuario },
        include: { rol: true }
      });

      const esAdmin = await tienePermiso(usuarioConRol.fkrol, 'referidos-autorizar');
      const esCreador = referido.fkusuario === usuario.idusuario;

      const datosLimpios = Object.fromEntries(
        Object.entries(datos).filter(([_, valor]) => valor !== undefined)
      );

      // Verificar si solo está actualizando documento final en etapa 4
      const esEtapa4 = referido.confirmacion3 === 1 && referido.confirmacion4 === 0;
      const soloActualizaDocumentoFinal = datosLimpios.rutadocumentofinal !== undefined && 
                                        Object.keys(datosLimpios).length === 1;

      if (esEtapa4 && soloActualizaDocumentoFinal) {
        
        const perteneceClinicaDestino = usuarioConRol.fkclinica === referido.fkclinica;
        
        if (!perteneceClinicaDestino && !esAdmin) {
          throw new Error('Solo usuarios de la clínica destino pueden subir el documento final');
        }
      } else {
        
        if (!esCreador && !esAdmin) {
          throw new Error('Solo el creador o un administrador pueden modificar este referido');
        }

        if (referido.confirmacion4 === 1) {
          throw new Error('No se puede modificar un referido completado');
        }
      }

      const datosActualizar = {
        usuariomodificacion: usuario.usuario,
        fechamodificacion: new Date()
      };

      if (datos.fkclinica !== undefined) datosActualizar.fkclinica = datos.fkclinica;
      if (datos.comentario !== undefined) datosActualizar.comentario = datos.comentario;
      if (datos.rutadocumentoinicial !== undefined) datosActualizar.rutadocumentoinicial = datos.rutadocumentoinicial;
      if (datos.rutadocumentofinal !== undefined) datosActualizar.rutadocumentofinal = datos.rutadocumentofinal;

      const referidoActualizado = await prismaClient.detallereferirpaciente.update({
        where: { idrefpaciente: id },
        data: datosActualizar,
        include: {
          paciente: true,
          clinica: true,
          usuario: {
            select: { nombres: true, apellidos: true }
          }
        }
      });

      return referidoActualizado;

    } catch (error) {
      console.error('Error en actualizarReferido service:', error);
      throw error;
    }
  },

  async cambiarEstado(id, nuevoEstado, usuario) {
    try {
      const referido = await prisma.detallereferirpaciente.findUnique({
        where: { idrefpaciente: id }
      });

      if (!referido) {
        throw new Error('Referido no encontrado');
      }

      const usuarioConRol = await prisma.usuario.findUnique({
        where: { idusuario: usuario.idusuario },
        include: { rol: true }
      });

      const esAdmin = usuarioConRol?.rol?.nombre?.toLowerCase().includes('admin');

      if (!esAdmin && referido.fkusuario !== usuario.idusuario) {
        throw new Error('No tiene permisos para cambiar el estado');
      }

      const referidoActualizado = await prisma.detallereferirpaciente.update({
        where: { idrefpaciente: id },
        data: {
          estado: nuevoEstado,
          usuariomodificacion: usuario.usuario,
          fechamodificacion: new Date()
        }
      });

      return referidoActualizado;

    } catch (error) {
      console.error('Error en cambiarEstado service:', error);
      throw error;
    }
  },

  async obtenerHistorialPaciente(idPaciente) {
    try {
      const historial = await prisma.detallereferirpaciente.findMany({
        where: {
          fkpaciente: idPaciente,
          estado: 1
        },
        include: {
          clinica: {
            select: {
              nombreclinica: true
            }
          },
          usuario: {
            select: {
              nombres: true,
              apellidos: true,
              profesion: true
            }
          }
        },
        orderBy: {
          fechacreacion: 'desc'
        }
      });

      return historial;

    } catch (error) {
      console.error('Error en obtenerHistorialPaciente service:', error);
      throw error;
    }
  }

};

module.exports = referirService;