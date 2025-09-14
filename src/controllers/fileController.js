// controllers/fileController.js 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// 🔧 CONFIGURACIÓN DE MULTER CORREGIDA
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      console.log('📁 === CONFIGURANDO DESTINO ===');
      console.log('Request body:', req.body);
      console.log('File info:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype
      });

      // Crear estructura: uploads/pacientes/año/mes
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      // ✅ RUTA ABSOLUTA CORREGIDA
      const uploadPath = path.join(__dirname, '../uploads/pacientes', year.toString(), month);
      
      console.log('📂 Ruta de destino calculada:', uploadPath);
      
      // Crear directorio si no existe
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log('✅ Directorio creado exitosamente:', uploadPath);
      } else {
        console.log('✅ Directorio ya existe:', uploadPath);
      }
      
      // ✅ VERIFICAR PERMISOS DE ESCRITURA
      try {
        fs.accessSync(uploadPath, fs.constants.W_OK);
        console.log('✅ Permisos de escritura verificados');
      } catch (permError) {
        console.error('❌ Sin permisos de escritura:', permError);
        return cb(new Error('Sin permisos de escritura en el directorio'), null);
      }
      
      cb(null, uploadPath);
    } catch (error) {
      console.error('❌ Error en destination:', error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    try {
      console.log('📝 === GENERANDO NOMBRE DE ARCHIVO ===');
      console.log('Request body en filename:', req.body);
      
      const pacienteId = req.body?.pacienteId;
      const tipo = req.body?.tipo;
      
      if (!pacienteId || !tipo) {
        console.error('❌ Faltan datos para generar nombre:', { pacienteId, tipo });
        return cb(new Error('pacienteId y tipo son requeridos'), null);
      }
      
      const extension = path.extname(file.originalname).toLowerCase();
      const timestamp = Date.now();
      const fileName = `paciente_${pacienteId}_${tipo}_${timestamp}${extension}`;
      
      console.log('✅ Nombre de archivo generado:', fileName);
      cb(null, fileName);
    } catch (error) {
      console.error('❌ Error en filename:', error);
      cb(error, null);
    }
  }
});

// 🔧 FILTRO DE ARCHIVOS MEJORADO
const fileFilter = (req, file, cb) => {
  try {
    console.log('🔍 === VALIDANDO ARCHIVO ===');
    console.log('File details:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    console.log('Request body en filter:', req.body);
    
    const { tipo } = req.body;
    
    // ✅ VALIDAR QUE EL TIPO ESTÉ PRESENTE
    if (!tipo) {
      console.error('❌ Tipo de archivo no especificado');
      return cb(new Error('Tipo de archivo no especificado'), false);
    }
    
    // ✅ TIPOS PERMITIDOS SEGÚN EL TIPO DE ARCHIVO
    const allowedMimes = {
      'perfil': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      'encargado': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      'carta': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    };

    // ✅ VERIFICAR SI EL TIPO ES VÁLIDO
    if (!allowedMimes[tipo]) {
      console.error('❌ Tipo no válido:', tipo);
      return cb(new Error(`Tipo de archivo no válido: ${tipo}. Tipos permitidos: ${Object.keys(allowedMimes).join(', ')}`), false);
    }

    // ✅ VERIFICAR SI EL MIMETYPE ES PERMITIDO
    if (allowedMimes[tipo].includes(file.mimetype)) {
      console.log('✅ Archivo aceptado');
      cb(null, true);
    } else {
      console.error('❌ Archivo rechazado - mimetype no permitido');
      const allowedTypes = allowedMimes[tipo].join(', ');
      cb(new Error(`Tipo de archivo no permitido para ${tipo}. Tipos permitidos: ${allowedTypes}`), false);
    }
  } catch (error) {
    console.error('❌ Error en fileFilter:', error);
    cb(error, false);
  }
};

// 🔧 CONFIGURACIÓN DE MULTER
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1 // Solo un archivo por vez
  },
  onError: function(err, next) {
    console.error('❌ Error en multer:', err);
    next(err);
  }
});

