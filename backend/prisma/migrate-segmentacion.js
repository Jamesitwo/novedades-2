const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Segmentacion por tienda (pizdo/zunto)...');

  const pizdo = await prisma.tienda.findUnique({ where: { slug: 'pizdo' } });
  if (!pizdo) throw new Error('Tienda pizdo no existe');
  const pid = pizdo.id;

  const nov = await prisma.pedidoNovedad.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const ofi = await prisma.pedidoOficina.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const vin = await prisma.pedidoVinculado.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const etq = await prisma.etiqueta.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const reg = await prisma.registroEtiqueta.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const his = await prisma.historialCambio.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const int = await prisma.intentoContacto.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const trf = await prisma.transferencia.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const fac = await prisma.factura.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const gar = await prisma.garantia.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });
  const tar = await prisma.tarea.updateMany({ where: { tiendaId: null }, data: { tiendaId: pid } });

  console.log(`   ✅ Base: nov ${nov.count}, ofi ${ofi.count}, vin ${vin.count}, etq ${etq.count}, reg ${reg.count}, his ${his.count}, int ${int.count}, trf ${trf.count}, fac ${fac.count}, gar ${gar.count}, tar ${tar.count}`);

  // ActividadLog: heredar tienda del registro padre; el resto -> pizdo
  const logsSinTienda = await prisma.actividadLog.findMany({
    where: { tiendaId: null },
    select: { id: true, entidad: true, registroId: true }
  });

  const idsNov = logsSinTienda.filter(l => l.entidad === 'novedad').map(l => l.registroId);
  const idsOfi = logsSinTienda.filter(l => l.entidad === 'oficina').map(l => l.registroId);
  const idsVin = logsSinTienda.filter(l => l.entidad === 'pedido_lucidsales').map(l => Number(l.registroId)).filter(Boolean);
  const idsTie = logsSinTienda.filter(l => l.entidad === 'pedido_tienda').map(l => l.registroId);

  const [novs, ofis, vins, ties] = await Promise.all([
    idsNov.length ? prisma.pedidoNovedad.findMany({ where: { id: { in: idsNov } }, select: { id: true, tiendaId: true } }) : [],
    idsOfi.length ? prisma.pedidoOficina.findMany({ where: { id: { in: idsOfi } }, select: { id: true, tiendaId: true } }) : [],
    idsVin.length ? prisma.pedidoVinculado.findMany({ where: { lucidsalesPedidoId: { in: idsVin } }, select: { lucidsalesPedidoId: true, tiendaId: true } }) : [],
    idsTie.length ? prisma.pedidoTienda.findMany({ where: { id: { in: idsTie } }, select: { id: true, tiendaId: true } }) : []
  ]);

  const mapa = new Map();
  novs.forEach(n => mapa.set(`novedad:${n.id}`, n.tiendaId));
  ofis.forEach(o => mapa.set(`oficina:${o.id}`, o.tiendaId));
  vins.forEach(v => mapa.set(`pedido_lucidsales:${v.lucidsalesPedidoId}`, v.tiendaId));
  ties.forEach(t => mapa.set(`pedido_tienda:${t.id}`, t.tiendaId));

  let asignados = 0;
  for (const l of logsSinTienda) {
    const tiendaId = mapa.get(`${l.entidad}:${l.registroId}`) || pid;
    await prisma.actividadLog.update({ where: { id: l.id }, data: { tiendaId } });
    asignados++;
  }
  console.log(`   ✅ ActividadLog segmentado: ${asignados} eventos`);

  console.log('✅ Segmentacion completada');
}

main()
  .catch((e) => { console.error('❌ Error en segmentacion:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
