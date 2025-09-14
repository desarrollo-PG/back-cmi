const rateLimit = require('express-rate-limit');

const ResetearClaveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        error: 'Demasiados intentos de recuperación. Intenta en 15 minutos.'
    }
});

module.exports = ResetearClaveLimiter;