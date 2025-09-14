const express = require('express');
const router = express.Router();
const { 
    obtenerUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actuarlizarUsuario,
    eliminarUsuario
 } = require('../controllers/usuarioController');
const autenticacion = require('../middlewares/auth');
const { validarCambioClave } = require('../middlewares/validarCambioClave');
const { validarUsuarioCreacion, validarUsuarioActualizar } = require('../middlewares/validacionMiddleware');
const RolService = require('../services/rolService');

router.get(
    '/buscarUsuarios',
    autenticacion.validarToken,
    autenticacion.verificarUsuarioEnBD,
    validarCambioClave,
    obtenerUsuarios
);

router.get(
    '/buscarPorId/:idusuario',
    autenticacion.validarToken,
    autenticacion.verificarUsuarioEnBD,
    validarCambioClave,
    obtenerUsuarioPorId
);

router.post(
    '/crearUsuario',
    autenticacion.validarToken,
    autenticacion.verificarUsuarioEnBD,
    validarCambioClave,
    validarUsuarioCreacion,
    crearUsuario
);

router.put(
    '/actualizarUsuario/:idusuario',
    autenticacion.validarToken,
    autenticacion.verificarUsuarioEnBD,
    validarCambioClave,
    validarUsuarioActualizar,
    actuarlizarUsuario
);

router.delete(
    '/eliminarUsuario/:idusuario',
    autenticacion.validarToken,
    autenticacion.verificarUsuarioEnBD,
    validarCambioClave,
    eliminarUsuario
);

router.get('/roles',
    autenticacion.validarToken,
    autenticacion.verificarUsuarioEnBD,
    async (req, res) => {
        try{
            const roles = await RolService.consultarRol();
            res.json(roles);
        }catch(error){
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;