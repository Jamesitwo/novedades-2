const { prisma } = require('../prisma/client');

const getDateRange = (periodo, fechaDesde, fechaHasta) => {
  if (fechaDesde && fechaHasta) {
    const start = new Date(fechaDesde);
    start.setHours(0, 0, 0, 0);
    const end = new Date(fechaHasta);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const now = new Date();
  let start, end = new Date(now.setHours(23, 59, 59, 999));

  switch (periodo) {
    case 'hoy':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    case 'semana':
      const dayOfWeek = new Date().getDay();
      start = new Date();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      break;
    case 'mes':
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'todos':
    default:
      start = null;
      end = null;
      break;
  }

  return { start, end };
};

const getResumen = async (req, res) => {
  try {
    const { periodo = 'todos', fechaDesde, fechaHasta } = req.query;
    const { start, end } = getDateRange(periodo, fechaDesde, fechaHasta);

    const whereNovedad = start ? { createdAt: { gte: start, lte: end } } : {};
    const whereOficina = start ? { createdAt: { gte: start, lte: end } } : {};

    const [
      todasNovedades,
      todasOficina,
      transportadorasAgrupadas,
      actividadReciente,
      motivosAgrupados
    ] = await Promise.all([
      prisma.pedidoNovedad.findMany({
        where: whereNovedad,
        select: { estado: true, totalAPagar: true, transportadora: true, motivoNovedad: true, producto: true }
      }),
      prisma.pedidoOficina.findMany({
        where: whereOficina,
        select: { estado: true, precio: true, producto: true }
      }),
      prisma.pedidoNovedad.groupBy({
        by: ['transportadora'],
        _count: { id: true },
        _sum: { totalAPagar: true },
        where: whereNovedad
      }),
      prisma.historialCambio.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { usuario: { select: { nombre: true } } }
      }),
      prisma.pedidoNovedad.groupBy({
        by: ['motivoNovedad'],
        _count: { id: true },
        where: { ...whereNovedad, motivoNovedad: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 8
      })
    ]);

    const novedadesCounts = { novedad: 0, contactado: 0, solucionado: 0, cancelado: 0, devolucion: 0 };
    todasNovedades.forEach(n => { if (novedadesCounts[n.estado] !== undefined) novedadesCounts[n.estado]++; });

    const oficinaCounts = { pendiente_llamar: 0, contactado: 0, va_a_recoger: 0, no_va_a_recoger: 0, devolucion: 0 };
    todasOficina.forEach(o => { if (oficinaCounts[o.estado] !== undefined) oficinaCounts[o.estado]++; });

    const novedades = {
      total: todasNovedades.length,
      ...novedadesCounts
    };

    const oficina = {
      total: todasOficina.length,
      ...oficinaCounts,
      totalPrecio: todasOficina.reduce((acc, o) => acc + (o.precio || 0), 0)
    };

    const totalDinero = todasNovedades.reduce((acc, n) => acc + n.totalAPagar, 0);
    const dineroSolucionado = todasNovedades.filter(n => n.estado === 'solucionado').reduce((acc, n) => acc + n.totalAPagar, 0);
    const dineroCancelado = todasNovedades.filter(n => n.estado === 'cancelado' || n.estado === 'devolucion').reduce((acc, n) => acc + n.totalAPagar, 0);
    const dineroActivo = todasNovedades.filter(n => ['novedad', 'contactado'].includes(n.estado)).reduce((acc, n) => acc + n.totalAPagar, 0);

    const rankingTransportadoras = transportadorasAgrupadas
      .map(t => ({
        transportadora: t.transportadora,
        total: t._count.id,
        dinero: t._sum.totalAPagar || 0
      }))
      .sort((a, b) => b.total - a.total);

    const productosConMasNovedades = {};
    todasNovedades.forEach(n => {
      const producto = n.producto ? (n.producto.length > 50 ? n.producto.substring(0, 50) : n.producto) : 'Sin producto';
      if (!productosConMasNovedades[producto]) {
        productosConMasNovedades[producto] = { nombre: producto, cantidad: 0 };
      }
      productosConMasNovedades[producto].cantidad++;
    });
    todasOficina.forEach(o => {
      const producto = o.producto ? (o.producto.length > 50 ? o.producto.substring(0, 50) : o.producto) : 'Sin producto';
      if (!productosConMasNovedades[producto]) {
        productosConMasNovedades[producto] = { nombre: producto, cantidad: 0 };
      }
      productosConMasNovedades[producto].cantidad++;
    });
    const topProductos = Object.values(productosConMasNovedades)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const motivosNovedad = motivosAgrupados.map(m => ({
      motivo: m.motivoNovedad,
      total: m._count.id
    }));

    res.json({
      novedades,
      oficina,
      estadisticas: {
        totalDinero,
        dineroSolucionado,
        dineroCancelado,
        dineroActivo,
        porcentajeRecuperado: totalDinero > 0 ? Math.round((dineroSolucionado / totalDinero) * 100) : 0,
        porcentajePerdido: totalDinero > 0 ? Math.round((dineroCancelado / totalDinero) * 100) : 0
      },
      rankingTransportadoras,
      topProductos,
      motivosNovedad,
      actividadReciente: actividadReciente.map(h => ({
        id: h.id,
        texto: h.clienteNombre 
          ? `${h.usuario.nombre} cambió ${h.campo} en ${h.clienteNombre} de "${h.valorAnterior || 'vacío'}" a "${h.valorNuevo || 'vacío'}"`
          : `${h.usuario.nombre} cambió ${h.campo} de "${h.valorAnterior || 'vacío'}" a "${h.valorNuevo || 'vacío'}"`,
        hace: formatTimeAgo(h.createdAt)
      }))
    });
  } catch (error) {
    console.error('Get resumen dashboard error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} hr`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(date).toLocaleDateString('es-CO');
}

const getHoy = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const [novedadesHoy, oficinaHoy] = await Promise.all([
      prisma.pedidoNovedad.count({
        where: { createdAt: { gte: hoy, lt: manana } }
      }),
      prisma.pedidoOficina.count({
        where: { createdAt: { gte: hoy, lt: manana } }
      })
    ]);

    res.json({
      novedadesCreadasHoy: novedadesHoy,
      oficinaCreadosHoy: oficinaHoy,
      fecha: hoy.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get hoy dashboard error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getChartData = async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dias));
    startDate.setHours(0, 0, 0, 0);

    const novedades = await prisma.pedidoNovedad.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, estado: true }
    });

    const oficina = await prisma.pedidoOficina.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, estado: true }
    });

    const dailyData = {};
    for (let i = 0; i < parseInt(dias); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = {
        fecha: dateKey,
        novedades_total: 0,
        novedades_solucionado: 0,
        novedades_cancelado: 0,
        oficina_total: 0,
        oficina_va_recoger: 0
      };
    }

    novedades.forEach(n => {
      const dateKey = new Date(n.createdAt).toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].novedades_total++;
        if (n.estado === 'solucionado') dailyData[dateKey].novedades_solucionado++;
        if (n.estado === 'cancelado' || n.estado === 'devolucion') dailyData[dateKey].novedades_cancelado++;
      }
    });

    oficina.forEach(o => {
      const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].oficina_total++;
        if (o.estado === 'va_a_recoger') dailyData[dateKey].oficina_va_recoger++;
      }
    });

    const chartData = Object.values(dailyData).sort((a, b) => a.fecha.localeCompare(b.fecha));

    const estadoDistribution = {
      novedad: novedades.filter(n => n.estado === 'novedad').length,
      contactado: novedades.filter(n => n.estado === 'contactado').length,
      solucionado: novedades.filter(n => n.estado === 'solucionado').length,
      cancelado: novedades.filter(n => n.estado === 'cancelado').length,
      devolucion: novedades.filter(n => n.estado === 'devolucion').length
    };

    res.json({ chartData, estadoDistribution });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getRendimientoOperadores = async (req, res) => {
  try {
    const { periodo = 'mes', fechaDesde, fechaHasta } = req.query;
    const { start, end } = getDateRange(periodo, fechaDesde, fechaHasta);

    const whereNovedad = start ? { createdAt: { gte: start, lte: end } } : {};
    const whereOficina = start ? { createdAt: { gte: start, lte: end } } : {};

    const operadores = await prisma.usuario.findMany({
      where: { rol: { in: ['admin', 'operador', 'operador_asignado'] }, activo: true },
      select: { id: true, nombre: true }
    });

    const rendimiento = await Promise.all(operadores.map(async (op) => {
      const [
        novedadesAsignadas,
        novedadesResueltas,
        oficinaAsignadas,
        oficinaRecogidas
      ] = await Promise.all([
        prisma.pedidoNovedad.count({ where: { ...whereNovedad, asignadoId: op.id } }),
        prisma.pedidoNovedad.count({ where: { ...whereNovedad, asignadoId: op.id, estado: 'solucionado' } }),
        prisma.pedidoOficina.count({ where: { ...whereOficina, asignadoId: op.id } }),
        prisma.pedidoOficina.count({ where: { ...whereOficina, asignadoId: op.id, estado: 'va_a_recoger' } })
      ]);

      const totalAsignados = novedadesAsignadas + oficinaAsignadas;
      const totalResueltos = novedadesResueltas + oficinaRecogidas;

      return {
        operador: op.nombre,
        novedadesAsignadas,
        novedadesResueltas,
        oficinaAsignadas,
        oficinaRecogidas,
        totalAtendido: totalAsignados,
        tasaExito: totalAsignados > 0 ? Math.round((totalResueltos / totalAsignados) * 100) : 0
      };
    }));

    res.json(rendimiento.sort((a, b) => b.totalAtendido - a.totalAtendido));
  } catch (error) {
    console.error('Get rendimiento error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getMetricasOperadores = async (req, res) => {
  try {
    const { periodo = 'mes', fechaDesde, fechaHasta } = req.query;
    const { start, end } = getDateRange(periodo, fechaDesde, fechaHasta);

    const whereNovedad = start ? { createdAt: { gte: start, lte: end } } : {};
    const whereOficina = start ? { createdAt: { gte: start, lte: end } } : {};
    const whereContacto = start ? { createdAt: { gte: start, lte: end } } : {};
    const whereTransferencia = start ? { createdAt: { gte: start, lte: end } } : {};
    const whereHistorial = start ? { createdAt: { gte: start, lte: end } } : {};

    const operadores = await prisma.usuario.findMany({
      where: { rol: { in: ['admin', 'operador'] }, activo: true },
      select: { id: true, nombre: true, email: true, rol: true }
    });

    const metricas = await Promise.all(operadores.map(async (op) => {
      const [
        novedadesAsignadas,
        novedadesResueltas,
        oficinaAsignadas,
        oficinaRecogidas,
        intentosContacto,
        contactosExitosos,
        transferenciasEnviadas,
        transferenciasRecibidas,
        registrosNovedadCreados,
        registrosOficinaCreados,
        novedadesResueltasData,
        oficinaResueltasData,
        sesionesActivas
      ] = await Promise.all([
        prisma.pedidoNovedad.count({ where: { ...whereNovedad, asignadoId: op.id } }),
        prisma.pedidoNovedad.count({ where: { ...whereNovedad, asignadoId: op.id, estado: 'solucionado' } }),
        prisma.pedidoOficina.count({ where: { ...whereOficina, asignadoId: op.id } }),
        prisma.pedidoOficina.count({ where: { ...whereOficina, asignadoId: op.id, estado: 'va_a_recoger' } }),
        prisma.intentoContacto.count({ where: { ...whereContacto, usuarioId: op.id } }),
        prisma.intentoContacto.count({ where: { ...whereContacto, usuarioId: op.id, resultado: 'contactado' } }),
        prisma.transferencia.count({ where: { ...whereTransferencia, deUsuarioId: op.id } }),
        prisma.transferencia.count({ where: { ...whereTransferencia, aUsuarioId: op.id } }),
        prisma.pedidoNovedad.count({ where: { ...whereNovedad, createdById: op.id } }),
        prisma.pedidoOficina.count({ where: { ...whereOficina, createdById: op.id } }),
        prisma.pedidoNovedad.findMany({
          where: { ...whereNovedad, asignadoId: op.id, estado: 'solucionado' },
          select: { createdAt: true, updatedAt: true }
        }),
        prisma.pedidoOficina.findMany({
          where: { ...whereOficina, asignadoId: op.id, estado: 'va_a_recoger' },
          select: { createdAt: true, updatedAt: true }
        }),
        prisma.sesion.findMany({
          where: {
            usuarioId: op.id,
            ...(start ? { ultimaAct: { gte: start, lte: end } } : {}),
            minutosActivos: { gt: 0 }
          },
          select: { minutosActivos: true }
        })
      ]);

      const registrosCreados = registrosNovedadCreados + registrosOficinaCreados;

      const [dineroNovedad, dineroOficina] = await Promise.all([
        prisma.pedidoNovedad.aggregate({
          where: { ...whereNovedad, asignadoId: op.id, estado: 'solucionado' },
          _sum: { totalAPagar: true }
        }),
        prisma.pedidoOficina.aggregate({
          where: { ...whereOficina, asignadoId: op.id, estado: 'va_a_recoger' },
          _sum: { precio: true }
        })
      ]);
      const dineroManejado = (dineroNovedad._sum.totalAPagar || 0) + (dineroOficina._sum.precio || 0);
      const dineroNovedadVal = dineroNovedad._sum.totalAPagar || 0;
      const dineroOficinaVal = dineroOficina._sum.precio || 0;

      let promedioResolucionHoras = 0;
      let promResNovedadHoras = 0;
      let promResOficinaHoras = 0;
      const novedadesHoras = novedadesResueltasData.map(n => ({
        horas: (new Date(n.updatedAt) - new Date(n.createdAt)) / 3600000
      }));
      const oficinaHoras = oficinaResueltasData.map(o => ({
        horas: (new Date(o.updatedAt) - new Date(o.createdAt)) / 3600000
      }));
      const todasResueltas = [...novedadesHoras, ...oficinaHoras];
      if (todasResueltas.length > 0) {
        const totalHoras = todasResueltas.reduce((acc, r) => acc + r.horas, 0);
        promedioResolucionHoras = Math.round((totalHoras / todasResueltas.length) * 10) / 10;
      }
      if (novedadesHoras.length > 0) {
        promResNovedadHoras = Math.round((novedadesHoras.reduce((a, r) => a + r.horas, 0) / novedadesHoras.length) * 10) / 10;
      }
      if (oficinaHoras.length > 0) {
        promResOficinaHoras = Math.round((oficinaHoras.reduce((a, r) => a + r.horas, 0) / oficinaHoras.length) * 10) / 10;
      }

      const totalAsignados = novedadesAsignadas + oficinaAsignadas;
      const totalResueltos = novedadesResueltas + oficinaRecogidas;
      const tasaResolucion = totalAsignados > 0 ? Math.round((totalResueltos / totalAsignados) * 100) : 0;
      const tiempoActivoMinutos = sesionesActivas.reduce((acc, s) => acc + s.minutosActivos, 0);

      return {
        operadorId: op.id,
        operador: op.nombre,
        email: op.email,
        rol: op.rol,
        novedadesAsignadas,
        novedadesResueltas,
        oficinaAsignadas,
        oficinaRecogidas,
        totalAsignados,
        totalResueltos,
        tasaResolucion,
        intentosContacto,
        contactosExitosos,
        transferenciasEnviadas,
        transferenciasRecibidas,
        registrosCreados,
        registrosNovedadCreados,
        registrosOficinaCreados,
        dineroManejado,
        dineroNovedad: dineroNovedadVal,
        dineroOficina: dineroOficinaVal,
        promedioResolucionHoras,
        promResNovedadHoras,
        promResOficinaHoras,
        tiempoActivoMinutos
      };
    }));

    res.json(metricas.sort((a, b) => b.totalResueltos - a.totalResueltos));
  } catch (error) {
    console.error('Get metricas operadores error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getTiempoActivo = async (req, res) => {
  try {
    const { periodo = 'hoy', fechaDesde, fechaHasta } = req.query;
    const { start, end } = getDateRange(periodo, fechaDesde, fechaHasta);

    const where = start ? { ultimaAct: { gte: start, lte: end } } : {};

    const sesiones = await prisma.sesion.findMany({
      where: { ...where, minutosActivos: { gt: 0 } },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } }
      },
      orderBy: { minutosActivos: 'desc' }
    });

    const tiempoPorUsuario = {};
    sesiones.forEach(s => {
      const uid = s.usuarioId;
      if (!tiempoPorUsuario[uid]) {
        tiempoPorUsuario[uid] = {
          usuarioId: uid,
          usuario: s.usuario.nombre,
          email: s.usuario.email,
          rol: s.usuario.rol,
          minutosActivos: 0,
          sesiones: 0,
          ultimaActividad: null
        };
      }
      tiempoPorUsuario[uid].minutosActivos += s.minutosActivos;
      tiempoPorUsuario[uid].sesiones++;
      const ultAct = new Date(s.ultimaAct);
      if (!tiempoPorUsuario[uid].ultimaActividad || ultAct > new Date(tiempoPorUsuario[uid].ultimaActividad)) {
        tiempoPorUsuario[uid].ultimaActividad = s.ultimaAct;
      }
    });

    const resultado = Object.values(tiempoPorUsuario)
      .sort((a, b) => b.minutosActivos - a.minutosActivos)
      .map(r => ({
        ...r,
        horas: Math.floor(r.minutosActivos / 60),
        minutos: r.minutosActivos % 60,
        formateado: `${Math.floor(r.minutosActivos / 60)}h ${r.minutosActivos % 60}m`
      }));

    res.json(resultado);
  } catch (error) {
    console.error('Get tiempo activo error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getResumenDiario = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({ error: 'fechaDesde y fechaHasta son requeridos' });
    }

    const { start, end } = getDateRange(null, fechaDesde, fechaHasta);

    const [novedadesCreadas, novedadesResueltas, oficinaCreadas, oficinaResueltas] = await Promise.all([
      prisma.pedidoNovedad.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true, createdAt: true, estado: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.pedidoNovedad.findMany({
        where: {
          updatedAt: { gte: start, lte: end },
          estado: 'solucionado'
        },
        select: {
          id: true, updatedAt: true, nombre: true, apellido: true, producto: true,
          guia: true, totalAPagar: true, asignadoId: true,
          asignado: { select: { id: true, nombre: true } }
        },
        orderBy: { updatedAt: 'asc' }
      }),
      prisma.pedidoOficina.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true, createdAt: true, estado: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.pedidoOficina.findMany({
        where: {
          updatedAt: { gte: start, lte: end },
          estado: 'va_a_recoger'
        },
        select: {
          id: true, updatedAt: true, nombre: true, apellido: true, producto: true,
          precio: true, guia: true, asignadoId: true,
          asignado: { select: { id: true, nombre: true } }
        },
        orderBy: { updatedAt: 'asc' }
      })
    ]);

    const dateMap = {};
    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      dateMap[dateKey] = {
        fecha: dateKey,
        novedadesCreadas: 0,
        novedadesResueltas: 0,
        oficinaCreadas: 0,
        oficinaResueltas: 0,
        operadores: {}
      };
      current.setDate(current.getDate() + 1);
    }

    novedadesCreadas.forEach(n => {
      const dk = new Date(n.createdAt).toISOString().split('T')[0];
      if (dateMap[dk]) dateMap[dk].novedadesCreadas++;
    });

    oficinaCreadas.forEach(o => {
      const dk = new Date(o.createdAt).toISOString().split('T')[0];
      if (dateMap[dk]) dateMap[dk].oficinaCreadas++;
    });

    novedadesResueltas.forEach(n => {
      const dk = new Date(n.updatedAt).toISOString().split('T')[0];
      if (dateMap[dk]) {
        dateMap[dk].novedadesResueltas++;
        const opId = n.asignadoId || 'sin_asignar';
        if (!dateMap[dk].operadores[opId]) {
          dateMap[dk].operadores[opId] = {
            operador: n.asignado?.nombre || 'Sin asignar',
            novedadesResueltas: 0, oficinaResueltas: 0,
            casos: []
          };
        }
        dateMap[dk].operadores[opId].novedadesResueltas++;
        dateMap[dk].operadores[opId].casos.push({
          tipo: 'novedad',
          cliente: `${n.nombre} ${n.apellido}`,
          producto: n.producto,
          guia: n.guia,
          valor: n.totalAPagar
        });
      }
    });

    oficinaResueltas.forEach(o => {
      const dk = new Date(o.updatedAt).toISOString().split('T')[0];
      if (dateMap[dk]) {
        dateMap[dk].oficinaResueltas++;
        const opId = o.asignadoId || 'sin_asignar';
        if (!dateMap[dk].operadores[opId]) {
          dateMap[dk].operadores[opId] = {
            operador: o.asignado?.nombre || 'Sin asignar',
            novedadesResueltas: 0, oficinaResueltas: 0,
            casos: []
          };
        }
        dateMap[dk].operadores[opId].oficinaResueltas++;
        dateMap[dk].operadores[opId].casos.push({
          tipo: 'oficina',
          cliente: `${o.nombre} ${o.apellido}`,
          producto: o.producto,
          guia: o.guia,
          valor: o.precio
        });
      }
    });

    const diario = Object.values(dateMap)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(d => ({
        ...d,
        operadores: Object.values(d.operadores).sort((a, b) =>
          (b.novedadesResueltas + b.oficinaResueltas) - (a.novedadesResueltas + a.oficinaResueltas)
        )
      }));

    const totalNovedadesCreadas = novedadesCreadas.length;
    const totalNovedadesResueltas = novedadesResueltas.length;
    const totalOficinaCreadas = oficinaCreadas.length;
    const totalOficinaResueltas = oficinaResueltas.length;
    const todasNoResueltas = novedadesCreadas.filter(n => n.estado !== 'solucionado').length;
    const oficinasNoResueltas = oficinaCreadas.filter(o => o.estado !== 'va_a_recoger').length;

    res.json({
      rango: { desde: fechaDesde, hasta: fechaHasta },
      totales: {
        novedadesCreadas: totalNovedadesCreadas,
        novedadesResueltas: totalNovedadesResueltas,
        novedadesPendientes: todasNoResueltas,
        oficinaCreadas: totalOficinaCreadas,
        oficinaResueltas: totalOficinaResueltas,
        oficinaPendientes: oficinasNoResueltas,
      tasaNovedades: totalNovedadesCreadas > 0 ? Math.min(100, Math.round((totalNovedadesResueltas / totalNovedadesCreadas) * 100)) : 0,
      tasaOficina: totalOficinaCreadas > 0 ? Math.min(100, Math.round((totalOficinaResueltas / totalOficinaCreadas) * 100)) : 0
      },
      diario
    });
  } catch (error) {
    console.error('Get resumen diario error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getMetricasLucidsales = async (req, res) => {
  try {
    const { periodo = 'mes', fechaDesde, fechaHasta } = req.query;
    const { start, end } = getDateRange(periodo, fechaDesde, fechaHasta);

    const whereDate = start ? { createdAt: { gte: start, lte: end } } : {};

    const operadores = await prisma.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, rol: true }
    });

    const metricas = await Promise.all(operadores.map(async (op) => {
      const [vinculadosCreados, vinculadosAsignados, vinculadosSubidos] = await Promise.all([
        prisma.pedidoVinculado.count({ where: { ...whereDate, createdById: op.id } }),
        prisma.pedidoVinculado.count({ where: { ...whereDate, asignadoId: op.id } }),
        prisma.pedidoVinculado.count({ where: { ...whereDate, createdById: op.id, notas: { contains: 'Producto' } } })
      ]);

      const totales = await prisma.pedidoVinculado.aggregate({
        where: { ...whereDate, createdById: op.id },
        _count: { id: true }
      });

      return {
        operadorId: op.id,
        operador: op.nombre,
        rol: op.rol,
        vinculadosCreados,
        vinculadosAsignados,
        totalVinculados: totales._count.id
      };
    }));

    res.json(metricas.filter(m => m.totalVinculados > 0 || m.vinculadosAsignados > 0).sort((a, b) => b.totalVinculados - a.totalVinculados));
  } catch (error) {
    console.error('Get metricas lucidsales error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getResumen, getHoy, getChartData, getRendimientoOperadores, getMetricasOperadores, getTiempoActivo,   getResumenDiario,
  getMetricasLucidsales
};