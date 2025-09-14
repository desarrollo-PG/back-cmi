// routes/fileRoutes.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const { FileController, upload, handleMulterError } = require('../controllers/fileController');

// 📤 Subir archivo - CON MANEJO DE ERRORES
router.post('/upload', (req, res, next) => {
  console.log('🚀 === INICIANDO UPLOAD ROUTE ===');
  console.log('Request headers:', req.headers);
  console.log('Request body antes de multer:', req.body);
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Error en multer middleware:', err);
      return handleMulterError(err, req, res, next);
    }
    
    console.log('✅ Multer procesó correctamente');
    console.log('Request body después de multer:', req.body);
    console.log('Request file después de multer:', req.file ? req.file.filename : 'No file');
    
    FileController.uploadFile(req, res);
  });
});

// 👁️ Visualizar archivo
router.get('/view/:fileName', FileController.viewFile);

// 🗑️ Eliminar archivo
router.delete('/delete/:pacienteId/:tipo', FileController.deleteFile);

// 📋 Obtener archivos de un paciente
router.get('/patient/:pacienteId', FileController.getPatientFiles);

// 🔧 Middleware de manejo de errores global para esta ruta
router.use(handleMulterError);

module.exports = router;