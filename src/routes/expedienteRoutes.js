// routes/expedienteRoutes.js
const express = require('express');
const router = express.Router();
const ExpedienteController = require('../controllers/expedienteController');
const autenticacion = require('../middlewares/auth');
const { validarExpediente, validarIdExpediente } = require('../middlewares/validaExpediente');

/**
 * Rutas para la gestión de expedientes médicos
 */

// GET /api/expedientes - Obtener todos los expedientes con paginación y búsqueda
router.get('/', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    ExpedienteController.obtenerTodosLosExpedientes
);

// GET /api/expedientes/disponibles - Obtener expedientes sin pacientes asignados
router.get('/disponibles', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    ExpedienteController.obtenerExpedientesDisponibles
);

// GET /api/expedientes/generar-numero - Generar número de expediente automático
router.get('/generar-numero', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    ExpedienteController.generarNumeroExpediente
);

// GET /api/expedientes/estadisticas - Obtener estadísticas de expedientes
router.get('/estadisticas', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    ExpedienteController.obtenerEstadisticas
);

// GET /api/expedientes/:id - Obtener un expediente específico por ID
router.get('/:id', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarIdExpediente,
    ExpedienteController.obtenerExpedientePorId
);

// POST /api/expedientes - Crear nuevo expediente médico
router.post('/', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarExpediente,
    ExpedienteController.crearExpediente
);

// PUT /api/expedientes/:id - Actualizar expediente existente
router.put('/:id', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarIdExpediente,
    validarExpediente,
    ExpedienteController.actualizarExpediente
);

// DELETE /api/expedientes/:id - Eliminar expediente (eliminación lógica)
router.delete('/:id', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarIdExpediente,
    ExpedienteController.eliminarExpediente
);

module.exports = router;