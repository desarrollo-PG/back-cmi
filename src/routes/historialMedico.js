// routes/historialMedico.js


const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialMedicoController');
const { validarToken, verificarUsuarioEnBD } = require('../middlewares/auth');
const { upload, handleMulterError } = require('../services/fileUpload');
const {
    validarCrearSesion,
    validarActualizarSesion,
    validarPacienteId,
    validarHistorialId,
    validarSubirArchivos
} = require('../middlewares/validacionHistorialMedico');

// Aplicar autenticación a todas las rutas
router.use(validarToken);
router.use(verificarUsuarioEnBD);

// ✅ RUTAS CORREGIDAS PARA COINCIDIR CON EL APP.JS

// Obtener historial completo de un paciente
router.get('/paciente/:idpaciente', 
    validarPacienteId,
    historialController.obtenerHistorialPorPaciente
);

// Obtener info básica del paciente  
router.get('/info-paciente/:idpaciente', 
    validarPacienteId,
    historialController.obtenerInfoPaciente
);

// Crear nueva sesión
router.post('/crear-sesion', 
    validarCrearSesion,
    historialController.crearSesion
);

// Actualizar sesión
router.put('/actualizar-sesion/:idhistorial', 
    validarActualizarSesion,
    historialController.actualizarSesion
);

// Subir archivos para historial
router.post('/subir-archivos/:idpaciente',
    validarSubirArchivos,
    upload.array('archivos', 5),
    handleMulterError,
    historialController.subirArchivos
);

module.exports = router;