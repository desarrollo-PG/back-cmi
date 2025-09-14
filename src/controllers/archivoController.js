const { fileService } = require('../services/fileService');

class ArchivoController {

  /**
   * Sube foto genérica
   * POST /api/archivo/:entidad/subirFoto
   */
  async subirFoto(req, res) {
    try {
      const { entidad } = req.params; // usuarios, pacientes, productos, etc.
      const { entityId } = req.body; // usuarioId, pacienteId, productoId, etc.
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No se encontró archivo de foto'
        });
      }

      // Usar el servicio genérico dinámicamente
      const filePath = await fileService.uploadFiles(`${entidad}/fotos`, { foto: file });

      res.json({
        success: true,
        message: 'Foto subida correctamente',
        data: {
          rutaArchivo: filePath.foto
        }
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al subir foto'
      });
    }
  }

  /**
   * Sube documento genérico
   * POST /api/archivo/:entidad/subirDocumento
   */
  async subirDocumento(req, res) {
    try {
      const { entidad } = req.params;
      const { entityId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No se encontró archivo de documento'
        });
      }

      const filePath = await fileService.uploadFiles(`${entidad}/documentos`, { documento: file });

      res.json({
        success: true,
        message: 'Documento subido correctamente',
        data: {
          rutaArchivo: filePath.documento
        }
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al subir documento'
      });
    }
  }

  /**
   * Sube ambos archivos genérico
   */
  async subirArchivos(req, res) {
    try {
      const { entidad } = req.params;
      const { entityId } = req.body;
      const files = req.files;

      const archivosSubidos = {};

      if (files.foto && files.foto[0]) {
        const fotoPath = await fileService.uploadFiles(`${entidad}/fotos`, { foto: files.foto[0] });
        archivosSubidos.rutaFoto = fotoPath.foto;
      }

      if (files.documento && files.documento[0]) {
        const docPath = await fileService.uploadFiles(`${entidad}/documentos`, { documento: files.documento[0] });
        archivosSubidos.rutaDocumento = docPath.documento;
      }

      res.json({
        success: true,
        message: 'Archivos subidos correctamente',
        data: archivosSubidos
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al subir archivos'
      });
    }
  }

  // eliminarArchivo permanece igual (ya es genérico)
  async eliminarArchivo(req, res) {
    // ... código actual sin cambios
  }
}

module.exports = { ArchivoController };