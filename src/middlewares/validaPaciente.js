// middlewares/validaPaciente.js
const { body, param, validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validación
 */
const manejarErroresValidacion = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({
            exito: false,
            mensaje: 'Errores de validación',
            errores: errores.array()
        });
    }
    next();
};

/**
 * Validaciones para crear y actualizar pacientes
 */
const validarPaciente = [
    // Información personal básica
    body('nombres')
        .notEmpty()
        .withMessage('Los nombres son obligatorios')
        .isLength({ min: 2, max: 100 })
        .withMessage('Los nombres deben tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Los nombres solo pueden contener letras y espacios'),

    body('apellidos')
        .notEmpty()
        .withMessage('Los apellidos son obligatorios')
        .isLength({ min: 2, max: 100 })
        .withMessage('Los apellidos deben tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Los apellidos solo pueden contener letras y espacios'),

    // Documento de identificación
    body('cui')
        .notEmpty()
        .withMessage('El CUI es obligatorio')
        .isLength({ min: 13, max: 13 })
        .withMessage('El CUI debe tener exactamente 13 dígitos')
        .isNumeric()
        .withMessage('El CUI debe contener solo números'),

    // Fecha de nacimiento
    body('fechanacimiento')
        .notEmpty()
        .withMessage('La fecha de nacimiento es obligatoria')
        .isISO8601()
        .withMessage('La fecha de nacimiento debe tener un formato válido')
        .custom((valor) => {
            const fecha = new Date(valor);
            const hoy = new Date();
            const hace150Anos = new Date();
            hace150Anos.setFullYear(hoy.getFullYear() - 150);

            if (fecha > hoy) {
                throw new Error('La fecha de nacimiento no puede ser futura');
            }
            if (fecha < hace150Anos) {
                throw new Error('La fecha de nacimiento no puede ser mayor a 150 años');
            }
            return true;
        }),

    // Género
    body('genero')
        .notEmpty()
        .withMessage('El género es obligatorio')
        .isIn(['M', 'F'])
        .withMessage('El género debe ser M (Masculino) o F (Femenino)'),

    // Información médica
    body('tipoconsulta')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 100 })
        .withMessage('El tipo de consulta no puede exceder 100 caracteres'),

    body('tipodiscapacidad')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 150 })
        .withMessage('El tipo de discapacidad no puede exceder 150 caracteres'),

    // Información de contacto personal
    body('telefonopersonal')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9+\-\s()]*$/)
        .withMessage('El teléfono personal debe contener solo números y símbolos válidos')
        .isLength({ max: 20 })
        .withMessage('El teléfono personal no puede exceder 20 caracteres'),

    // Contacto de emergencia
    body('nombrecontactoemergencia')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 150 })
        .withMessage('El nombre del contacto de emergencia no puede exceder 150 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
        .withMessage('El nombre del contacto de emergencia solo puede contener letras y espacios'),

    body('telefonoemergencia')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9+\-\s()]*$/)
        .withMessage('El teléfono de emergencia debe contener solo números y símbolos válidos')
        .isLength({ max: 20 })
        .withMessage('El teléfono de emergencia no puede exceder 20 caracteres'),

    // Información del encargado/responsable
    body('nombreencargado')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 150 })
        .withMessage('El nombre del encargado no puede exceder 150 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
        .withMessage('El nombre del encargado solo puede contener letras y espacios'),

    body('dpiencargado')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 20 })
        .withMessage('El DPI del encargado no puede exceder 20 caracteres')
        .matches(/^[0-9\s]*$/)
        .withMessage('El DPI del encargado debe contener solo números'),

    body('telefonoencargado')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9+\-\s()]*$/)
        .withMessage('El teléfono del encargado debe contener solo números y símbolos válidos')
        .isLength({ max: 20 })
        .withMessage('El teléfono del encargado no puede exceder 20 caracteres'),

    // Información de ubicación
    body('municipio')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 100 })
        .withMessage('El municipio no puede exceder 100 caracteres'),

    body('aldea')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 100 })
        .withMessage('La aldea no puede exceder 100 caracteres'),

    body('direccion')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 500 })
        .withMessage('La dirección no puede exceder 500 caracteres'),

    manejarErroresValidacion
];

