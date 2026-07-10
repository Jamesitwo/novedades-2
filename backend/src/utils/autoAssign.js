const { prisma } = require('../prisma/client');

const getNextOperador = async (tabla) => {
  const config = await prisma.configuracion.findFirst();
  if (!config) {
    console.log('[autoAssign] sin configuracion');
    return null;
  }

  const fieldMap = {
    novedades: 'auto_asignar_novedades',
    oficina: 'auto_asignar_oficina',
    lucidsales: 'auto_asignar_lucidsales'
  };
  const field = fieldMap[tabla];
  if (!config[field]) {
    console.log(`[autoAssign] auto_asignar_${tabla} desactivado`);
    return null;
  }

  const operadoresIncluidos = JSON.parse(config.operadores_incluidos || '[]');
  if (operadoresIncluidos.length === 0) {
    console.log('[autoAssign] operadores_incluidos vacio');
    return null;
  }

  console.log(`[autoAssign] ${tabla}: ${operadoresIncluidos.length} en operadores_incluidos`);

  const permissionMap = {
    novedades: 'gestionaNovedades',
    oficina: 'gestionaOficina',
    lucidsales: 'gestionaPedidos'
  };

  const activos = await prisma.usuario.findMany({
    where: {
      id: { in: operadoresIncluidos },
      activo: true,
      rol: { in: ['admin', 'operador', 'operador_asignado'] },
      [permissionMap[tabla]]: true
    },
    select: { id: true, nombre: true, rol: true }
  });

  console.log(`[autoAssign] ${tabla}: ${activos.length} elegibles de ${operadoresIncluidos.length} incluidos`);

  if (activos.length === 0) {
    const todos = await prisma.usuario.findMany({
      where: { id: { in: operadoresIncluidos } },
      select: { id: true, nombre: true, rol: true, activo: true }
    });
    console.log('[autoAssign] DEBUG usuarios en operadores_incluidos:', JSON.stringify(todos.map(u => ({
      id: u.id.slice(0, 8),
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo
    }))));
    return null;
  }

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

  const idx = await prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRawUnsafe(
      `SELECT "ultimo_indice_round_robin" FROM "Configuracion" WHERE "id" = $1 FOR UPDATE`,
      config.id
    );
    if (!locked) return -1;
    const current = (locked.ultimo_indice_round_robin || 0) % activos.length;
    const next = (current + 1) % activos.length;
    await tx.configuracion.update({
      where: { id: config.id },
      data: { ultimo_indice_round_robin: next }
    });
    return current;
  });

  if (idx < 0) return null;

  const elegido = activos[idx];
  console.log(`[autoAssign] ${tabla}: asignado a ${elegido.nombre} (${elegido.rol}) idx=${idx} de ${activos.length}`);
  return elegido.id;
};

module.exports = { getNextOperador };
