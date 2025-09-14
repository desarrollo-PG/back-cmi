const authService = require('../services/authService');
const emailService = require('../services/EmailService');

const login = async (req, res) => {
    try{
        const { usuario, clave } = req.body;

        const resultado = await authService.login(usuario, clave);

        if (resultado.cambiarClave) {
            return res.status(200).json({
                success: true,
                cambiarClave: true,
                message: 'Debes cambiar tu contraseña temporal',
                data: resultado
            });
        }

        res.status(200).json({
            success: true,
            message: 'Login exitoso',
            data: resultado
        });
    } catch(error) {
        console.error('Error en AuthController.login:', error.message);

        let statusCode = 500;
        if(error.message === 'Credenciales inválidas'){
            statusCode = 401;
        } else if(error.message.includes('inactivo')){
            statusCode = 403; 
        }

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

const logout = async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logout exitoso. Elimine el token del cliente.'
    });
};

const RecuperarClave = async (req, res) => {
    try{
        const { correo } = req.body;

        // Validar que el correo sea proporcionado
        if (!correo) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico es requerido'
            });
        }

        // Validar formato básico del correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de correo electrónico inválido'
            });
        }

        await emailService.ResetearClave(correo);

        res.status(200).json({
            success: true,
            message: 'Se ha enviado una contraseña temporal a tu correo electrónico'
        });
        
    } catch(error) {
        console.error('Error en AuthController.RecuperarClave:', error.message);
        
        // Manejo específico de errores basado en el mensaje
        let statusCode = 500;
        let message = 'Error interno del servidor';
        
        if (error.message === 'Credenciales inválidas') {
            statusCode = 400;
            message = 'El correo electrónico no está registrado en nuestro sistema';
        } else if (error.message.includes('inactivo')) {
            statusCode = 403;
            message = 'Usuario inactivo. Contacte al administrador';
        }
        
        res.status(statusCode).json({
            success: false,
            message: message
        });
    }
};

const CambiarClaveTemporal = async (req, res) => {
    try {
        const { usuario, claveActual, claveNueva, confirmarClave } = req.body;

        // Validar que las claves nuevas coincidan
        if (claveNueva !== confirmarClave) {
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        // Cambiar la contraseña usando el authService
        const resultado = await authService.cambiarClaveObligatoria(usuario, claveActual, claveNueva);

        res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente.',
            data: resultado
        });

    } catch (error) {
        console.error('Error en AuthController.CambiarClaveTemporary:', error.message);
        
        let statusCode = 500;
        let message = 'Error interno del servidor';
        
        if (error.message === 'Usuario no encontrado') {
            statusCode = 404;
            message = 'Usuario no encontrado';
        } else if (error.message === 'Contraseña actual incorrecta') {
            statusCode = 400;
            message = 'La contraseña temporal es incorrecta';
        } else if (error.message === 'No es necesario cambiar la contraseña') {
            statusCode = 400;
            message = 'No tienes una contraseña temporal pendiente de cambio';
        } else if (error.message.includes('La contraseña debe')) {
            statusCode = 400;
            message = error.message;
        }
        
        res.status(statusCode).json({
            success: false,
            message: message
        });
    }
};

module.exports = {
    login,
    logout,
    RecuperarClave,
    CambiarClaveTemporal
};