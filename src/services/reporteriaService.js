
const { prisma } = require('../config/prisma');
const PDFDocument = require('pdfkit');

function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
}

function truncarTexto(texto, maxLength) {
  if (!texto) return '';
  texto = String(texto);
  if (texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength - 3) + '...';
}

function esFechaValida(fecha) {
  if (!fecha || fecha === '' || fecha === null || fecha === undefined) return false;
  const date = new Date(fecha);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Convierte string de fecha (YYYY-MM-DD) a Date en hora local
 * Evita problemas de zona horaria
 */
function parsearFechaLocal(fechaString, horaFin = false) {
  if (!esFechaValida(fechaString)) return null;
  
  // Parsear string en formato YYYY-MM-DD
  const [year, month, day] = fechaString.split('-').map(Number);
  
  // Crear fecha en hora local (no UTC)
  const date = new Date(year, month - 1, day);
  
  if (horaFin) {
    // HASTA: final del día (23:59:59.999)
    date.setHours(23, 59, 59, 999);
  } else {
    // DESDE: inicio del día (00:00:00)
    date.setHours(0, 0, 0, 0);
  }
  
  return date;
}

function generarPDFDashboard(doc, data) {
  doc.fontSize(14).font('Helvetica-Bold').text('Estadísticas Generales', { underline: true });
  doc.moveDown(0.5);
  
  doc.fontSize(10).font('Helvetica');
  
  doc.font('Helvetica-Bold').text('Pacientes:');
  doc.font('Helvetica')
    .text(`  Total: ${data.pacientes.total}`)
    .text(`  Activos: ${data.pacientes.activos}`)
    .text(`  Nuevos este mes: ${data.pacientes.nuevosMes}`);
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').text('Consultas:');
  doc.font('Helvetica').text(`  Total este mes: ${data.consultas.totalMes}`);
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').text('Inventario:');
  doc.font('Helvetica')
    .text(`  Total medicamentos: ${data.inventario.total}`)
    .text(`  Activos: ${data.inventario.activos}`)
    .text(`  Alertas stock bajo: ${data.inventario.alertasStockBajo}`)
    .text(`  Próximos a vencer: ${data.inventario.proximosVencer}`)
    .text(`  Valor total: Q${data.inventario.valorTotal.toFixed(2)}`);
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').text('Referencias:');
  doc.font('Helvetica')
    .text(`  Total: ${data.referencias.total}`)
    .text(`  Enviadas: ${data.referencias.enviadas}`)
    .text(`  Recibidas: ${data.referencias.recibidas}`)
    .text(`  Pendientes: ${data.referencias.pendientes}`)
    .text(`  Completadas: ${data.referencias.completadas}`);
}

function generarTablaPacientesPDF(doc, datos) {
  const headers = ['Nombre', 'CUI', 'Género', 'Edad', 'F.Nac', 'Tel.Personal', 'Municipio', 'Aldea', 'Dirección'];
  const colWidths = [80, 70, 40, 30, 55, 60, 70, 60, 85];
  const startX = 30;
  
  function dibujarHeaders(yPos) {
    doc.fontSize(7).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x, yPos, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });
    doc.moveTo(startX, yPos + 10).lineTo(startX + 550, yPos + 10).stroke();
    return yPos + 14;
  }
  
  let y = dibujarHeaders(doc.y);

  if (!datos || !datos.data || datos.data.length === 0) {
    doc.font('Helvetica').fontSize(10);
    doc.text('No hay datos para mostrar', startX, y);
    return;
  }

  doc.font('Helvetica').fontSize(6);
  
  datos.data.forEach((item) => {
    if (y > 730) {
      doc.addPage();
      y = 50;
      y = dibujarHeaders(y);
      doc.font('Helvetica').fontSize(6);
    }

    const edad = calcularEdad(item.fechanacimiento);
    const row = [
      truncarTexto(`${item.nombres || ''} ${item.apellidos || ''}`, 18),
      truncarTexto(item.cui || 'N/A', 13),
      item.genero === 'M' ? 'M' : 'F',
      `${edad}`,
      new Date(item.fechanacimiento).toLocaleDateString('es-GT'),
      truncarTexto(item.telefonopersonal || 'N/A', 12),
      truncarTexto(item.municipio || 'N/A', 15),
      truncarTexto(item.aldea || 'N/A', 12),
      truncarTexto(item.direccion || 'N/A', 18)
    ];

    let x = startX;
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });

    y += 14;
  });
  
  // SEGUNDA PÁGINA: Datos adicionales del paciente
  doc.addPage();
  doc.fontSize(12).font('Helvetica-Bold').text('Información Adicional de Pacientes', 50, 50);
  doc.moveDown(1);
  
  const headers2 = ['Nombre', 'Exp.', 'Contacto Emerg.', 'Tel.Emerg.', 'Encargado', 'DPI Enc.', 'Tel.Enc.'];
  const colWidths2 = [100, 50, 95, 65, 95, 65, 65];
  const startX2 = 30;
  
  function dibujarHeaders2(yPos) {
    doc.fontSize(7).font('Helvetica-Bold');
    let x = startX2;
    headers2.forEach((header, i) => {
      doc.text(header, x, yPos, { width: colWidths2[i], continued: false });
      x += colWidths2[i];
    });
    doc.moveTo(startX2, yPos + 10).lineTo(startX2 + 535, yPos + 10).stroke();
    return yPos + 14;
  }
  
  y = dibujarHeaders2(doc.y);
  doc.font('Helvetica').fontSize(6);
  
  datos.data.forEach((item) => {
    if (y > 730) {
      doc.addPage();
      y = 50;
      y = dibujarHeaders2(y);
      doc.font('Helvetica').fontSize(6);
    }

    const numeroExpediente = item.expedientes && item.expedientes.length > 0 
      ? item.expedientes[0].numeroexpediente 
      : 'Sin Exp.';

    const row = [
      truncarTexto(`${item.nombres || ''} ${item.apellidos || ''}`, 20),
      truncarTexto(numeroExpediente, 10),
      truncarTexto(item.nombrecontactoemergencia || 'N/A', 18),
      truncarTexto(item.telefonoemergencia || 'N/A', 12),
      truncarTexto(item.nombreencargado || 'N/A', 18),
      truncarTexto(item.dpiencargado || 'N/A', 12),
      truncarTexto(item.telefonoencargado || 'N/A', 12)
    ];

    let x = startX2;
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths2[i], continued: false });
      x += colWidths2[i];
    });

    y += 14;
  });
}

