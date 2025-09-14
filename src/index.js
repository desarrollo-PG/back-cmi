require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// ========================
// MIDDLEWARES GLOBALES
// ========================

// Seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// ========================
// 🔧 MIDDLEWARE CONDICIONAL PARA JSON
// ========================

// ✅ SOLUCIÓN: Solo aplicar express.json() a rutas que NO sean de archivos
app.use((req, res, next) => {
  // Si la ruta es de archivos, NO procesarla como JSON
  if (req.path.startsWith('/api/files')) {
    console.log('🔧 Ruta de archivos detectada, omitiendo express.json():', req.path);
    return next();
  }
  
  // Para todas las demás rutas, aplicar express.json()
  express.json({ limit: '10mb' })(req, res, next);
});

// URLencoded solo para formularios normales (no archivos)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/files')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// ========================
// RUTAS
// ========================

// 🆕 IMPORTANTE: Rutas de archivos PRIMERO (antes que otras rutas)
const fileRoutes = require('./routes/fileRoutes');
app.use('/api/files', fileRoutes); // ← Esta ruta NO usará express.json()

// Otras rutas (estas SÍ usarán express.json())
const authRoutes = require('./routes/authRoutes');
const usuarioRoute = require('./routes/usuarioRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const archivoRoutes = require('./routes/archivoRoutes');
const { ServeFileController } = require('./controllers/serveFileController');

const serveFileController = new ServeFileController();
const expedienteRoutes = require('./routes/expedienteRoutes'); 
const historialRoutes = require('./routes/historialMedico');

app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/usuario', usuarioRoute);
app.use('/api/archivo', archivoRoutes);
app.get('/api/files/:filename', (req, res) => serveFileController.serveFile(req, res));
app.use('/api/expedientes', expedienteRoutes); 
app.use('/api/historial', historialRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido a la API de CMI',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        verificar: 'GET /api/auth/verificar'
      },
      pacientes: {
        listar: 'GET /api/pacientes',
        crear: 'POST /api/pacientes',
        obtener: 'GET /api/pacientes/:id',
        actualizar: 'PUT /api/pacientes/:id',
        eliminar: 'DELETE /api/pacientes/:id'
      },
      expedientes: { // ⭐ NUEVOS ENDPOINTS
        listar: 'GET /api/expedientes',
        crear: 'POST /api/expedientes',
        obtener: 'GET /api/expedientes/:id',
        actualizar: 'PUT /api/expedientes/:id',
        eliminar: 'DELETE /api/expedientes/:id',
        disponibles: 'GET /api/expedientes/disponibles',
        generarNumero: 'GET /api/expedientes/generar-numero',
        estadisticas: 'GET /api/expedientes/estadisticas'
      },
      archivos: {
        subir: 'POST /api/files/upload',
        ver: 'GET /api/files/view/:fileName',
        eliminar: 'DELETE /api/files/delete/:pacienteId/:tipo',
        paciente: 'GET /api/files/patient/:pacienteId'
      },
      historial: {
        obtener: 'GET /api/historial/paciente/:idpaciente',
        crear: 'POST /api/historial/crear-sesion',
        actualizar: 'PUT /api/historial/actualizar-sesion/:idhistorial',
        subirArchivos: 'POST /api/historial/subir-archivos/:idpaciente'
      }
    }
  });
});

// ========================
// MANEJO DE ERRORES
// ========================

// Middleware para rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`
  });
});

// 🔧 MIDDLEWARE MEJORADO PARA MANEJO DE ERRORES
app.use((error, req, res, next) => {
  console.error('❌ Error no manejado:', error);
  
  // 🆕 Manejo especial para errores de parsing JSON (el error que tenías)
  if (error.type === 'entity.parse.failed') {
    console.error('❌ Error de parsing JSON en ruta:', req.path);
    return res.status(400).json({
      success: false,
      message: 'Error al procesar los datos enviados. Verifique el formato.'
    });
  }
  
  // Errores de multer (archivos)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es muy grande. Máximo 5MB permitido.'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Campo de archivo inesperado.'
    });
  }
  
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      message: 'Archivo no encontrado.'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    })
  });
});

// ========================
// INICIALIZAR SERVIDOR
// ========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`📁 Archivos se guardarán en: uploads/pacientes/`);
  console.log(`🔧 Middleware configurado para manejar archivos correctamente`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

module.exports = app;