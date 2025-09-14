//exporta la libreria joi
const Joi = require('joi');

const validarLogin = (req, res, next) => {
    const schema = Joi.object({
        usuario: Joi.string()
            .min(6)
            .max(20)
            .alphanum()
            .required()
            .messages({  
                'string.min': 'El usuario debe tener al menos 6 caracteres',
                'string.max': 'El usuario no puede tener más de 20 caracteres',
                'string.alphanum': 'El usuario solo puede contener letras y números',
                'any.required': 'El usuario es requerido'
            }),
        clave: Joi.string()
            .min(8)
            .max(12)
            .required()
            .messages({  
                'string.min': 'La contraseña debe tener almenos 8 caracteres',
                'string.max': 'La contraseña no puede tener más de 12 caracteres',
                'any.required': 'La contraseña es requerida'
            })
    });

    const {error} = schema.validate(req.body);

    if(error){
        return res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            errors: error.details.map(detail => detail.message)
        });
    }

    next();
};

module.exports = validarLogin; 