const bcrypt = require('bcryptjs');                      //para encriptar contraseñas
const { PrismaClient } = require('../generated/prisma'); // ORM que sirve para conectar con base de datos
const { generarToken } = require('../utils/jwt');        // función para crear token

const prisma = new PrismaClient();

class AuthService{
    async login(usuario_, clave_){
        try{
            //Buscar usuario por email
            const usuario = await prisma.usuario.findUnique({ 
                where: {
                    usuario: usuario_.toLowerCase().trim()
                },
                select:{
                    idusuario:      true,
                    usuario:        true,
                    nombres:        true,
                    apellidos:      true,
                    puesto:         true,
                    rutafotoperfil: true,
                    fkrol:          true,
                    estado:         true,
                    clave:          true,
                    cambiarclave:   true
                }
            });

            if(!usuario){
                throw new Error('Credenciales inválidas');
            }

            //Verifica si el usuario esta activo
            if(!usuario.estado){
                throw new Error('Usuario inactivo. Contacte al administrador');
            }

            //verifica la contraseña
            const passValida = await bcrypt.compare(clave_, usuario.clave);

            if(!passValida){
                throw new Error('Credenciales inválidas');
            }

            //Genera el token 
            const token = generarToken({
                id:       usuario.idusuario,
                usuario:  usuario.usuario,
                nombre:   usuario.nombres,
                apellido: usuario.apellidos,
                rutafotoperfil: usuario.rutafotoperfil
            });

            //Retornar datos (sin la contraseña)
            const { clave: _, ...usuarioSinClave } = usuario;
            
            return {
                usuario: usuarioSinClave,
                token,
                cambiarclave: usuario.cambiarclave
            };
        }catch(error){
            console.error('Error en AuthService.login:', error.message);
            throw error;
        }
    }

    async cambiarClaveObligatoria(usuario_, claveActual_, claveNueva_) {
        try {
            const usuario = await prisma.usuario.findUnique({
                where: {
                    usuario: usuario_.toLowerCase().trim()
                }
            });

            if (!usuario) {
                throw new Error('Usuario no encontrado');
            }

            // Verificar que el usuario debe cambiar su contraseña
            if (!usuario.cambiarclave) {
                throw new Error('No es necesario cambiar la contraseña');
            }

            // Verificar la contraseña actual (temporal)
            const claveValida = await bcrypt.compare(claveActual_, usuario.clave);
            if (!claveValida) {
                throw new Error('Contraseña actual incorrecta');
            }

            // Validar que la nueva contraseña no sea igual a la temporal
            const mismaClaveAnterior = await bcrypt.compare(claveNueva_, usuario.clave);
            if (mismaClaveAnterior) {
                throw new Error('La nueva contraseña debe ser diferente a la temporal');
            }

            // Validar formato de la nueva contraseña
            if (claveNueva_.length < 8 || claveNueva_.length > 12) {
                throw new Error('La contraseña debe tener entre 8 y 12 caracteres');
            }

            // Validar complejidad de la contraseña (opcional)
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
            if (!passwordRegex.test(claveNueva_)) {
                throw new Error('La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un símbolo');
            }

            // Hashear la nueva contraseña
            const hashNuevaClave = await bcrypt.hash(claveNueva_, 10);

            // Actualizar la contraseña y desactivar el flag
            await prisma.usuario.update({
                where: { usuario: usuario_ },
                data: {
                    clave: hashNuevaClave,
                    cambiarclave: false // Desactivar el cambio obligatorio
                }
            });

            return { 
                success: true, 
                message: 'Contraseña actualizada correctamente' 
            };

        } catch (error) {
            console.error('Error en AuthService.cambiarClaveObligatoria:', error.message);
            throw error;
        }
    }

    async verificarCambioClave(usuario_) {
        try {
            const usuario = await prisma.usuario.findUnique({
                where: { usuario: usuario_ },
                select: { cambiarclave: true }
            });

            return usuario ? usuario.cambiarClave : false;
        } catch (error) {
            console.error('Error en AuthService.verificarCambioClave:', error.message);
            return false;
        }
    }
}

module.exports = new AuthService();