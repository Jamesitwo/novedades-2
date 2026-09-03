const { prisma } = require('../prisma/client');

const cache = new Map();

async function resolveTiendaId(slug) {
  const s = (slug || 'pizdo').toString().toLowerCase();

  const cached = cache.get(s);
  if (cached && Date.now() - cached.t < 60000) return cached.id;

  const tienda = await prisma.tienda.findUnique({ where: { slug: s }, select: { id: true } });
  if (tienda) {
    cache.set(s, { id: tienda.id, t: Date.now() });
    return tienda.id;
  }
  const pizdo = await prisma.tienda.findUnique({ where: { slug: 'pizdo' }, select: { id: true } });
  if (pizdo) {
    cache.set(s, { id: pizdo.id, t: Date.now() });
    return pizdo.id;
  }
  const first = await prisma.tienda.findFirst({ select: { id: true } });
  if (first) return first.id;
  throw new Error('No hay tiendas configuradas');
}

async function tiendaDeRequest(req) {
  const slug = req.query?.tienda || req.headers?.['x-tienda'] || 'pizdo';
  return resolveTiendaId(slug);
}

module.exports = { resolveTiendaId, tiendaDeRequest };
