const { prisma } = require('../prisma/client');

const getConfiguracion = async (req, res) => {
  try {
    let config = await prisma.configuracion.findFirst();

    if (!config) {
      config = await prisma.configuracion.create({
        data: {
          auto_asignar_novedades: false,
          auto_asignar_oficina: false,
          metodo_asignacion: 'round_robin',
          operadores_incluidos: '[]',
          ultimo_indice_round_robin: 0
        }
      });
    }

    res.json({
      ...config,
      operadores_incluidos: JSON.parse(config.operadores_incluidos)
    });
  } catch (error) {
    console.error('Get configuracion error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateConfiguracion = async (req, res) => {
  try {
    const { auto_asignar_novedades, auto_asignar_oficina, metodo_asignacion, operadores_incluidos } = req.body;

    let config = await prisma.configuracion.findFirst();

    if (!config) {
      config = await prisma.configuracion.create({
        data: {
          auto_asignar_novedades: auto_asignar_novedades ?? false,
          auto_asignar_oficina: auto_asignar_oficina ?? false,
          metodo_asignacion: metodo_asignacion ?? 'round_robin',
          operadores_incluidos: JSON.stringify(operadores_incluidos ?? [])
        }
      });
    } else {
      config = await prisma.configuracion.update({
        where: { id: config.id },
        data: {
          auto_asignar_novedades: auto_asignar_novedades ?? config.auto_asignar_novedades,
          auto_asignar_oficina: auto_asignar_oficina ?? config.auto_asignar_oficina,
          metodo_asignacion: metodo_asignacion ?? config.metodo_asignacion,
          operadores_incluidos: JSON.stringify(operadores_incluidos ?? JSON.parse(config.operadores_incluidos))
        }
      });
    }

    res.json({
      ...config,
      operadores_incluidos: JSON.parse(config.operadores_incluidos)
    });
  } catch (error) {
    console.error('Update configuracion error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getConfiguracion, updateConfiguracion };