class FileController {
  
  // 🚀 MÉTODO PRINCIPAL: Subir archivo
  static async uploadFile(req, res) {
    console.log('\n📤 ========== INICIO UPLOAD FILE ==========');
    console.log('📋 Headers:', req.headers);
    console.log('📋 Request Body:', req.body);
    console.log('📋 Request File:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
      path: req.file.path
    } : 'No file provided');

    try {
      // ✅ VALIDACIONES DE ENTRADA
      const { pacienteId, tipo } = req.body;
      const file = req.file;

      if (!pacienteId) {
        console.error('❌ pacienteId faltante');
        return res.status(400).json({
          success: false,
          message: 'pacienteId es requerido'
        });
      }

      if (!tipo) {
        console.error('❌ tipo faltante');
        return res.status(400).json({
          success: false,
          message: 'tipo es requerido (perfil, encargado, carta)'
        });
      }

      if (!file) {
        console.error('❌ archivo faltante');
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        });
      }

      // ✅ VALIDAR TIPOS PERMITIDOS
      const tiposPermitidos = ['perfil', 'encargado', 'carta'];
      if (!tiposPermitidos.includes(tipo)) {
        console.error('❌ tipo no válido:', tipo);
        // Limpiar archivo subido
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log('🗑️ Archivo temporal eliminado');
        }
        return res.status(400).json({
          success: false,
          message: `Tipo no válido. Tipos permitidos: ${tiposPermitidos.join(', ')}`
        });
      }

      // ✅ VALIDAR QUE EL PACIENTE EXISTE
      console.log('🔍 Validando existencia del paciente:', pacienteId);
      const paciente = await prisma.paciente.findUnique({
        where: { idpaciente: parseInt(pacienteId) }
      });

      if (!paciente) {
        console.error('❌ Paciente no encontrado:', pacienteId);
        // Limpiar archivo si el paciente no existe
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log('🗑️ Archivo temporal eliminado');
        }
        return res.status(404).json({
          success: false,
          message: `Paciente con ID ${pacienteId} no encontrado`
        });
      }

      console.log('✅ Paciente encontrado:', {
        id: paciente.idpaciente,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos
      });

      // ✅ VERIFICAR QUE EL ARCHIVO SE GUARDÓ CORRECTAMENTE
      if (!fs.existsSync(file.path)) {
        console.error('❌ El archivo no se guardó correctamente:', file.path);
        return res.status(500).json({
          success: false,
          message: 'Error al guardar el archivo en el servidor'
        });
      }

      console.log('✅ Archivo guardado correctamente en:', file.path);

      // ✅ CONSTRUIR RUTA RELATIVA
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const relativePath = path.join('uploads', 'pacientes', year.toString(), month, file.filename).replace(/\\/g, '/');

      console.log('📂 Ruta relativa calculada:', relativePath);

      // ✅ PREPARAR DATOS PARA ACTUALIZAR
      const updateData = {};
      let campoActualizado = '';

      // ✅ MANEJAR ARCHIVO ANTERIOR Y DETERMINAR CAMPO A ACTUALIZAR
      switch (tipo) {
        case 'perfil':
          // Eliminar foto anterior si existe
          if (paciente.rutafotoperfil) {
            const oldPath = path.join(__dirname, '..', paciente.rutafotoperfil);
            console.log('🗑️ Eliminando foto anterior de perfil:', oldPath);
            if (fs.existsSync(oldPath)) {
              try {
                fs.unlinkSync(oldPath);
                console.log('✅ Foto anterior de perfil eliminada');
              } catch (error) {
                console.warn('⚠️ Error al eliminar foto anterior de perfil:', error.message);
              }
            }
          }
          updateData.rutafotoperfil = relativePath;
          campoActualizado = 'rutafotoperfil';
          break;

        case 'encargado':
          // Eliminar foto anterior si existe
          if (paciente.rutafotoencargado) {
            const oldPath = path.join(__dirname, '..', paciente.rutafotoencargado);
            console.log('🗑️ Eliminando foto anterior del encargado:', oldPath);
            if (fs.existsSync(oldPath)) {
              try {
                fs.unlinkSync(oldPath);
                console.log('✅ Foto anterior del encargado eliminada');
              } catch (error) {
                console.warn('⚠️ Error al eliminar foto anterior del encargado:', error.message);
              }
            }
          }
          updateData.rutafotoencargado = relativePath;
          campoActualizado = 'rutafotoencargado';
          break;

        case 'carta':
          // Eliminar carta anterior si existe
          if (paciente.rutacartaautorizacion) {
            const oldPath = path.join(__dirname, '..', paciente.rutacartaautorizacion);
            console.log('🗑️ Eliminando carta anterior:', oldPath);
            if (fs.existsSync(oldPath)) {
              try {
                fs.unlinkSync(oldPath);
                console.log('✅ Carta anterior eliminada');
              } catch (error) {
                console.warn('⚠️ Error al eliminar carta anterior:', error.message);
              }
            }
          }
          updateData.rutacartaautorizacion = relativePath;
          campoActualizado = 'rutacartaautorizacion';
          break;

        default:
          console.error('❌ Tipo de archivo no válido en switch:', tipo);
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({
            success: false,
            message: 'Tipo de archivo no válido'
          });
      }

      // ✅ ACTUALIZAR BASE DE DATOS
      console.log('💾 Actualizando base de datos con:', updateData);
      const updatedPaciente = await prisma.paciente.update({
        where: { idpaciente: parseInt(pacienteId) },
        data: updateData
      });

      console.log('✅ Base de datos actualizada exitosamente');

      // ✅ RESPUESTA EXITOSA
      const response = {
        success: true,
        message: `Archivo de ${tipo} subido exitosamente`,
        data: {
          fileName: file.filename,
          filePath: relativePath,
          fileUrl: `/api/files/view/${file.filename}`,
          tipo: tipo,
          campoActualizado: campoActualizado,
          pacienteId: parseInt(pacienteId),
          fileSize: file.size,
          mimeType: file.mimetype,
          originalName: file.originalname
        }
      };

      console.log('✅ Respuesta exitosa:', response);
      console.log('📤 ========== FIN UPLOAD FILE ==========\n');
      
      return res.status(200).json(response);

    } catch (error) {
      console.error('❌ ========== ERROR EN UPLOAD FILE ==========');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      
      // ✅ LIMPIAR ARCHIVO EN CASO DE ERROR
      if (req.file && req.file.path) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log('🗑️ Archivo temporal eliminado después del error');
          }
        } catch (unlinkError) {
          console.error('❌ Error al eliminar archivo temporal:', unlinkError);
        }
      }

      // ✅ DETERMINAR TIPO DE ERROR Y RESPUESTA APROPIADA
      let statusCode = 500;
      let message = 'Error interno del servidor';

      if (error.message.includes('Prisma')) {
        statusCode = 500;
        message = 'Error de base de datos';
      } else if (error.message.includes('no encontrado')) {
        statusCode = 404;
        message = error.message;
      } else if (error.message.includes('no permitido') || error.message.includes('no válido')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message.includes('requerido')) {
        statusCode = 400;
        message = error.message;
      }

      return res.status(statusCode).json({
        success: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined,
        details: process.env.NODE_ENV === 'development' ? {
          pacienteId: req.body?.pacienteId,
          tipo: req.body?.tipo,
          fileName: req.file?.filename,
          filePath: req.file?.path
        } : undefined
      });
    }
  }

  // 👁️ MÉTODO PARA VISUALIZAR ARCHIVOS
  static async viewFile(req, res) {
    console.log('\n👁️ ========== VIEW FILE REQUEST ==========');
    
    try {
      const { fileName } = req.params;
      
      console.log('🔍 Archivo solicitado:', fileName);

      if (!fileName || fileName.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Nombre de archivo requerido'
        });
      }
      
      // ✅ BUSCAR ARCHIVO EN LA ESTRUCTURA DE DIRECTORIOS
      const uploadsDir = path.join(__dirname, '../uploads/pacientes');
      console.log('📂 Directorio base de búsqueda:', uploadsDir);

      if (!fs.existsSync(uploadsDir)) {
        console.error('❌ Directorio de uploads no existe:', uploadsDir);
        return res.status(404).json({
          success: false,
          message: 'Directorio de archivos no encontrado'
        });
      }

      // ✅ FUNCIÓN RECURSIVA PARA BUSCAR ARCHIVOS
      function findFileRecursively(dir, target) {
        try {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              const result = findFileRecursively(fullPath, target);
              if (result) return result;
            } else if (item === target) {
              console.log('✅ Archivo encontrado en:', fullPath);
              return fullPath;
            }
          }
        } catch (error) {
          console.warn('⚠️ Error al leer directorio:', dir, error.message);
        }
        
        return null;
      }

      const filePath = findFileRecursively(uploadsDir, fileName);

      if (!filePath || !fs.existsSync(filePath)) {
        console.error('❌ Archivo no encontrado:', fileName);
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      console.log('✅ Archivo localizado:', filePath);

      // ✅ DETERMINAR TIPO DE CONTENIDO
      const ext = path.extname(fileName).toLowerCase();
      const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.webp': 'image/webp'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      console.log('📄 Tipo de contenido:', contentType);

      // ✅ CONFIGURAR HEADERS DE RESPUESTA
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // ✅ ENVIAR ARCHIVO
      res.sendFile(filePath, (error) => {
        if (error) {
          console.error('❌ Error al enviar archivo:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error al enviar el archivo'
            });
          }
        } else {
          console.log('✅ Archivo enviado exitosamente:', fileName);
        }
      });

    } catch (error) {
      console.error('❌ Error en viewFile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // 🗑️ MÉTODO PARA ELIMINAR ARCHIVOS
  static async deleteFile(req, res) {
    console.log('\n🗑️ ========== DELETE FILE REQUEST ==========');
    
    try {
      const { pacienteId, tipo } = req.params;
      
      console.log('🔍 Parámetros de eliminación:', { pacienteId, tipo });

      // ✅ VALIDACIONES
      if (!pacienteId || !tipo) {
        return res.status(400).json({
          success: false,
          message: 'pacienteId y tipo son requeridos'
        });
      }

      const tiposPermitidos = ['perfil', 'encargado', 'carta'];
      if (!tiposPermitidos.includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: `Tipo no válido. Tipos permitidos: ${tiposPermitidos.join(', ')}`
        });
      }
      
      // ✅ BUSCAR EL PACIENTE
      const paciente = await prisma.paciente.findUnique({
        where: { idpaciente: parseInt(pacienteId) }
      });

      if (!paciente) {
        console.error('❌ Paciente no encontrado:', pacienteId);
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      console.log('✅ Paciente encontrado para eliminación');

      // ✅ DETERMINAR QUÉ ARCHIVO ELIMINAR
      let filePath = null;
      const updateData = {};
      let campoActualizado = '';

      switch (tipo) {
        case 'perfil':
          filePath = paciente.rutafotoperfil;
          updateData.rutafotoperfil = null;
          campoActualizado = 'rutafotoperfil';
          break;
        case 'encargado':
          filePath = paciente.rutafotoencargado;
          updateData.rutafotoencargado = null;
          campoActualizado = 'rutafotoencargado';
          break;
        case 'carta':
          filePath = paciente.rutacartaautorizacion;
          updateData.rutacartaautorizacion = null;
          campoActualizado = 'rutacartaautorizacion';
          break;
      }

      console.log('📂 Ruta del archivo a eliminar:', filePath);

      // ✅ ELIMINAR ARCHIVO FÍSICO
      if (filePath) {
        const fullPath = path.join(__dirname, '..', filePath);
        console.log('🗑️ Ruta completa del archivo:', fullPath);
        
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            console.log('✅ Archivo físico eliminado exitosamente');
          } catch (unlinkError) {
            console.warn('⚠️ Error al eliminar archivo físico:', unlinkError.message);
            // Continuar con la actualización de la base de datos
          }
        } else {
          console.warn('⚠️ Archivo físico no existe en la ruta especificada');
        }
      } else {
        console.log('ℹ️ No hay archivo que eliminar para este tipo');
      }

      // ✅ ACTUALIZAR BASE DE DATOS
      console.log('💾 Actualizando base de datos:', updateData);
      await prisma.paciente.update({
        where: { idpaciente: parseInt(pacienteId) },
        data: updateData
      });

      console.log('✅ Base de datos actualizada exitosamente');

      return res.json({
        success: true,
        message: `Archivo de ${tipo} eliminado exitosamente`,
        data: {
          pacienteId: parseInt(pacienteId),
          tipo: tipo,
          campoActualizado: campoActualizado,
          archivoEliminado: filePath || 'No había archivo'
        }
      });

    } catch (error) {
      console.error('❌ Error en deleteFile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // 📋 MÉTODO PARA OBTENER INFORMACIÓN DE ARCHIVOS DE UN PACIENTE
  static async getPatientFiles(req, res) {
    console.log('\n📋 ========== GET PATIENT FILES ==========');
    
    try {
      const { pacienteId } = req.params;

      if (!pacienteId) {
        return res.status(400).json({
          success: false,
          message: 'pacienteId es requerido'
        });
      }

      const paciente = await prisma.paciente.findUnique({
        where: { idpaciente: parseInt(pacienteId) },
        select: {
          idpaciente: true,
          nombres: true,
          apellidos: true,
          rutafotoperfil: true,
          rutafotoencargado: true,
          rutacartaautorizacion: true
        }
      });

      if (!paciente) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      // ✅ VERIFICAR EXISTENCIA DE ARCHIVOS
      const files = {
        perfil: paciente.rutafotoperfil ? {
          path: paciente.rutafotoperfil,
          url: `/api/files/view/${path.basename(paciente.rutafotoperfil)}`,
          exists: fs.existsSync(path.join(__dirname, '..', paciente.rutafotoperfil))
        } : null,
        encargado: paciente.rutafotoencargado ? {
          path: paciente.rutafotoencargado,
          url: `/api/files/view/${path.basename(paciente.rutafotoencargado)}`,
          exists: fs.existsSync(path.join(__dirname, '..', paciente.rutafotoencargado))
        } : null,
        carta: paciente.rutacartaautorizacion ? {
          path: paciente.rutacartaautorizacion,
          url: `/api/files/view/${path.basename(paciente.rutacartaautorizacion)}`,
          exists: fs.existsSync(path.join(__dirname, '..', paciente.rutacartaautorizacion))
        } : null
      };

      return res.json({
        success: true,
        message: 'Archivos del paciente obtenidos exitosamente',
        data: {
          paciente: {
            id: paciente.idpaciente,
            nombres: paciente.nombres,
            apellidos: paciente.apellidos
          },
          files: files
        }
      });

    } catch (error) {
      console.error('❌ Error en getPatientFiles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// ✅ MIDDLEWARE DE MANEJO DE ERRORES DE MULTER
const handleMulterError = (err, req, res, next) => {
  console.error('❌ Error de Multer:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es muy grande. Máximo 5MB permitido.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Solo se permite un archivo por vez.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado.'
      });
    }
  }
  
  // Error personalizado del fileFilter
  if (err.message.includes('no permitido') || err.message.includes('no válido')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Error al procesar el archivo',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = { FileController, upload, handleMulterError };