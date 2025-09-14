const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');
const { DateTime } = require("luxon");

const prisma = new PrismaClient();

class UsuarioService {

    convertirFecha(fechaString) {
        if (!fechaString) return null;
        
        // Si ya es un objeto Date, devolverlo tal como está
        if (fechaString instanceof Date) return fechaString;
        
        // Convertir string a Date
        const fecha = new Date(fechaString);
        
        // Verificar que la fecha sea válida
        if (isNaN(fecha.getTime())) {
            throw new Error(`Fecha inválida: ${fechaString}`);
        }
        
        return fecha;
    }

    async obtenerUsuarios(){
        try{
            const usuario = await prisma.usuario.findMany({
                select:{
                    idusuario:                true,
                    fkrol:                    true,
                    usuario:                  true,
                    nombres:                  true,
                    apellidos:                true,
                    correo:                   true, 
                    puesto:                   true,
                    telinstitucional:         true,
                    extension:                true,
                    estado:                   true,
                    profesion:                true,
                    fechanacimiento:          true,
                    telefonopersonal:         true,
                    nombrecontactoemergencia: true,
                    telefonoemergencia:       true,
                    observaciones:            true,
                    rutafotoperfil:           true
                },
                orderBy:{
                    usuario: 'asc'
                }
            });

            return{
                success: true,
                data: usuario
            };
        }catch(error){
            console.error("Error en usuarioService: ", error.message);
            throw error;
        }
    }

    async obtenerUsuarioPorId(idusuario){
        try{

            if(!idusuario || isNaN(parseInt(idusuario))){
                return {
                    success: false,
                    message: 'Id de usuario invalido'
                };
            }

            const usuarioPorId = await prisma.usuario.findUnique({
                where:{
                    idusuario: parseInt(idusuario)
                }
            });

            if(!usuarioPorId){
                return{
                    success: false,
                    message: 'Usuario no encontrado'
                };
            }

            const { clave: _, ...usuarioSinClave } = usuarioPorId;

            return{
                success: true,
                data: usuarioSinClave
            }
        }catch(error){
            console.error("Error en usuarioService al consultar usuario especifico: ", error.message);
            throw error;
        }
    }

    async crearUsuario(usuarioData){
        try{
            const { fkrol, usuario, clave, nombres, apellidos, fechanacimiento, correo, puesto, profesion, telinstitucional, extension, telefonopersonal,
                    nombrecontactoemergencia, telefonoemergencia, rutafotoperfil, observaciones, usuariocreacion, estado } = usuarioData;
            // validar datos requeridos
            if(!usuario || !clave || !nombres || !apellidos || !correo){
                return{
                    success: false,
                    message: 'Complete los campos requeridos'
                };
            }

            //validar formato de correo
            const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if(!correoRegex.test(correo)){
                return{
                    success: false,
                    message: 'Formato de correo inválido'
                };
            }

            //validar clave
            if(clave.length < 8){
                return{
                    success: false,
                    message: 'La contraseña debe tener al menos 8 caracteres'
                };
            }

            if(clave.length > 12){
                return{
                    success: false,
                    message: 'La contraseña debe tener maximo 12 caracteres'
                };
            }

            //valida si usuario ya existe
            const existeUsuario = await prisma.usuario.findUnique({
                where: {usuario: usuario.toLowerCase() }
            });

            if(existeUsuario){
                return{
                    success: false,
                    message: 'El usuario ya existe'
                };
            }

            //valida si correo existe en otro usuario
            const emailExiste = await prisma.usuario.findFirst({
                where: {
                    correo: correo.toLowerCase()
                }
            });

            if(emailExiste){
                return {
                    success: false,
                    message: 'El correo ya es utilizado por otro usuario'
                };
            }

            //encriptar clave
            const saltRounds = 12;
            const claveHash = await bcrypt.hash(clave, saltRounds);

            //crea usuario
            const usuarioNuevo = await prisma.usuario.create({
                data:{
                    fkrol:                    parseInt(fkrol), 
                    usuario:                  usuario.toLowerCase(), 
                    clave:                    claveHash, 
                    nombres:                  nombres?.trim(), 
                    apellidos:                apellidos?.trim(), 
                    fechanacimiento:          this.convertirFecha(fechanacimiento), 
                    correo:                   correo.toLowerCase(), 
                    puesto:                   puesto?.trim(), 
                    profesion:                profesion?.trim(), 
                    telinstitucional:          telinstitucional?.trim(), 
                    extension:                extension?.trim(), 
                    telefonopersonal:         telefonopersonal?.trim(),
                    nombrecontactoemergencia: nombrecontactoemergencia?.trim(), 
                    telefonoemergencia:       telefonoemergencia?.trim(), 
                    rutafotoperfil:           rutafotoperfil?.trim(), 
                    observaciones:            observaciones?.trim(), 
                    usuariocreacion:          usuariocreacion,
                    estado:                   parseInt(estado)
                },
                select: {
                    fkrol:                    true,
                    usuario:                  true,
                    nombres:                  true,
                    apellidos:                true,
                    fechanacimiento:          true,
                    correo:                   true,
                    puesto:                   true,
                    profesion:                true,
                    telinstitucional:          true,
                    extension:                true,
                    telefonopersonal:         true,
                    nombrecontactoemergencia: true,
                    telefonoemergencia:       true,
                    rutafotoperfil:           true,
                    observaciones:            true,
                    estado:                   true
                }
            });

            return{
                success: true,
                message: 'Usuario creado exitosamente',
                data: usuarioData
            };
        }catch(error){
            console.error("Error al crear usuario en el service: ", error.message);
            throw error;
        }
    }

