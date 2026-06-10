const { prisma } = require('../prisma/client');

const registrarCambio = async (registroId, tabla, campo, valorAnterior, valorNuevo, usuarioId, clienteNombre = null) => {
  try {
    await prisma.historialCambio.create({
      data: {
        tabla,
        registroId,
        campo,
        valorAnterior: valorAnterior != null ? String(valorAnterior) : null,
        valorNuevo: valorNuevo != null ? String(valorNuevo) : null,
        usuarioId,
        clienteNombre
      }
    });
  } catch (error) {
    console.error('Error registrando cambio:', error);
    throw error;
  }
};

const getHistorial = async (req, res) => {
  try {
    const { tabla, id } = req.params;

    const historial = await prisma.historialCambio.findMany({
      where: { tabla, registroId: id },
      include: {
        usuario: { select: { id: true, nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(historial);
  } catch (error) {
    console.error('Get historial error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const exportarHistorial = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, tabla } = req.query;

    const where = {};
    if (fechaDesde) where.createdAt = { ...where.createdAt, gte: new Date(fechaDesde) };
    if (fechaHasta) where.createdAt = { ...where.createdAt, lte: new Date(fechaHasta) };
    if (tabla) where.tabla = tabla;

    const historial = await prisma.historialCambio.findMany({
      where,
      include: {
        usuario: { select: { nombre: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10000
    });

    const csvHeader = 'Fecha,Usuario,Tabla,Registro,Campo,Valor Anterior,Valor Nuevo,Cliente\n';
    const csvRows = historial.map(h =>
      `"${h.createdAt.toISOString()}","${h.usuario.nombre}","${h.tabla}","${h.registroId}","${h.campo}","${h.valorAnterior || ''}","${h.valorNuevo || ''}","${h.clienteNombre || ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=historial_cambios.csv');
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error('Export historial error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { registrarCambio, getHistorial, exportarHistorial };