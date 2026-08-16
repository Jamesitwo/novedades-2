const { prisma } = require('../prisma/client');

async function resolveTiendaId(slug) {
  const s = (slug || 'pizdo').toString().toLowerCase();
  const tienda = await prisma.tienda.findUnique({ where: { slug: s }, select: { id: true } });
  if (tienda) return tienda.id;
  const pizdo = await prisma.tienda.findUnique({ where: { slug: 'pizdo' }, select: { id: true } });
  if (pizdo) return pizdo.id;
  const first = await prisma.tienda.findFirst({ select: { id: true } });
  if (first) return first.id;
  throw new Error('No hay tiendas configuradas');
}

module.exports = { resolveTiendaId };
