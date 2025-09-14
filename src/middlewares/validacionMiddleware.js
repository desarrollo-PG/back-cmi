const { body, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
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

// Validación para resetear contraseña (mantener como estaba)
const validarResetearPass = [
    body('correo')
    .isEmail()
    .normalizeEmail()
    .withMessage('correo inválido'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Datos inválidos',
            details: errors.array()
        });
        }
        next();
    }
];

// Validaciones para crear usuario
const validarUsuarioCreacion = [
    // Validación de correo
    body('correo')
        .isEmail()
        .normalizeEmail()
        .withMessage('El correo electronico debe ser válido'),
    
    // Validación de usuario
    body('usuario')
        .isLength({min: 6, max: 20})
        .withMessage('El usuario debe tener entre 6 y 20 caracteres')
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage('El usuario solo puede contener letras y números'),
    
    // Validación de clave
    body('clave')
        .isLength({ min: 8, max: 12 })
        .withMessage('La contraseña debe tener entre 8 y 12 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).+$/)
        .withMessage('La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial'),
    
    // Validación de nombres
    body('nombres')
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('Nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Nombre solo puede contener letras y espacios'),
    
    // Validación de apellidos
    body('apellidos')
        .notEmpty()
        .withMessage('Los apellidos son requeridos')
        .isLength({ min: 2, max: 50 })
        .withMessage('Apellidos deben tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Apellidos solo pueden contener letras y espacios'),
    
    // Validación de fecha de nacimiento
    body('fechanacimiento')
        .isISO8601()
        .withMessage('Fecha de nacimiento debe ser válida'),
    
    // Validación de rol
    body('fkrol')
        .isInt({ min: 1 })
        .withMessage('El rol debe ser un número válido'),
    
    handleValidationErrors
];

// Validaciones para actualizar usuario
const validarUsuarioActualizar = [
    param('idusuario')
        .isInt({ min: 1 })
        .withMessage('ID debe ser un número entero válido'),
    body('correo')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('El correo electronico debe ser válido'),
    body('usuario')
        .isLength({min: 6, max: 20})
        .withMessage('El usuario debe contar con al menos 6 caracteres y maximo 20 caracteres')
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage('El usuario no debe tener espacios, caracteres especiales ni números'),
    body('clave')
        .optional()
        .isLength({ min: 8, max: 12 })
        .withMessage('La contraseña debe tener al menos 8 caracteres y maximo 12 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).+$/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un caracter especial y un número'),
    body('nombres')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Nombre solo puede contener letras y espacios'),
    handleValidationErrors
];

// Validación para parámetros de ID
const validateUsuarioId = [
    param('idusuario')
        .isInt({ min: 1 })
        .withMessage('ID debe ser un número entero válido'),
    handleValidationErrors
];

module.exports = {
  validarUsuarioCreacion,
  validarResetearPass,
  validarUsuarioActualizar,
  validateUsuarioId
};