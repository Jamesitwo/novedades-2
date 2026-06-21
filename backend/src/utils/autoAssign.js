const { prisma } = require('../prisma/client');

const getNextOperador = async (tabla) => {
  const config = await prisma.configuracion.findFirst();
  if (!config) return null;

  const field = tabla === 'novedades' ? 'auto_asignar_novedades' : 'auto_asignar_oficina';
  if (!config[field]) return null;

  const operadoresIncluidos = JSON.parse(config.operadores_incluidos || '[]');
  if (operadoresIncluidos.length === 0) return null;

  const activos = await prisma.usuario.findMany({
    where: {
      id: { in: operadoresIncluidos },
      activo: true,
      rol: { in: ['operador', 'operador_asignado'] }
    }
  });

  if (activos.length === 0) return null;

  if (config.metodo_asignacion === 'menor_carga') {
    const model = tabla === 'novedades' ? 'pedidoNovedad' : 'pedidoOficina';
    const counts = await Promise.all(activos.map(async (op) => {
      const count = await prisma[model].count({ where: { asignadoId: op.id } });
      return { op, count };
    }));
    counts.sort((a, b) => a.count - b.count);
    return counts[0].op.id;
  }

  const ultimoIndice = config.ultimo_indice_round_robin || 0;
  const siguienteIndice = (ultimoIndice + 1) % activos.length;
  await prisma.configuracion.update({
    where: { id: config.id },
    data: { ultimo_indice_round_robin: siguienteIndice }
  });
  const idx = siguienteIndice === 0 ? activos.length - 1 : siguienteIndice - 1;
  return activos[idx].id;
};

module.exports = { getNextOperador };
