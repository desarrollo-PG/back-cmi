// routes/pacienteRoutes.js
const express = require('express');
const router = express.Router();
const PacienteController = require('../controllers/pacienteController');
const autenticacion = require('../middlewares/auth');
const { validarPaciente, validarIdPaciente, validarActualizacionPaciente } = require('../middlewares/validaPaciente');

/**
 * Rutas para la gestión de pacientes
 */

// GET /api/pacientes - Obtener todos los pacientes con paginación y búsqueda
router.get('/', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    PacienteController.obtenerTodosLosPacientes
);

// GET /api/pacientes/disponibles - Obtener pacientes disponibles para asignación
router.get('/disponibles', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    PacienteController.obtenerPacientesDisponibles
);

// GET /api/pacientes/estadisticas - Obtener estadísticas de pacientes
router.get('/estadisticas', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    PacienteController.obtenerEstadisticas
);

// GET /api/pacientes/:id - Obtener un paciente específico por ID
router.get('/:id', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarIdPaciente,
    PacienteController.obtenerPacientePorId
);

// POST /api/pacientes - Crear nuevo paciente
router.post('/', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarPaciente,
    PacienteController.crearPaciente
);

// PUT /api/pacientes/:id - Actualizar paciente existente
router.put('/:id', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarIdPaciente,
    validarActualizacionPaciente,
    PacienteController.actualizarPaciente
);

// DELETE /api/pacientes/:id - Eliminar paciente (eliminación lógica)
router.delete('/:id', 
    autenticacion.validarToken, 
    autenticacion.verificarUsuarioEnBD, 
    validarIdPaciente,
    PacienteController.eliminarPaciente
);

module.exports = router;