function generarTablaConsultasPDF(doc, datos) {
  const headers = ['Fecha', 'Paciente', 'F.Nac', 'Médico', 'Clínica'];
  const colWidths = [60, 110, 60, 110, 120];
  const startX = 40;
  
  function dibujarHeaders(yPos) {
    doc.fontSize(8).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x, yPos, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });
    doc.moveTo(startX, yPos + 12).lineTo(startX + 460, yPos + 12).stroke();
    return yPos + 18;
  }
  
  let y = dibujarHeaders(doc.y);

  if (!datos || !datos.data || datos.data.length === 0) {
    doc.font('Helvetica').fontSize(10);
    doc.text('No hay datos para mostrar', startX, y);
    return;
  }

  doc.font('Helvetica').fontSize(7);
  
  datos.data.forEach((item) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
      y = dibujarHeaders(y);
      doc.font('Helvetica').fontSize(7);
    }

    const row = [
      new Date(item.fecha).toLocaleDateString('es-GT'),
      truncarTexto(`${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`, 25),
      item.paciente?.fechanacimiento ? new Date(item.paciente.fechanacimiento).toLocaleDateString('es-GT') : 'N/A',
      truncarTexto(`${item.usuario?.nombres || ''} ${item.usuario?.apellidos || ''}`, 25),
      truncarTexto(item.usuario?.clinica?.nombreclinica || 'N/A', 25)
    ];

    let x = startX;
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });

    y += 18;
  });
  
  doc.addPage();
  doc.fontSize(12).font('Helvetica-Bold').text('Detalles de Consultas', 50, 50);
  doc.moveDown(1);
  
  const headers2 = ['Paciente', 'Recordatorio', 'Nota', 'Motivo', 'Evolución', 'Diagnóstico'];
  const colWidths2 = [85, 85, 85, 85, 85, 85];
  const startX2 = 30;
  
  function dibujarHeaders2(yPos) {
    doc.fontSize(7).font('Helvetica-Bold');
    let x = startX2;
    headers2.forEach((header, i) => {
      doc.text(header, x, yPos, { width: colWidths2[i], continued: false });
      x += colWidths2[i];
    });
    doc.moveTo(startX2, yPos + 10).lineTo(startX2 + 510, yPos + 10).stroke();
    return yPos + 14;
  }
  
  y = dibujarHeaders2(doc.y);
  doc.font('Helvetica').fontSize(6);
  
  datos.data.forEach((item) => {
    const recordatorio = item.recordatorio || 'N/A';
    const nota = item.notaconsulta || 'N/A';
    const motivo = item.motivoconsulta || 'N/A';
    const evolucion = item.evolucion || 'N/A';
    const diagnostico = item.diagnosticotratamiento || 'N/A';
    
    const alturaMaxima = Math.max(
      doc.heightOfString(recordatorio, { width: colWidths2[1] }),
      doc.heightOfString(nota, { width: colWidths2[2] }),
      doc.heightOfString(motivo, { width: colWidths2[3] }),
      doc.heightOfString(evolucion, { width: colWidths2[4] }),
      doc.heightOfString(diagnostico, { width: colWidths2[5] }),
      14
    ) + 6;
    
    if (y + alturaMaxima > 730) {
      doc.addPage();
      y = 50;
      y = dibujarHeaders2(y);
      doc.font('Helvetica').fontSize(6);
    }

    const row = [
      truncarTexto(`${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`, 18),
      recordatorio,
      nota,
      motivo,
      evolucion,
      diagnostico
    ];

    let x = startX2;
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { 
        width: colWidths2[i], 
        align: 'left',
        lineBreak: true,
        continued: false
      });
      x += colWidths2[i];
    });

    y += alturaMaxima;
  });
}

function generarTablaInventarioPDF(doc, datos) {
  const headers = ['Medicamento', 'Unid.', 'Precio', 'F. Ingreso', 'F. Venc.', 'Estado'];
  const colWidths = [180, 40, 60, 80, 80, 50];
  const startX = 50;
  const startY = doc.y;
  
  function dibujarHeaders(yPos) {
    doc.fontSize(8).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x, yPos, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });
    doc.moveTo(startX, yPos + 12).lineTo(startX + 490, yPos + 12).stroke();
    return yPos + 18;
  }
  
  let y = dibujarHeaders(startY);

  if (!datos || !datos.data || datos.data.length === 0) {
    doc.font('Helvetica').fontSize(10);
    doc.text('No hay datos para mostrar', startX, y);
    return;
  }

  doc.font('Helvetica').fontSize(7);
  
  datos.data.forEach((item) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
      y = dibujarHeaders(y);
      doc.font('Helvetica').fontSize(7);
    }

    const row = [
      truncarTexto(item.nombre || '', 35),
      (item.unidades || 0).toString(),
      `Q${(item.precio || 0).toFixed(2)}`,
      item.fechaingreso ? new Date(item.fechaingreso).toLocaleDateString('es-GT') : 'N/A',
      item.fechavencimiento ? new Date(item.fechavencimiento).toLocaleDateString('es-GT') : 'N/A',
      item.estado === 1 ? 'Activo' : 'Inactivo'
    ];

    let x = startX;
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });

    y += 18;
  });
}

function generarTablaAgendaPDF(doc, datos) {
  const headers = ['Fecha', 'Hora', 'Paciente', 'Médico', 'Trans.', 'Comentario'];
  const colWidths = [70, 50, 110, 110, 40, 100];
  const startX = 50;
  const startY = doc.y;
  
  function dibujarHeaders(yPos) {
    doc.fontSize(8).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x, yPos, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });
    doc.moveTo(startX, yPos + 12).lineTo(startX + 480, yPos + 12).stroke();
    return yPos + 18;
  }
  
  function formatearHora(hora) {
    if (!hora) return '';
    if (typeof hora === 'string') {
      if (hora.includes(':')) {
        const partes = hora.split(':');
        return `${partes[0]}:${partes[1]}`;
      }
      return hora;
    }
    if (hora instanceof Date) {
      const horas = hora.getHours().toString().padStart(2, '0');
      const minutos = hora.getMinutes().toString().padStart(2, '0');
      return `${horas}:${minutos}`;
    }
    return String(hora);
  }
  
  let y = dibujarHeaders(startY);

  if (!datos || !datos.data || datos.data.length === 0) {
    doc.font('Helvetica').fontSize(10);
    doc.text('No hay datos para mostrar', startX, y);
    return;
  }

  doc.font('Helvetica').fontSize(7);
  
  datos.data.forEach((item) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
      y = dibujarHeaders(y);
      doc.font('Helvetica').fontSize(7);
    }

    const row = [
      new Date(item.fechaatencion).toLocaleDateString('es-GT'),
      formatearHora(item.horaatencion),
      truncarTexto(`${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`, 22),
      truncarTexto(`${item.usuario?.nombres || ''} ${item.usuario?.apellidos || ''}`, 22),
      item.transporte === 1 ? 'Sí' : 'No',
      truncarTexto(item.comentario || 'N/A', 30)
    ];

    let x = startX;
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });

    y += 18;
  });
}

