const { prisma } = require('../prisma/client');

const getNextOperador = async (tabla) => {
  const config = await prisma.configuracion.findFirst();
  if (!config) return null;

  const fieldMap = {
    novedades: 'auto_asignar_novedades',
    oficina: 'auto_asignar_oficina',
    lucidsales: 'auto_asignar_lucidsales'
  };
  const field = fieldMap[tabla];
  if (!config[field]) return null;

  const operadoresIncluidos = JSON.parse(config.operadores_incluidos || '[]');
  if (operadoresIncluidos.length === 0) return null;

  const permissionMap = {
    novedades: 'gestionaNovedades',
    oficina: 'gestionaOficina',
    lucidsales: 'gestionaPedidos'
  };

  const activos = await prisma.usuario.findMany({
    where: {
      id: { in: operadoresIncluidos },
      activo: true,
      rol: { in: ['operador', 'operador_asignado'] },
      [permissionMap[tabla]]: true
    }
  });

  if (activos.length === 0) return null;

  if (config.metodo_asignacion === 'menor_carga') {
    const modelMap = { novedades: 'pedidoNovedad', oficina: 'pedidoOficina', lucidsales: 'pedidoVinculado' };
    const model = modelMap[tabla];
    const counts = await Promise.all(activos.map(async (op) => {
      const count = await prisma[model].count({ where: { asignadoId: op.id } });
      return { op, count };
    }));
    counts.sort((a, b) => a.count - b.count);
    return counts[0].op.id;
  }

  const [result] = await prisma.$queryRawUnsafe(
    `UPDATE "Configuracion" SET "ultimo_indice_round_robin" = (("ultimo_indice_round_robin" + 1) % $1) WHERE "id" = $2 RETURNING "ultimo_indice_round_robin"`,
    activos.length,
    config.id
  );
  const siguienteIndice = result.ultimo_indice_round_robin;
  const idx = siguienteIndice === 0 ? activos.length - 1 : siguienteIndice - 1;
  return activos[idx].id;
};

module.exports = { getNextOperador };
