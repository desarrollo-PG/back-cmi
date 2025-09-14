const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Ruta base desde .env o por defecto
const BASE_UPLOAD_PATH = process.env.UPLOAD_BASE_PATH;

class FileService {

  /**
   * Asegura que el directorio existe
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Genera nombre único para archivo
   */
  generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    return `${nameWithoutExt}_${timestamp}_${random}${ext}`;
  }

  /**
   * Sube archivos a una ruta específica
   * @param {string} uploadPath - Ruta relativa (ej: "usuarios/fotos") 
   * @param {Object} files - Archivos { fieldName: File }
   * @returns {Object} Rutas relativas para guardar en BD
   */
  async uploadFiles(uploadPath, files) {
    const savedFiles = {};

    try {
      // Crear directorio
      const fullUploadPath = path.join(BASE_UPLOAD_PATH, uploadPath);
      await this.ensureDirectoryExists(fullUploadPath);

      // Procesar cada archivo
      for (const [fieldName, file] of Object.entries(files)) {
        if (!file) continue;

        // Generar nombre único
        const uniqueFileName = this.generateUniqueFileName(file.originalname);
        const fullFilePath = path.join(fullUploadPath, uniqueFileName);
        const relativeFilePath = path.join(uploadPath, uniqueFileName);

        // Mover archivo (multer ya lo guardó temporalmente)
        if (file.path) {
          await fs.rename(file.path, fullFilePath);
        } else {
          await fs.writeFile(fullFilePath, file.buffer);
        }

        savedFiles[fieldName] = relativeFilePath.replace(/\\/g, '/'); // Normalizar separadores
      }

      return savedFiles;

    } catch (error) {
      console.error('Error subiendo archivos:', error);
      throw error;
    }
  }

  /**
   * Crea middleware de multer
   */
  createGenericMiddleware(allowedTypes = ['image', 'document'], maxFiles = 10) {
    const self = this; // Para acceder a 'this' dentro de las funciones

    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const tempPath = path.join(BASE_UPLOAD_PATH, 'temp');
          await self.ensureDirectoryExists(tempPath);
          cb(null, tempPath);
        } catch (error) {
          cb(error, '');
        }
      },
      filename: (req, file, cb) => {
        const uniqueName = self.generateUniqueFileName(file.originalname);
        cb(null, uniqueName);
      }
    });

    const fileFilter = (req, file, cb) => {
      let isValid = false;

      if (allowedTypes.includes('image') && file.mimetype.startsWith('image/')) {
        isValid = true;
      }
      if (allowedTypes.includes('document') && file.mimetype === 'application/pdf') {
        isValid = true;
      }

      if (isValid) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no permitido'));
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: maxFiles
      }
    });
  }

  /**
   * Elimina archivo
   */
  async deleteFile(relativePath) {
    try {
      const fullPath = path.join(BASE_UPLOAD_PATH, relativePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      return false;
    }
  }

  /**
   * Obtiene ruta completa
   */
  getFullPath(relativePath) {
    return path.join(BASE_UPLOAD_PATH, relativePath);
  }
}

// Exportar instancia única
const fileService = new FileService();
module.exports = { fileService };