function generarTablaReferenciasPDF(doc, datos) {
  const headers = ['Fecha', 'Paciente', 'N° Exp.', 'De', 'Para', 'Clínica', 'Estado'];
  const colWidths = [55, 85, 60, 85, 85, 90, 55];
  const startX = 35;
  const startY = doc.y;
  
  function dibujarHeaders(yPos) {
    doc.fontSize(7).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x, yPos, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });
    doc.moveTo(startX, yPos + 10).lineTo(startX + 515, yPos + 10).stroke();
    return yPos + 14;
  }
  
  let y = dibujarHeaders(startY);

  if (!datos || !datos.data || datos.data.length === 0) {
    doc.font('Helvetica').fontSize(10);
    doc.text('No hay datos para mostrar', startX, y);
    return;
  }

  doc.font('Helvetica').fontSize(6);
  
  datos.data.forEach((item) => {
    if (y > 730) {
      doc.addPage();
      y = 50;
      y = dibujarHeaders(y);
      doc.font('Helvetica').fontSize(6);
    }

    const usuarioConfirmador = item.usuarioconfirma4 || 'Pendiente';

    const row = [
      new Date(item.fechacreacion).toLocaleDateString('es-GT'),
      truncarTexto(`${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`, 18),
      truncarTexto(item.expediente?.numeroexpediente || 'N/A', 12),
      truncarTexto(`${item.usuario?.nombres || ''} ${item.usuario?.apellidos || ''}`, 18),
      truncarTexto(usuarioConfirmador, 18),
      truncarTexto(item.clinica?.nombreclinica || 'N/A', 18),
      item.confirmacion4 === 1 ? 'Completado' : 'Pendiente'
    ];

    let x = startX;
    row.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });

    y += 14;
  });
}

function generarPDFTabla(doc, tipoReporte, datosReporte) {
  switch (tipoReporte) {
    case 'pacientes':
      generarTablaPacientesPDF(doc, datosReporte);
      break;
    case 'consultas':
      generarTablaConsultasPDF(doc, datosReporte);
      break;
    case 'inventario':
      generarTablaInventarioPDF(doc, datosReporte);
      break;
    case 'agenda':
      generarTablaAgendaPDF(doc, datosReporte);
      break;
    case 'referencias':
      generarTablaReferenciasPDF(doc, datosReporte);
      break;
  }
}