/**
 * Validación para parámetros de ID de paciente
 */
const validarIdPaciente = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID del paciente debe ser un número entero válido'),
    manejarErroresValidacion
];

/**
 * Validaciones específicas para actualización de paciente
 * (permite campos opcionales que son requeridos en creación)
 */
const validarActualizacionPaciente = [
    // Información personal básica (opcional en actualización)
    body('nombres')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Los nombres deben tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Los nombres solo pueden contener letras y espacios'),

    body('apellidos')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Los apellidos deben tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Los apellidos solo pueden contener letras y espacios'),

    // CUI (opcional en actualización)
    body('cui')
        .optional()
        .isLength({ min: 13, max: 13 })
        .withMessage('El CUI debe tener exactamente 13 dígitos')
        .isNumeric()
        .withMessage('El CUI debe contener solo números'),

    // Fecha de nacimiento (opcional en actualización)
    body('fechanacimiento')
        .optional()
        .isISO8601()
        .withMessage('La fecha de nacimiento debe tener un formato válido')
        .custom((valor) => {
            const fecha = new Date(valor);
            const hoy = new Date();
            const hace150Anos = new Date();
            hace150Anos.setFullYear(hoy.getFullYear() - 150);

            if (fecha > hoy) {
                throw new Error('La fecha de nacimiento no puede ser futura');
            }
            if (fecha < hace150Anos) {
                throw new Error('La fecha de nacimiento no puede ser mayor a 150 años');
            }
            return true;
        }),

    // Género (opcional en actualización)
    body('genero')
        .optional()
        .isIn(['M', 'F'])
        .withMessage('El género debe ser M (Masculino) o F (Femenino)'),

    // El resto de campos mantienen las mismas validaciones que en creación
    body('tipoconsulta')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 100 })
        .withMessage('El tipo de consulta no puede exceder 100 caracteres'),

    body('tipodiscapacidad')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 150 })
        .withMessage('El tipo de discapacidad no puede exceder 150 caracteres'),

    body('telefonopersonal')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9+\-\s()]*$/)
        .withMessage('El teléfono personal debe contener solo números y símbolos válidos')
        .isLength({ max: 20 })
        .withMessage('El teléfono personal no puede exceder 20 caracteres'),

    body('nombrecontactoemergencia')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 150 })
        .withMessage('El nombre del contacto de emergencia no puede exceder 150 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
        .withMessage('El nombre del contacto de emergencia solo puede contener letras y espacios'),

    body('telefonoemergencia')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9+\-\s()]*$/)
        .withMessage('El teléfono de emergencia debe contener solo números y símbolos válidos')
        .isLength({ max: 20 })
        .withMessage('El teléfono de emergencia no puede exceder 20 caracteres'),

    body('nombreencargado')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 150 })
        .withMessage('El nombre del encargado no puede exceder 150 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
        .withMessage('El nombre del encargado solo puede contener letras y espacios'),

    body('dpiencargado')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 20 })
        .withMessage('El DPI del encargado no puede exceder 20 caracteres')
        .matches(/^[0-9\s]*$/)
        .withMessage('El DPI del encargado debe contener solo números'),

    body('telefonoencargado')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9+\-\s()]*$/)
        .withMessage('El teléfono del encargado debe contener solo números y símbolos válidos')
        .isLength({ max: 20 })
        .withMessage('El teléfono del encargado no puede exceder 20 caracteres'),

    body('municipio')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 100 })
        .withMessage('El municipio no puede exceder 100 caracteres'),

    body('aldea')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 100 })
        .withMessage('La aldea no puede exceder 100 caracteres'),

    body('direccion')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 500 })
        .withMessage('La dirección no puede exceder 500 caracteres'),

    manejarErroresValidacion
];

module.exports = {
    validarPaciente,
    validarIdPaciente,
    validarActualizacionPaciente
};