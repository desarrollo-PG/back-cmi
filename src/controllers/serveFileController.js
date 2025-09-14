const { fileService } = require('../services/fileService');
const path = require('path');
const fs = require('fs').promises;

class ServeFileController {

  /**
   * Sirve archivos de forma completamente genérica
   * Busca en todas las subcarpetas automáticamente
   */
  async serveFile(req, res) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Filename requerido'
        });
      }

      // Buscar el archivo
      const foundPath = await this.findFileRecursively(filename);

      if (!foundPath) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      // HEADERS CORS MEJORADOS para imágenes
      res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

      // Configurar Content-Type correcto
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf'
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      // IMPORTANTE: Para imágenes, usar res.sendFile con headers apropiados
      res.sendFile(foundPath);

    } catch (error) {
      console.error('Error sirviendo archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Busca un archivo recursivamente en todas las subcarpetas
   */
  async findFileRecursively(filename) {
    const basePath = process.env.UPLOAD_BASE_PATH || 'C:\\proyecto-CMI\\uploads';
    
    try {
      // Función recursiva para buscar en todas las carpetas
      const searchInDirectory = async (dirPath) => {
        try {
          const items = await fs.readdir(dirPath, { withFileTypes: true });
          
          for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            
            if (item.isDirectory()) {
              // Si es directorio, buscar recursivamente
              const result = await searchInDirectory(fullPath);
              if (result) return result;
            } else if (item.name === filename) {
              // Si es el archivo que buscamos, retornarlo
              return fullPath;
            }
          }
        } catch (error) {
          // Si no puede leer el directorio, continuar
          return null;
        }
        return null;
      };

      return await searchInDirectory(basePath);
    } catch (error) {
      console.error('Error buscando archivo:', error);
      return null;
    }
  }
}

module.exports = { ServeFileController };