function generarExcelPacientes(worksheet, datos) {
  worksheet.columns = [
    { header: 'Nombre Completo', key: 'nombre', width: 35 },
    { header: 'CUI', key: 'cui', width: 18 },
    { header: 'Género', key: 'genero', width: 12 },
    { header: 'Edad', key: 'edad', width: 10 },
    { header: 'Fecha Nacimiento', key: 'fechaNacimiento', width: 18 },
    { header: 'Teléfono Personal', key: 'telefonoPersonal', width: 18 },
    { header: 'Municipio', key: 'municipio', width: 25 },
    { header: 'Aldea', key: 'aldea', width: 25 },
    { header: 'Dirección', key: 'direccion', width: 40 },
    { header: 'N° Expediente', key: 'numeroExpediente', width: 20 },
    { header: 'Contacto Emergencia', key: 'contactoEmergencia', width: 30 },
    { header: 'Tel. Emergencia', key: 'telefonoEmergencia', width: 18 },
    { header: 'Nombre Encargado', key: 'nombreEncargado', width: 30 },
    { header: 'DPI Encargado', key: 'dpiEncargado', width: 18 },
    { header: 'Tel. Encargado', key: 'telefonoEncargado', width: 18 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  datos.data.forEach(item => {
    const edad = calcularEdad(item.fechanacimiento);
    const numeroExpediente = item.expedientes && item.expedientes.length > 0 
      ? item.expedientes[0].numeroexpediente 
      : 'Sin expediente';
    
    worksheet.addRow({
      nombre: `${item.nombres} ${item.apellidos}`,
      cui: item.cui || 'N/A',
      genero: item.genero === 'M' ? 'Masculino' : 'Femenino',
      edad: `${edad} años`,
      fechaNacimiento: new Date(item.fechanacimiento).toLocaleDateString('es-GT'),
      telefonoPersonal: item.telefonopersonal || 'N/A',
      municipio: item.municipio || 'N/A',
      aldea: item.aldea || 'N/A',
      direccion: item.direccion || 'N/A',
      numeroExpediente: numeroExpediente,
      contactoEmergencia: item.nombrecontactoemergencia || 'N/A',
      telefonoEmergencia: item.telefonoemergencia || 'N/A',
      nombreEncargado: item.nombreencargado || 'N/A',
      dpiEncargado: item.dpiencargado || 'N/A',
      telefonoEncargado: item.telefonoencargado || 'N/A'
    });
  });
}

function generarExcelConsultas(worksheet, datos) {
  worksheet.columns = [
    { header: 'Fecha Consulta', key: 'fecha', width: 18 },
    { header: 'Paciente', key: 'paciente', width: 30 },
    { header: 'F. Nacimiento Paciente', key: 'fechaNacPaciente', width: 20 },
    { header: 'Médico', key: 'medico', width: 30 },
    { header: 'Clínica', key: 'clinica', width: 30 },
    { header: 'Recordatorio', key: 'recordatorio', width: 40 },
    { header: 'Nota Consulta', key: 'notaConsulta', width: 40 },
    { header: 'Motivo Consulta', key: 'motivoConsulta', width: 50 },
    { header: 'Evolución', key: 'evolucion', width: 50 },
    { header: 'Diagnóstico/Tratamiento', key: 'diagnostico', width: 60 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  datos.data.forEach(item => {
    const row = worksheet.addRow({
      fecha: new Date(item.fecha).toLocaleDateString('es-GT'),
      paciente: `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      fechaNacPaciente: item.paciente?.fechanacimiento 
        ? new Date(item.paciente.fechanacimiento).toLocaleDateString('es-GT') 
        : 'N/A',
      medico: `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      clinica: item.usuario?.clinica?.nombreclinica || 'N/A',
      recordatorio: item.recordatorio || 'N/A',
      notaConsulta: item.notaconsulta || 'N/A',
      motivoConsulta: item.motivoconsulta || 'N/A',
      evolucion: item.evolucion || 'N/A',
      diagnostico: item.diagnosticotratamiento || 'Sin diagnóstico'
    });
    
    ['recordatorio', 'notaConsulta', 'motivoConsulta', 'evolucion', 'diagnostico'].forEach(col => {
      row.getCell(col).alignment = { wrapText: true, vertical: 'top' };
    });
  });
}

function generarExcelInventario(worksheet, datos) {
  worksheet.columns = [
    { header: 'Medicamento', key: 'medicamento', width: 30 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Unidades', key: 'unidades', width: 12 },
    { header: 'Precio', key: 'precio', width: 15 },
    { header: 'Fecha Ingreso', key: 'fechaIngreso', width: 18 },
    { header: 'Fecha Vencimiento', key: 'fechaVencimiento', width: 20 },
    { header: 'Estado', key: 'estado', width: 12 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  datos.data.forEach(item => {
    worksheet.addRow({
      medicamento: item.nombre,
      descripcion: item.descripcion || '',
      unidades: item.unidades,
      precio: `Q${item.precio.toFixed(2)}`,
      fechaIngreso: new Date(item.fechaingreso).toLocaleDateString('es-GT'),
      fechaVencimiento: item.fechavencimiento ? new Date(item.fechavencimiento).toLocaleDateString('es-GT') : 'N/A',
      estado: item.estado === 1 ? 'Activo' : 'Inactivo'
    });
  });
}

function generarExcelAgenda(worksheet, datos) {
  worksheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Hora', key: 'hora', width: 12 },
    { header: 'Paciente', key: 'paciente', width: 30 },
    { header: 'Médico', key: 'medico', width: 30 },
    { header: 'Transporte', key: 'transporte', width: 15 },
    { header: 'Comentario', key: 'comentario', width: 40 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  function formatearHoraExcel(hora) {
    if (!hora) return '';
    if (typeof hora === 'string') {
      if (hora.includes(':')) {
        const partes = hora.split(':');
        return `${partes[0]}:${partes[1]}`;
      }
      return hora;
    }
    if (hora instanceof Date) {
      const horas = hora.getHours().toString().padStart(2, '0');
      const minutos = hora.getMinutes().toString().padStart(2, '0');
      return `${horas}:${minutos}`;
    }
    return String(hora);
  }

  datos.data.forEach(item => {
    worksheet.addRow({
      fecha: new Date(item.fechaatencion).toLocaleDateString('es-GT'),
      hora: formatearHoraExcel(item.horaatencion),
      paciente: `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      medico: `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      transporte: item.transporte === 1 ? 'Sí' : 'No',
      comentario: item.comentario || 'N/A'
    });
  });
}

function generarExcelReferencias(worksheet, datos) {
  worksheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 18 },
    { header: 'Paciente', key: 'paciente', width: 30 },
    { header: 'N° Expediente', key: 'numeroExpediente', width: 20 },
    { header: 'Enviado Por', key: 'de', width: 30 },
    { header: 'Confirmado Por', key: 'para', width: 30 },
    { header: 'Clínica Destino', key: 'clinica', width: 30 },
    { header: 'Estado', key: 'estado', width: 15 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  datos.data.forEach(item => {
    const usuarioConfirmador = item.usuarioconfirma4 || 'Pendiente de confirmación';
    
    worksheet.addRow({
      fecha: new Date(item.fechacreacion).toLocaleDateString('es-GT'),
      paciente: `${item.paciente?.nombres} ${item.paciente?.apellidos}`,
      numeroExpediente: item.expediente?.numeroexpediente || 'Sin expediente',
      de: `${item.usuario?.nombres} ${item.usuario?.apellidos}`,
      para: usuarioConfirmador,
      clinica: item.clinica?.nombreclinica || 'N/A',
      estado: item.confirmacion4 === 1 ? 'Completado' : 'Pendiente'
    });
  });
}

const reporteriaService = {

  async obtenerDashboard(usuario) {
    try {
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      const usuarioConRol = await prisma.usuario.findUnique({
        where: { idusuario: usuario.idusuario },
        include: { rol: true }
      });

      const esAdmin = usuarioConRol.rol.nombre.toLowerCase().includes('admin');

      const [totalPacientes, pacientesActivos, pacientesNuevosMes] = await Promise.all([
        prisma.paciente.count(),
        prisma.paciente.count({ where: { estado: 1 } }),
        prisma.paciente.count({ 
          where: { 
            fechacreacion: { gte: primerDiaMes },
            estado: 1 
          } 
        })
      ]);

      const consultasMes = await prisma.detallehistorialclinico.count({
        where: {
          fecha: { gte: primerDiaMes },
          estado: 1,
          ...(esAdmin ? {} : { fkusuario: usuario.idusuario })
        }
      });

      const [totalMedicamentos, medicamentosActivos, stockBajo, proximosVencer] = await Promise.all([
        prisma.inventariomedico.count({ where: { estado: 1 } }),  
        prisma.inventariomedico.count({
          where: {
            estado: 1,
            unidades: { lte: 10 }
          }
        }),
        prisma.inventariomedico.count({
          where: {
            estado: 1,
            fechavencimiento: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      const inventarioTotal = await prisma.inventariomedico.aggregate({
        where: { estado: 1 },
        _sum: {
          precio: true
        }
      });

      const citasMes = await prisma.agenda.count({
        where: {
          fechaatencion: { gte: primerDiaMes },
          estado: { not: 0 }, // en agenda, estado es Pendiente/Confirmada/No se presento, no activo/inactivo; solo 0 es eliminada
          ...(esAdmin ? {} : { fkusuario: usuario.idusuario })
        }
      });

      const whereReferencias = {
        estado: 1,
        ...(esAdmin ? {} : {
          OR: [
            { fkusuario: usuario.idusuario },
            { fkusuariodestino: usuario.idusuario }
          ]
        })
      };

      const [totalReferencias, enviadas, recibidas, pendientes, completadas] = await Promise.all([
        prisma.detallereferirpaciente.count({ where: whereReferencias }),
        prisma.detallereferirpaciente.count({
          where: {
            ...whereReferencias,
            fkusuario: usuario.idusuario
          }
        }),
        prisma.detallereferirpaciente.count({
          where: {
            ...whereReferencias,
            fkusuariodestino: usuario.idusuario
          }
        }),
        prisma.detallereferirpaciente.count({
          where: {
            ...whereReferencias,
            confirmacion4: 0
          }
        }),
        prisma.detallereferirpaciente.count({
          where: {
            ...whereReferencias,
            confirmacion4: 1
          }
        })
      ]);

      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);

      const totalMesSalidas = await prisma.salidasinventario.count({
        where: {
          fechacreacion: { gte: hace30Dias }
        }
      });

      const unidadesMes = await prisma.salidasinventario.aggregate({
        where: {
          fechacreacion: { gte: hace30Dias },
          estado: 1
        },
        _sum: { cantidad: true }
      });

      const activasSalidas = await prisma.salidasinventario.count({
        where: { estado: 1 }
      });

      const anuladasSalidas = await prisma.salidasinventario.count({
        where: { estado: 0 }
      });

      return {
        pacientes: {
          total: totalPacientes,
          activos: pacientesActivos,
          inactivos: totalPacientes - pacientesActivos,
          nuevosMes: pacientesNuevosMes
        },
        consultas: {
          totalMes: consultasMes
        },
        inventario: {
          total: totalMedicamentos,
          activos: medicamentosActivos,
          alertasStockBajo: stockBajo,
          proximosVencer: proximosVencer,
          valorTotal: inventarioTotal._sum.precio || 0
        },
        agenda: {
          citasMes: citasMes
        },
        referencias: {
          total: totalReferencias,
          enviadas,
          recibidas,
          pendientes,
          completadas
        },
        salidas: {
          totalMes: totalMesSalidas,
          totalUnidadesMes: unidadesMes._sum.cantidad || 0,
          activas: activasSalidas,
          anuladas: anuladasSalidas
        }
      };

    } catch (error) {
      console.error('Error en obtenerDashboard service:', error);
      throw error;
    }
  },

  async obtenerMedicosDisponibles(contexto) {
    try {
      // Los roles "médicos" varían según la clínica (Medico General, Odontólogo,
      // Psicólogo, Fisioterapeuta, etc.), así que filtrar por nombre de rol es frágil.
      // En su lugar, mostramos a quienes realmente aparecen como profesional en
      // el contexto del filtro (consultas, agenda o referencias) — no la unión de
      // los tres, porque eso mostraría médicos que no tienen nada que ver con ese reporte.
      const fuentesPorContexto = {
        historial: () => prisma.detallehistorialclinico.findMany({ where: { estado: 1 }, select: { fkusuario: true }, distinct: ['fkusuario'] }),
        // En agenda, "estado" no es activo/inactivo: 0=eliminada, 1=Pendiente, 2=Confirmada,
        // 3=No se presento. Filtrar por estado:1 dejaba fuera a cualquier medico cuyas citas
        // ya estuvieran confirmadas o marcadas como no-presento.
        agenda: () => prisma.agenda.findMany({ where: { estado: { not: 0 } }, select: { fkusuario: true }, distinct: ['fkusuario'] }),
        referencias: () => prisma.detallereferirpaciente.findMany({ where: { estado: 1 }, select: { fkusuario: true }, distinct: ['fkusuario'] })
      };

      const obtenerFuentes = contexto && fuentesPorContexto[contexto]
        ? [fuentesPorContexto[contexto]()]
        : Object.values(fuentesPorContexto).map(fn => fn());

      const resultados = await Promise.all(obtenerFuentes);
      const idsUsuarios = [...new Set(resultados.flat().map(r => r.fkusuario))];

      const medicos = await prisma.usuario.findMany({
        where: {
          estado: 1,
          idusuario: { in: idsUsuarios }
        },
        select: {
          idusuario: true,
          nombres: true,
          apellidos: true,
          profesion: true
        },
        orderBy: {
          nombres: 'asc'
        }
      });

      return medicos;
    } catch (error) {
      console.error('Error en obtenerMedicosDisponibles service:', error);
      throw error;
    }
  },

  async obtenerConfirmadoresReferidos() {
    try {
      // "Confirmado Por" en la tabla muestra solo usuarioconfirma4 (la confirmación
      // final; las demás son pasos intermedios del flujo de aprobación que nunca
      // se muestran como "Confirmado Por"), así que el filtro debe basarse solo en esa columna.
      const registros = await prisma.detallereferirpaciente.findMany({
        where: { estado: 1, usuarioconfirma4: { not: null } },
        select: { usuarioconfirma4: true },
        distinct: ['usuarioconfirma4']
      });

      const usernames = registros.map(r => r.usuarioconfirma4).filter(Boolean);

      if (usernames.length === 0) return [];

      const confirmadores = await prisma.usuario.findMany({
        where: { usuario: { in: usernames } },
        select: {
          idusuario: true,
          usuario: true,
          nombres: true,
          apellidos: true,
          profesion: true
        },
        orderBy: { nombres: 'asc' }
      });

      return confirmadores;
    } catch (error) {
      console.error('Error en obtenerConfirmadoresReferidos service:', error);
      throw error;
    }
  },

  async obtenerReportePacientes(filtros) {
    try {
      const { nombre, cui, desde, hasta, genero, municipio, edadMin, edadMax, tipodiscapacidad, programa, fkclinica, page, limit } = filtros;
      const skip = (page - 1) * limit;

      const whereClause = { estado: 1 };

      // Búsqueda por nombre
      if (nombre && nombre !== '') {
        whereClause.OR = [
          { nombres: { contains: nombre, mode: 'insensitive' } },
          { apellidos: { contains: nombre, mode: 'insensitive' } }
        ];
      }

      // Búsqueda por CUI
      if (cui && cui !== '') {
        whereClause.cui = { contains: cui, mode: 'insensitive' };
      }

      if (esFechaValida(desde) || esFechaValida(hasta)) {
        const conditions = [];
        
        if (esFechaValida(desde)) {
          const fechaDesdeStr = desde.split('T')[0]; // 2026-04-16
          conditions.push({
            fechacreacion: { gte: new Date(fechaDesdeStr + 'T00:00:00Z') }
          });
        }
        
        if (esFechaValida(hasta)) {
          const fechaHastaStr = hasta.split('T')[0]; // 2026-04-18
          conditions.push({
            fechacreacion: { lte: new Date(fechaHastaStr + 'T23:59:59Z') }
          });
        }
        
        if (conditions.length > 0) {
          whereClause.AND = conditions;
        }
      }

      if (genero && genero !== '') whereClause.genero = genero.toUpperCase();
      if (municipio && municipio !== '') whereClause.municipio = { contains: municipio, mode: 'insensitive' };
      if (tipodiscapacidad && tipodiscapacidad !== '') whereClause.tipodiscapacidad = { contains: tipodiscapacidad, mode: 'insensitive' };
      if (fkclinica) whereClause.fkclinica = fkclinica;

      // Filtrar por programa al que pertenece el paciente (vía su expediente)
      if (programa) {
        whereClause.expedientes = {
          some: {
            estado: 1,
            programas: { some: { idprograma: programa } }
          }
        };
      }

      const edadMinNum = parseInt(edadMin);
      const edadMaxNum = parseInt(edadMax);
      
      if (!isNaN(edadMinNum) || !isNaN(edadMaxNum)) {
        const hoy = new Date();
        whereClause.fechanacimiento = {};
        
        if (!isNaN(edadMaxNum)) {
          const fechaMinNacimiento = new Date(hoy.getFullYear() - edadMaxNum - 1, hoy.getMonth(), hoy.getDate());
          whereClause.fechanacimiento.gte = fechaMinNacimiento;
        }
        
        if (!isNaN(edadMinNum)) {
          const fechaMaxNacimiento = new Date(hoy.getFullYear() - edadMinNum, hoy.getMonth(), hoy.getDate());
          whereClause.fechanacimiento.lte = fechaMaxNacimiento;
        }
      }

      const [pacientes, total] = await Promise.all([
        prisma.paciente.findMany({
          where: whereClause,
          include: {
            expedientes: {
              where: { estado: 1 },
              select: {
                numeroexpediente: true,
                fechacreacion: true,
                programas: {
                  select: {
                    programa: { select: { idprograma: true, nombre: true } }
                  }
                }
              }
            }
          },
          orderBy: { fechacreacion: 'desc' },
          skip,
          take: limit
        }),
        prisma.paciente.count({ where: whereClause })
      ]);

      const pacientesConEdad = pacientes.map(p => ({
        ...p,
        edad: calcularEdad(p.fechanacimiento),
        tieneExpediente: p.expedientes.length > 0,
        programas: p.expedientes.flatMap(e => e.programas.map(ep => ep.programa))
      }));

      const resumen = {
        totalPacientes: total,
        porGenero: {
          masculino: pacientes.filter(p => p.genero === 'M').length,
          femenino: pacientes.filter(p => p.genero === 'F').length
        },
        conExpediente: pacientes.filter(p => p.expedientes.length > 0).length,
        sinExpediente: pacientes.filter(p => p.expedientes.length === 0).length
      };

      return {
        data: pacientesConEdad,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        resumen
      };
    } catch (error) {
      console.error('Error en obtenerReportePacientes service:', error);
      throw error;
    }
  },

  async obtenerReporteConsultas(filtros, usuario) {
    try {
      const { nombrePaciente, cuiPaciente, desde, hasta, medico, programa, diagnostico, page, limit } = filtros;
      const skip = (page - 1) * limit;

      const whereClause = { estado: 1 };

      // Búsqueda por nombre del paciente
      if (nombrePaciente && nombrePaciente !== '') {
        whereClause.paciente = {
          OR: [
            { nombres: { contains: nombrePaciente, mode: 'insensitive' } },
            { apellidos: { contains: nombrePaciente, mode: 'insensitive' } }
          ]
        };
      }

      // Búsqueda por CUI del paciente
      if (cuiPaciente && cuiPaciente !== '') {
        whereClause.paciente = { ...whereClause.paciente, cui: { contains: cuiPaciente, mode: 'insensitive' } };
      }
      
      if (esFechaValida(desde) || esFechaValida(hasta)) {
        const conditions = [];
        
        if (esFechaValida(desde)) {
          const fechaDesdeStr = desde.split('T')[0]; // 2026-04-16
          conditions.push({
            fecha: { gte: new Date(fechaDesdeStr + 'T00:00:00Z') }
          });
        }
        
        if (esFechaValida(hasta)) {
          const fechaHastaStr = hasta.split('T')[0]; // 2026-04-18
          conditions.push({
            fecha: { lte: new Date(fechaHastaStr + 'T23:59:59Z') }
          });
        }
        
        if (conditions.length > 0) {
          whereClause.AND = conditions;
        }
      }
      
      const medicoNum = parseInt(medico);
      const programaNum = parseInt(programa);

      if (!isNaN(medicoNum)) whereClause.fkusuario = medicoNum;
      if (diagnostico && diagnostico !== '') whereClause.diagnosticotratamiento = { contains: diagnostico, mode: 'insensitive' };

      // Filtrar por programa al que pertenece el paciente (vía su expediente)
      if (!isNaN(programaNum)) {
        whereClause.paciente = {
          ...whereClause.paciente,
          expedientes: {
            some: {
              estado: 1,
              programas: { some: { idprograma: programaNum } }
            }
          }
        };
      }

      const [consultas, total] = await Promise.all([
        prisma.detallehistorialclinico.findMany({
          where: whereClause,
          include: {
            paciente: { 
              select: { 
                idpaciente: true, 
                nombres: true, 
                apellidos: true, 
                cui: true, 
                fechanacimiento: true 
              } 
            },
            usuario: { 
              select: { 
                idusuario: true, 
                nombres: true, 
                apellidos: true, 
                profesion: true,
                clinica: {
                  select: {
                    nombreclinica: true
                  }
                }
              } 
            }
          },
          orderBy: { fecha: 'desc' },
          skip,
          take: limit
        }),
        prisma.detallehistorialclinico.count({ where: whereClause })
      ]);

      const consultasPorMedico = await prisma.detallehistorialclinico.groupBy({
        by: ['fkusuario'],
        where: whereClause,
        _count: true
      });

      const resumen = {
        totalConsultas: total,
        conDiagnostico: consultas.filter(c => c.diagnosticotratamiento).length,
        conArchivos: consultas.filter(c => c.rutahistorialclinico).length,
        porMedico: consultasPorMedico.length
      };

      return {
        data: consultas,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        resumen
      };
    } catch (error) {
      console.error('Error en obtenerReporteConsultas service:', error);
      throw error;
    }
  },

  async obtenerReporteInventario(filtros) {
    try {
      const { estado, stockMinimo, proximosVencer, usuario, nombreMedicamento, page, limit } = filtros;
      const skip = (page - 1) * limit;
      const whereClause = {};

      if (estado === 'activo') whereClause.estado = 1;
      else if (estado === 'inactivo') whereClause.estado = 0;

      const stockMin = parseInt(stockMinimo);
      const diasVencer = parseInt(proximosVencer);
      const usuarioNum = parseInt(usuario);

      if (!isNaN(stockMin)) whereClause.unidades = { lte: stockMin };

      if (!isNaN(diasVencer)) {
        const fechaLimite = new Date(Date.now() + diasVencer * 24 * 60 * 60 * 1000);
        whereClause.fechavencimiento = { lte: fechaLimite };
      }

      if (!isNaN(usuarioNum)) whereClause.fkusuario = usuarioNum;
      if (nombreMedicamento && nombreMedicamento !== '') {
        whereClause.nombre = { contains: nombreMedicamento, mode: 'insensitive' };
      }

      const [medicamentos, total] = await Promise.all([
        prisma.inventariomedico.findMany({
          where: whereClause,
          include: { usuario: { select: { nombres: true, apellidos: true } } },
          orderBy: { fechacreacion: 'desc' },
          skip,
          take: limit
        }),
        prisma.inventariomedico.count({ where: whereClause })
      ]);

      const alertas = {
        stockBajo: medicamentos.filter(m => m.unidades <= 10 && m.estado === 1),
        proximosVencer: medicamentos.filter(m => {
          if (!m.fechavencimiento || m.estado === 0) return false;
          const diasRestantes = Math.ceil((new Date(m.fechavencimiento) - new Date()) / (1000 * 60 * 60 * 24));
          return diasRestantes <= 30 && diasRestantes >= 0;
        }),
        vencidos: medicamentos.filter(m => {
          if (!m.fechavencimiento) return false;
          return new Date(m.fechavencimiento) < new Date();
        })
      };

      const valorTotal = medicamentos.reduce((sum, m) => {
        const precio = parseFloat(m.precio) || 0;
        const unidades = m.unidades || 0;
        return sum + (precio * unidades);
      }, 0);

      const resumen = {
        totalMedicamentos: total,
        activos: medicamentos.filter(m => m.estado === 1).length,
        inactivos: medicamentos.filter(m => m.estado === 0).length,
        valorTotalInventario: valorTotal,
        unidadesTotales: medicamentos.reduce((sum, m) => sum + (m.unidades || 0), 0)
      };

      return {
        data: medicamentos,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        resumen,
        alertas: {
          stockBajo: alertas.stockBajo.length,
          proximosVencer: alertas.proximosVencer.length,
          vencidos: alertas.vencidos.length
        }
      };
    } catch (error) {
      console.error('Error en obtenerReporteInventario service:', error);
      throw error;
    }
  },

  async obtenerReporteAgenda(filtros, usuario) {
    try {
      const { nombrePaciente, cuiPaciente, desde, hasta, medico, transporte, estado, page, limit } = filtros;
      const skip = (page - 1) * limit;

      const whereClause = {};

      // Búsqueda por nombre del paciente
      if (nombrePaciente && nombrePaciente !== '') {
        whereClause.paciente = {
          OR: [
            { nombres: { contains: nombrePaciente, mode: 'insensitive' } },
            { apellidos: { contains: nombrePaciente, mode: 'insensitive' } }
          ]
        };
      }

      // Búsqueda por CUI del paciente
      if (cuiPaciente && cuiPaciente !== '') {
        whereClause.paciente = { ...whereClause.paciente, cui: { contains: cuiPaciente, mode: 'insensitive' } };
      }
      
      // Filtro de fechas desde/hasta
      // @db.Date: Prisma extrae la fecha en UTC del objeto Date.
      // Usando T00:00:00.000Z garantiza que la fecha UTC = la fecha que el usuario indicó.
      if (esFechaValida(desde) || esFechaValida(hasta)) {
        whereClause.fechaatencion = {};
        if (esFechaValida(desde)) {
          whereClause.fechaatencion.gte = new Date(desde.split('T')[0] + 'T00:00:00.000Z');
        }
        if (esFechaValida(hasta)) {
          whereClause.fechaatencion.lte = new Date(hasta.split('T')[0] + 'T00:00:00.000Z');
        }
      }
      
      // Filtros adicionales
      const medicoNum = parseInt(medico);
      const transporteNum = parseInt(transporte);
      
      if (!isNaN(medicoNum)) whereClause.fkusuario = medicoNum;
      if (!isNaN(transporteNum)) whereClause.transporte = transporteNum;
      
      // Filtro de estado - manejo robusto de array
      if (estado) {
        if (Array.isArray(estado) && estado.length > 0) {
          // Convertir a números e filtrar
          const estadosParsed = estado
            .map(e => {
              const parsed = parseInt(e);
              return isNaN(parsed) ? null : parsed;
            })
            .filter(e => e !== null);
          
          if (estadosParsed.length > 0) {
            whereClause.estado = { in: estadosParsed };
          }
        } else if (typeof estado === 'string' && estado !== '') {
          // Si viene como string único
          const estadoNum = parseInt(estado);
          if (!isNaN(estadoNum)) {
            whereClause.estado = estadoNum;
          }
        }
      }

      const [citas, total] = await Promise.all([
        prisma.agenda.findMany({
          where: whereClause,
          include: {
            paciente: { select: { idpaciente: true, nombres: true, apellidos: true, cui: true, telefonopersonal: true } },
            usuario: { select: { idusuario: true, nombres: true, apellidos: true, profesion: true } }
          },
          orderBy: [{ fechaatencion: 'desc' }, { horaatencion: 'desc' }],
          skip,
          take: limit
        }),
        prisma.agenda.count({ where: whereClause })
      ]);

      const citasFormateadas = citas.map(cita => {
        let horaFormateada = '';
        
        if (cita.horaatencion) {
          if (typeof cita.horaatencion === 'string') {
            if (cita.horaatencion.includes(':')) {
              const partes = cita.horaatencion.split(':');
              horaFormateada = `${partes[0]}:${partes[1]}`;
            } else {
              horaFormateada = cita.horaatencion;
            }
          } else if (cita.horaatencion instanceof Date) {
            const horas = cita.horaatencion.getUTCHours().toString().padStart(2, '0');
            const minutos = cita.horaatencion.getUTCMinutes().toString().padStart(2, '0');
            horaFormateada = `${horas}:${minutos}`;
          } else {
            horaFormateada = String(cita.horaatencion);
          }
        }
        
        return {
          ...cita,
          horaatencion: horaFormateada,
          // Retornar como string 'YYYY-MM-DD' para evitar desplazamiento de zona horaria en el frontend
          fechaatencion: cita.fechaatencion instanceof Date
            ? cita.fechaatencion.toISOString().split('T')[0]
            : cita.fechaatencion
        };
      });

      const resumen = {
        totalCitas: total,
        conTransporte: citas.filter(c => c.transporte === 1).length,
        sinTransporte: citas.filter(c => c.transporte === 0).length
      };

      return {
        data: citasFormateadas,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        resumen
      };
    } catch (error) {
      console.error('Error en obtenerReporteAgenda service:', error);
      throw error;
    }
  },

  async obtenerReporteReferencias(filtros, usuario) {
    try {
      const { nombrePaciente, cuiPaciente, tipo, estado, clinica, enviadoPor, confirmadoPor, desde, hasta, page, limit } = filtros;
      const skip = (page - 1) * limit;

      const whereClause = { estado: 1 };

      if (tipo === 'enviadas') whereClause.fkusuario = usuario.idusuario;
      else if (tipo === 'recibidas') whereClause.fkusuariodestino = usuario.idusuario;

      if (estado === 'pendiente') whereClause.confirmacion4 = 0;
      else if (estado === 'proceso') {
        whereClause.confirmacion1 = 1;
        whereClause.confirmacion4 = 0;
      } else if (estado === 'completado') whereClause.confirmacion4 = 1;

      const clinicaNum = parseInt(clinica);
      const enviadoPorNum = parseInt(enviadoPor);

      if (!isNaN(clinicaNum)) whereClause.fkclinica = clinicaNum;
      if (!isNaN(enviadoPorNum)) whereClause.fkusuario = enviadoPorNum;
      if (confirmadoPor && confirmadoPor !== '') {
        whereClause.usuarioconfirma4 = { equals: confirmadoPor, mode: 'insensitive' };
      }

      if (nombrePaciente && nombrePaciente !== '') {
        whereClause.paciente = {
          OR: [
            { nombres: { contains: nombrePaciente, mode: 'insensitive' } },
            { apellidos: { contains: nombrePaciente, mode: 'insensitive' } }
          ]
        };
      }

      if (cuiPaciente && cuiPaciente !== '') {
        whereClause.paciente = { ...whereClause.paciente, cui: { contains: cuiPaciente, mode: 'insensitive' } };
      }
      
      if (esFechaValida(desde) || esFechaValida(hasta)) {
        whereClause.fechacreacion = {};
        if (esFechaValida(desde)) whereClause.fechacreacion.gte = new Date(desde);
        if (esFechaValida(hasta)) whereClause.fechacreacion.lte = new Date(hasta);
      }

      const [referencias, total] = await Promise.all([
        prisma.detallereferirpaciente.findMany({
          where: whereClause,
          include: {
            paciente: { select: { idpaciente: true, nombres: true, apellidos: true, cui: true } },
            clinica: { select: { idclinica: true, nombreclinica: true } },
            usuario: { select: { idusuario: true, nombres: true, apellidos: true, profesion: true } },
            usuarioDestino: { select: { idusuario: true, nombres: true, apellidos: true, profesion: true } },
            expediente: { select: { numeroexpediente: true } }
          },
          orderBy: { fechacreacion: 'desc' },
          skip,
          take: limit
        }),
        prisma.detallereferirpaciente.count({ where: whereClause })
      ]);

      const resumen = {
        total,
        pendientes: referencias.filter(r => r.confirmacion4 === 0).length,
        completadas: referencias.filter(r => r.confirmacion4 === 1).length,
        enviadas: referencias.filter(r => r.fkusuario === usuario.idusuario).length,
        recibidas: referencias.filter(r => r.fkusuariodestino === usuario.idusuario).length
      };

      return {
        data: referencias,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        resumen
      };
    } catch (error) {
      console.error('Error en obtenerReporteReferencias service:', error);
      throw error;
    }
  },

  async generarPDF(params) {
    try {
      const { tipoReporte, filtros, titulo, usuario } = params;

      let datosReporte;

      switch (tipoReporte.toLowerCase()) {
        case 'pacientes':
          datosReporte = await this.obtenerReportePacientes({ ...filtros, page: 1, limit: 10000 });
          break;
        case 'consultas':
          datosReporte = await this.obtenerReporteConsultas({ ...filtros, page: 1, limit: 10000 }, usuario);
          break;
        case 'inventario':
          datosReporte = await this.obtenerReporteInventario({ ...filtros, page: 1, limit: 10000 });
          break;
        case 'agenda':
          datosReporte = await this.obtenerReporteAgenda({ ...filtros, page: 1, limit: 10000 }, usuario);
          break;
        case 'referencias':
          datosReporte = await this.obtenerReporteReferencias({ ...filtros, page: 1, limit: 10000 }, usuario);
          break;
        case 'dashboard':
          datosReporte = await this.obtenerDashboard(usuario);
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }

      const doc = new PDFDocument({ 
        margin: 50,
        size: 'LETTER'
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(18).font('Helvetica-Bold').text(titulo, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Fecha: ${new Date().toLocaleDateString('es-GT')}`, { align: 'center' });
        doc.moveDown(1);

        if (tipoReporte === 'dashboard') {
          generarPDFDashboard(doc, datosReporte);
        } else {
          generarPDFTabla(doc, tipoReporte, datosReporte);
        }

        doc.end();
      });

    } catch (error) {
      console.error('Error en generarPDF service:', error);
      throw error;
    }
  },

  async exportarExcel(params) {
    try {
      const { tipoReporte, filtros, nombreArchivo, usuario } = params;

      let datosReporte;

      switch (tipoReporte.toLowerCase()) {
        case 'pacientes':
          datosReporte = await this.obtenerReportePacientes({ ...filtros, page: 1, limit: 10000 });
          break;
        case 'consultas':
          datosReporte = await this.obtenerReporteConsultas({ ...filtros, page: 1, limit: 10000 }, usuario);
          break;
        case 'inventario':
          datosReporte = await this.obtenerReporteInventario({ ...filtros, page: 1, limit: 10000 });
          break;
        case 'agenda':
          datosReporte = await this.obtenerReporteAgenda({ ...filtros, page: 1, limit: 10000 }, usuario);
          break;
        case 'referencias':
          datosReporte = await this.obtenerReporteReferencias({ ...filtros, page: 1, limit: 10000 }, usuario);
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte');

      switch (tipoReporte.toLowerCase()) {
        case 'pacientes':
          generarExcelPacientes(worksheet, datosReporte);
          break;
        case 'consultas':
          generarExcelConsultas(worksheet, datosReporte);
          break;
        case 'inventario':
          generarExcelInventario(worksheet, datosReporte);
          break;
        case 'agenda':
          generarExcelAgenda(worksheet, datosReporte);
          break;
        case 'referencias':
          generarExcelReferencias(worksheet, datosReporte);
          break;
      }

      return await workbook.xlsx.writeBuffer();

    } catch (error) {
      console.error('Error en exportarExcel service:', error);
      throw error;
    }
  },
  
async obtenerDatosSalidasDashboard() {
  try {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const totalMes = await prisma.salidasinventario.count({
      where: {
        fechacreacion: { gte: hace30Dias }
      }
    });

    const unidadesMes = await prisma.salidasinventario.aggregate({
      where: {
        fechacreacion: { gte: hace30Dias },
        estado: 1
      },
      _sum: { cantidad: true }
    });

    const activas = await prisma.salidasinventario.count({
      where: { estado: 1 }
    });

    const anuladas = await prisma.salidasinventario.count({
      where: { estado: 0 }
    });

    return {
      totalMes,
      totalUnidadesMes: unidadesMes._sum.cantidad || 0,
      activas,
      anuladas
    };

  } catch (error) {
    console.error('Error en obtenerDatosSalidasDashboard:', error);
    throw new Error(`Error al obtener datos de salidas para dashboard: ${error.message}`);
  }
},

async obtenerReporteSalidas(filtros, usuario) {
  try {
    const {
      desde,
      hasta,
      estado,
      medicamento,
      nombreMedicamento,
      usuarioFiltro,
      motivo,
      destino,
      page = 1,
      limit = 10
    } = filtros;

    const where = {};

    if (desde || hasta) {
      where.fechasalida = {};
      if (desde) where.fechasalida.gte = new Date(desde);
      if (hasta) where.fechasalida.lte = new Date(hasta);
    }

    if (estado === 'activas') {
      where.estado = 1;
    } else if (estado === 'anuladas') {
      where.estado = 0;
    }

    if (medicamento) {
      where.fkmedicina = parseInt(medicamento);
    }

    if (nombreMedicamento) {
      where.medicamento = {
        nombre: { contains: nombreMedicamento, mode: 'insensitive' }
      };
    }

    if (usuarioFiltro) {
      where.fkusuario = parseInt(usuarioFiltro);
    }

    if (motivo) {
      where.motivo = {
        contains: motivo,
        mode: 'insensitive'
      };
    }

    if (destino) {
      where.destino = {
        contains: destino,
        mode: 'insensitive'
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [salidas, total] = await Promise.all([
      prisma.salidasinventario.findMany({
        where,
        include: {
          medicamento: {
            select: {
              idmedicina: true,
              nombre: true,
              codigoproducto: true,
              unidades: true,
              precio: true
            }
          },
          usuario: {
            select: {
              idusuario: true,
              nombres: true,
              apellidos: true,
              profesion: true
            }
          }
        },
        orderBy: { fechacreacion: 'desc' },
        skip,
        take
      }),
      prisma.salidasinventario.count({ where })
    ]);

    const estadisticas = await prisma.salidasinventario.aggregate({
      where,
      _count: { idsalida: true },
      _sum: { cantidad: true }
    });

    const activas = await prisma.salidasinventario.count({
      where: { ...where, estado: 1 }
    });

    const anuladas = await prisma.salidasinventario.count({
      where: { ...where, estado: 0 }
    });

    return {
      data: salidas,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      },
      resumen: {
        totalSalidas: estadisticas._count.idsalida || 0,
        activas,
        anuladas,
        totalUnidadesDespachadas: estadisticas._sum.cantidad || 0
      }
    };

  } catch (error) {
    console.error('Error en obtenerReporteSalidas:', error);
    throw new Error(`Error al obtener reporte de salidas: ${error.message}`);
  }
}
  
};

module.exports = reporteriaService;