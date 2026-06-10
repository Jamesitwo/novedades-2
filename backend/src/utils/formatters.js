const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const formatearNumero = (numero) => {
  if (numero === null || numero === undefined) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP'
  }).format(numero);
};

const capitalizar = (texto) => {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

const formatearEstado = (estado) => {
  if (!estado) return '';
  return estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

module.exports = { formatearFecha, formatearNumero, capitalizar, formatearEstado };