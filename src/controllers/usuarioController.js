const usuarioService = require('../services/usuarioService');

//obtener todos los usuario
const obtenerUsuarios = async (req, res) => {
    try{
        const resultado = await usuarioService.obtenerUsuarios();

        if(resultado.success){
            res.status(200).json(resultado);
        }else{
            res.status(400).json(resultado);
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//obtener usuario por id
const obtenerUsuarioPorId = async (req, res) => {
    try{
        const { idusuario } = req.params;
        const resultado = await usuarioService.obtenerUsuarioPorId(idusuario);

        if(resultado.success){
            res.status(200).json(resultado);
        }else{
            res.status(404).json(resultado);
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Creacion nuevo usuario
const crearUsuario = async (req, res) => {
    try{
        const usuarioData = req.body;
        const resultado = await usuarioService.crearUsuario(usuarioData);

        if(resultado.success){
            res.status(201).json(resultado);
        }else{
            res.status(400).json(resultado);
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//actualizar usuario
const actuarlizarUsuario = async (req, res) => {
    try{
        const { idusuario } = req.params;
        const updateData = req.body;
        const resultado = await usuarioService.actualizarUsuario(idusuario, updateData);

        if(resultado.success){
            res.status(200).json(resultado);
        }else{
            res.status(400).json(resultado);
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//eliminar usuario
const eliminarUsuario = async (req, res) => {
    try{
        const { idusuario } = req.params;
        const resultado = await usuarioService.eliminarUsuario(idusuario);

        if(resultado.success){
            res.status(200).json(resultado);
        }else{
            res.status(400).json(resultado);
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener perfil del usuario autenticado
const obtenerPerfil = async (req, res) => {
    try {
        const idusuario = req.usuario.idusuario;
        const resultado = await usuarioService.obtenerUsuarioPorId(idusuario);

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(404).json(resultado);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Actualizar perfil del usuario autenticado
const actualizarPerfil = async (req, res) => {
    try {
        const idusuario = req.usuario.idusuario;
        const updateData = req.body;

        // Usuarios normales no pueden cambiar su propio role
        if (req.usuario.fkrol !== 1) {
            delete updateData.fkrol;
        }

        const resultado = await usuarioService.actuarlizarUsuario(idusuario, updateData);

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(400).json(resultado);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actuarlizarUsuario,
    eliminarUsuario,
    obtenerPerfil,
    actualizarPerfil
};