    async actualizarUsuario(idusuario, updateData){
        try{
            if (!idusuario || isNaN(parseInt(idusuario))) {
                return {
                    success: false,
                    message: 'ID de usuario inválido'
                };
            }

            //valida si usuario existe
            const existeUsua = await prisma.usuario.findUnique({
                where: {
                    idusuario: parseInt(idusuario)
                }
            });

            if(!existeUsua){
                return{
                    success: false,
                    message: 'Usuario no encontrado'
                };
            }

            //preparar data para actualizar
            const dataParaActualizar = {};

            if(updateData.correo){
                //valida formato del correo
                const correoElectronicoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if(!correoElectronicoRegex.test(updateData.correo)){
                    return {
                        success: false,
                        message: 'Formato de correo inválido'
                    };
                }

                //valida si correo existe en otro usuario
                const emailExiste = await prisma.usuario.findFirst({
                    where: {
                        correo: updateData.correo.toLowerCase(),
                        idusuario: { not: parseInt(idusuario) }
                    }
                });

                if(emailExiste){
                    return {
                        success: false,
                        message: 'El correo ya es utilizado por otro usuario'
                    };
                }

                dataParaActualizar.correo = updateData.correo.toLowerCase();
            }

            if(updateData.clave){
                if(updateData.clave.length < 8){
                    return {
                        success: false,
                        message: 'Contraseña debe tener al menos 8 caracteres'
                    };
                }

                if(updateData.clave.length > 12){
                    return {
                        success: false,
                        message: 'Contraseña debe tener maximo 12 caracteres'
                    };
                }

                const salRounds = 12;
                dataParaActualizar.clave = await bcrypt.hash(updateData.clave, salRounds);
            }

            if(updateData.nombres !== undefined){
                dataParaActualizar.nombres = updateData.nombres?.trim();
            }

            if(updateData.apellidos !== undefined){
                dataParaActualizar.apellidos = updateData.apellidos?.trim();
            }

            if(updateData.fkrol){
                dataParaActualizar.fkrol = updateData.fkrol;
            }

            if(updateData.fechanacimiento !== undefined){
                dataParaActualizar.fechanacimiento = this.convertirFecha(updateData.fechanacimiento);
            }

            if(updateData.puesto !== undefined){
                dataParaActualizar.puesto = updateData.puesto?.trim();
            }

            if(updateData.profesion !== undefined){
                dataParaActualizar.profesion = updateData.profesion?.trim();
            }

            if(updateData.telinstitucional !== undefined){
                dataParaActualizar.telinstitucional = updateData.telinstitucional?.trim();
            }

            if(updateData.extension !== undefined){
                dataParaActualizar.extension = updateData.extension?.trim();
            }

            if(updateData.telefonopersonal !== undefined){
                dataParaActualizar.telefonopersonal = updateData.telefonopersonal?.trim();
            }

            if(updateData.nombrecontactoemergencia !== undefined){
                dataParaActualizar.nombrecontactoemergencia = updateData.nombrecontactoemergencia?.trim();
            }

            if(updateData.telefonoemergencia !== undefined){
                dataParaActualizar.telefonoemergencia = updateData.telefonoemergencia?.trim();
            }

            if(updateData.rutafotoperfil !== undefined){
                dataParaActualizar.rutafotoperfil = updateData.rutafotoperfil?.trim();
            }

            if(updateData.observaciones !== undefined){
                dataParaActualizar.observaciones = updateData.observaciones?.trim();
            }

            if(updateData.usuariomodificacion !== undefined){
                dataParaActualizar.usuariomodificacion = updateData.usuariomodificacion?.trim();
            }

            const fechaGuatemala = DateTime.now().setZone("America/Guatemala").toJSDate();
            dataParaActualizar.fechamodificacion = fechaGuatemala;

            if(updateData.estado !== undefined){
                dataParaActualizar.estado = updateData.estado;
            }

            // Solo actualizar si hay cambios
            if (Object.keys(dataParaActualizar).length === 0) {
                return {
                    success: false,
                    message: 'No hay datos para actualizar'
                };
            }

            // Actualizar usuario
            const updatedUser = await prisma.usuario.update({
                where: { idusuario: parseInt(idusuario) },
                data: dataParaActualizar,
                select: {
                    idusuario: true,
                    correo:    true,
                    nombres:   true,
                    apellidos: true,
                    fkrol:     true
                }
            });
            
            return {
                success: true,
                message: 'Usuario actualizado exitosamente',
                data: updatedUser
            };

        }catch(error){
            console.error("Error al actualizar usuario en el service: ", error.message);
            throw error;
        }
    }

    async eliminarUsuario(idusuario){
        try{
            if(!idusuario || isNaN(parseInt(idusuario))){
                return{
                    success: false,
                    message: 'ID de usuario inválido'
                };
            }

            const usuario = await prisma.usuario.findUnique({
                where:{
                    idusuario: parseInt(idusuario)
                }
            });

            if(!usuario){
                return{
                    success: false,
                    message: 'Usuario no encontrado'
                };
            }

            if(usuario.estado === 0){
                return{
                    success: false,
                    message: 'El usuario ya se encuentra inactivo'
                };
            }

            if(usuario.fkrol === 1){
                const adminContador = await prisma.usuario.count({
                    where:{
                        fkrol: 1,
                        estado: 1
                    }
                });

                if(adminContador <= 1){
                    return{
                        success: false,
                        message: 'No se puede eliminar el último usuario administrador'
                    };
                }
            }

            await prisma.usuario.update({
                where: { idusuario: parseInt(idusuario)},
                data:{
                    estado: 0
                }
            });

            return{
                success: true,
                message: 'Usuario eliminado exitosamente'
            };
        }catch(error){
            console.error("Error al eliminar usuario en service: ", error.message);
            throw error;
        }
    }
}

module.exports = new UsuarioService();