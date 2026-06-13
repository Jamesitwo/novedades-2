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
    const { auto_asignar_novedades, auto_asignar_oficina, metodo_asignacion, operadores_incluidos,
      empresa_nombre, empresa_nit, empresa_direccion, empresa_telefono, empresa_email,
      empresa_logo, empresa_banco, empresa_tipo_cuenta, empresa_numero_cuenta, empresa_titular_cuenta,
      factura_terminos, factura_resolucion, factura_rango_desde, factura_rango_hasta, factura_vigencia,
      factura_pie_legal, factura_prefijo } = req.body;

    let config = await prisma.configuracion.findFirst();

    const extraData = {};
    if (empresa_nombre !== undefined) extraData.empresa_nombre = empresa_nombre;
    if (empresa_nit !== undefined) extraData.empresa_nit = empresa_nit;
    if (empresa_direccion !== undefined) extraData.empresa_direccion = empresa_direccion;
    if (empresa_telefono !== undefined) extraData.empresa_telefono = empresa_telefono;
    if (empresa_email !== undefined) extraData.empresa_email = empresa_email;
    if (empresa_logo !== undefined) extraData.empresa_logo = empresa_logo || null;
    if (empresa_banco !== undefined) extraData.empresa_banco = empresa_banco || null;
    if (empresa_tipo_cuenta !== undefined) extraData.empresa_tipo_cuenta = empresa_tipo_cuenta || null;
    if (empresa_numero_cuenta !== undefined) extraData.empresa_numero_cuenta = empresa_numero_cuenta || null;
    if (empresa_titular_cuenta !== undefined) extraData.empresa_titular_cuenta = empresa_titular_cuenta || null;
    if (factura_terminos !== undefined) extraData.factura_terminos = factura_terminos || null;
    if (factura_resolucion !== undefined) extraData.factura_resolucion = factura_resolucion || null;
    if (factura_rango_desde !== undefined) extraData.factura_rango_desde = factura_rango_desde || null;
    if (factura_rango_hasta !== undefined) extraData.factura_rango_hasta = factura_rango_hasta || null;
    if (factura_vigencia !== undefined) extraData.factura_vigencia = factura_vigencia || null;
    if (factura_pie_legal !== undefined) extraData.factura_pie_legal = factura_pie_legal || null;
    if (factura_prefijo !== undefined) extraData.factura_prefijo = factura_prefijo || null;

    if (!config) {
      config = await prisma.configuracion.create({
        data: {
          auto_asignar_novedades: auto_asignar_novedades ?? false,
          auto_asignar_oficina: auto_asignar_oficina ?? false,
          metodo_asignacion: metodo_asignacion ?? 'round_robin',
          operadores_incluidos: JSON.stringify(operadores_incluidos ?? []),
          ...extraData
        }
      });
    } else {
      config = await prisma.configuracion.update({
        where: { id: config.id },
        data: {
          auto_asignar_novedades: auto_asignar_novedades ?? config.auto_asignar_novedades,
          auto_asignar_oficina: auto_asignar_oficina ?? config.auto_asignar_oficina,
          metodo_asignacion: metodo_asignacion ?? config.metodo_asignacion,
          operadores_incluidos: JSON.stringify(operadores_incluidos ?? JSON.parse(config.operadores_incluidos)),
          ...extraData
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