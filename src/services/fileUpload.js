// services/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear carpeta uploads si no existe
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads', { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        const { idpaciente } = req.params;
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const nombreBase = path.basename(file.originalname, extension);
        
        const nombreArchivo = `${timestamp}_pac${idpaciente}_${nombreBase}${extension}`;
        cb(null, nombreArchivo);
    }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido'), false);
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 5 // Máximo 5 archivos
    }
});

// Manejo de errores
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Archivo muy grande. Máximo 10MB'
            });
        }
    }

    if (error && error.message === 'Tipo de archivo no permitido') {
        return res.status(400).json({
            success: false,
            message: 'Solo se permiten: JPG, PNG, PDF, DOC, DOCX'
        });
    }

    next(error);
};

module.exports = {
    upload,
    handleMulterError
};