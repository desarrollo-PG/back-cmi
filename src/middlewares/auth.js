//se importa la funcion de vericar token
const { verificarToken } = require('../utils/jwt');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const validarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ')
        ?authHeader.slice(7)
        :null;

    if(!token){
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido. Formato: "Authorization: Bearer <token>"'
        });
    }

    try{
        const decoded = verificarToken(token);
        req.usuario = decoded;
        next(); 
    }catch(error){
        return res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

const verificarUsuarioEnBD = async (req, res, next) => {
    
    try{
        //tomar el id del usuario del token decodificado
        const idusuario = req.usuario.id || req.usuario.idusuario;
        
        if(!idusuario){
            return res.status(401).json({
                success: false,
                message: 'Token no contiene ID de usuario válido'
            });
        }

        //buscar usuario en BD
        const usuario = await prisma.usuario.findFirst({
            where:{
                idusuario: parseInt(idusuario),
                estado: 1
            },
            select:{
                idusuario:    true,
                usuario:      true,
                correo:       true,
                nombres:      true,
                apellidos:    true,
                fkrol:        true,
                estado:       true,
                cambiarclave: true
            }
        });

        if(!usuario){
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        //agregar datos del usuario al request 
        req.usuario = {
            ...req.usuario,
            ...usuario
        };

        next();
    }catch(error){
        return res.status(500).json({
            success: false,
            message: 'Error al verificar usuario midd validacion',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
  validarToken,
  verificarUsuarioEnBD
};