const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const BASE_UPLOAD_PATH = process.env.UPLOAD_BASE_PATH;

class FileService {

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    return `${nameWithoutExt}_${timestamp}_${random}${ext}`;
  }

  /**
   * Sube archivos a una ruta específica
   * @param {string} uploadPath - Ruta relativa 
   * @param {Object} files - Archivos 
   * @returns {Object} Rutas relativas para guardar en BD
   */
  async uploadFiles(uploadPath, files) {
    const savedFiles = {};

    try {
      const fullUploadPath = path.join(BASE_UPLOAD_PATH, uploadPath);
      await this.ensureDirectoryExists(fullUploadPath);

      for (const [fieldName, file] of Object.entries(files)) {
        if (!file) continue;

        const uniqueFileName = this.generateUniqueFileName(file.originalname);
        const fullFilePath = path.join(fullUploadPath, uniqueFileName);
        const relativeFilePath = path.join(uploadPath, uniqueFileName);

        if (file.path) {
          await fs.rename(file.path, fullFilePath);
        } else {
          await fs.writeFile(fullFilePath, file.buffer);
        }

        savedFiles[fieldName] = relativeFilePath.replace(/\\/g, '/'); 
      }

      return savedFiles;

    } catch (error) {
      console.error('Error subiendo archivos:', error);
      throw error;
    }
  }

  createGenericMiddleware(allowedTypes = ['image', 'document'], maxFiles = 10) {
    const self = this;

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

  async deleteFile(relativePath) {
    try {
      const fullPath = path.join(BASE_UPLOAD_PATH, relativePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      // Si el archivo ya no existe, el resultado que se buscaba (que no exista)
      // ya se cumple: no es un error, para no dejar atascada la referencia en BD.
      if (error.code === 'ENOENT') {
        return true;
      }
      console.error('Error eliminando archivo:', error);
      return false;
    }
  }

  getFullPath(relativePath) {
    return path.join(BASE_UPLOAD_PATH, relativePath);
  }
}

const fileService = new FileService();
module.exports = { fileService };