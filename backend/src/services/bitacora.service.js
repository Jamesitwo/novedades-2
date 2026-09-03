const { prisma } = require('../prisma/client');

const ESTADO_LABELS = {
  novedad: 'novedad',
  contactado: 'contactado',
  solucionado: 'solucionado',
  entregado: 'entregado',
  devolucion: 'devolución',
  cancelado: 'cancelado',
  pendiente_llamar: 'pendiente por llamar',
  va_a_recoger: 'va a recoger',
  no_va_a_recoger: 'no va a recoger',
  pendiente: 'pendiente',
  enviado: 'enviado',
  pagado: 'pagado'
};

function labelEstado(estado) {
  return ESTADO_LABELS[estado] || estado;
}

function descripcionCambioEstado(anterior, nuevo) {
  if (['solucionado', 'entregado', 'devolucion', 'va_a_recoger'].includes(nuevo)) {
    return `Resuelto → ${labelEstado(nuevo)}`;
  }
  if (nuevo === 'novedad' && anterior !== 'novedad') {
    return 'Reabierta como novedad';
  }
  return `${labelEstado(anterior || 'sin estado')} → ${labelEstado(nuevo)}`;
}

async function registrar(evento) {
  const {
    tipo, entidad, registroId, operadorId = null,
    cliente = null, valorAnterior = null, valorNuevo = null,
    descripcion, detalle = null, dedupeKey = null, tiendaId = null
  } = evento;

  if (!tipo || !entidad || !registroId || !descripcion) return;

  try {
    await prisma.actividadLog.create({
      data: {
        tipo,
        entidad,
        registroId: String(registroId),
        operadorId,
        cliente,
        valorAnterior,
        valorNuevo,
        descripcion,
        detalle: detalle ? JSON.stringify(detalle) : null,
        dedupeKey,
        tiendaId
      }
    });
  } catch (error) {
    console.error('[Bitacora] Error registrando evento:', error.message);
  }
}

module.exports = { registrar, labelEstado, descripcionCambioEstado };
