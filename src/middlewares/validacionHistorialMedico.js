// middlewares/validacionHistorialMedico.js
const { body, param, validationResult } = require('express-validator');

// Manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: errors.array()
        });
    }
    next();
};

// Validar crear sesión
const validarCrearSesion = [
    body('fkpaciente')
        .isInt({ min: 1 })
        .withMessage('ID del paciente debe ser válido'),
    
    body('fkusuario')
        .isInt({ min: 1 })
        .withMessage('ID del usuario debe ser válido'),
    
    body('fecha')
        .isISO8601()
        .withMessage('Fecha debe ser válida (YYYY-MM-DD)'),
    
    body('motivoconsulta')
        .notEmpty()
        .withMessage('Motivo de consulta es requerido')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Motivo debe tener entre 10 y 1000 caracteres'),
    
    handleValidationErrors
];

// Validar actualizar sesión
const validarActualizarSesion = [
    param('idhistorial')
        .isInt({ min: 1 })
        .withMessage('ID del historial debe ser válido'),
    
    handleValidationErrors
];

// Validar ID de paciente
const validarPacienteId = [
    param('idpaciente')
        .isInt({ min: 1 })
        .withMessage('ID del paciente debe ser válido'),
    handleValidationErrors
];

// Validar ID de historial
const validarHistorialId = [
    param('idhistorial')
        .isInt({ min: 1 })
        .withMessage('ID del historial debe ser válido'),
    handleValidationErrors
];

// Validar subir archivos
const validarSubirArchivos = [
    param('idpaciente')
        .isInt({ min: 1 })
        .withMessage('ID del paciente debe ser válido'),
    handleValidationErrors
];

module.exports = {
    validarCrearSesion,
    validarActualizarSesion,
    validarPacienteId,
    validarHistorialId,
    validarSubirArchivos
};