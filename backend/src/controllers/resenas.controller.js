const { prisma } = require('../prisma/client');

const getByProducto = async (req, res) => {
  try {
    const { productoId } = req.params;
    const resenas = await prisma.resena.findMany({
      where: { productoTiendaId: productoId },
      orderBy: { createdAt: 'desc' }
    });

    const promedio = resenas.length > 0
      ? Math.round((resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length) * 10) / 10
      : 0;

    const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    resenas.forEach(r => { if (distribucion[r.calificacion] !== undefined) distribucion[r.calificacion]++; });

    res.json({ resenas, promedio, total: resenas.length, distribucion });
  } catch (error) {
    console.error('Get resenas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden crear reseñas' });
    }
    const { productoId } = req.params;
    const { nombre, calificacion, comentario } = req.body;

    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!calificacion || calificacion < 1 || calificacion > 5) return res.status(400).json({ error: 'Calificación debe ser 1-5' });

    const resena = await prisma.resena.create({
      data: {
        productoTiendaId: productoId,
        nombre: nombre.trim(),
        calificacion: parseInt(calificacion),
        comentario: comentario || null
      }
    });

    res.status(201).json(resena);
  } catch (error) {
    console.error('Create resena error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const generarAleatorias = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden generar reseñas' });
    }
    const { productoId } = req.params;
    const { cantidad = 10 } = req.body;

    const producto = await prisma.productoTienda.findUnique({ where: { id: productoId } });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const nombres = [
      'María G.', 'Carlos R.', 'Ana L.', 'Pedro M.', 'Laura S.',
      'Diego V.', 'Sofía C.', 'Andrés P.', 'Valentina D.', 'Jorge H.',
      'Camila N.', 'Felipe T.', 'Daniela B.', 'Santiago O.', 'Isabella F.',
      'Mateo Q.', 'Lucía W.', 'Gabriel A.', 'Fernanda K.', 'Juan E.',
      'Natalia J.', 'Samuel R.', 'Adriana M.', 'Emilio C.', 'Paula Z.'
    ];

    const comentariosPositivos = [
      'Excelente producto, superó mis expectativas.',
      'Muy buena calidad, lo recomiendo totalmente.',
      'Llegó rápido y en perfecto estado.',
      'Justo lo que necesitaba, excelente relación calidad-precio.',
      'Increíble, volvería a comprar sin duda.',
      'Me encantó, es tal cual la descripción.',
      'Muy satisfecho con la compra, gracias.',
      'Perfecto para lo que lo necesitaba.',
      'La calidad es impresionante, vale cada peso.',
      'Buenísimo, ya he comprado varios para regalar.',
      'Producto de primera, muy recomendado.',
      'Todo excelente, desde el empaque hasta el producto.',
      'Una compra increíble, quedé fascinado.',
      'Muy buen servicio y el producto es tal cual.',
      'Mejor de lo que esperaba, 10/10.',
    ];

    const comentariosNeutrales = [
      'Está bien, cumple con lo básico.',
      'Producto decente, nada del otro mundo.',
      'Bueno pero podría mejorar el empaque.',
      'Funciona bien, aunque esperaba un poco más.',
      'Correcto, sin más.',
      'Está bien por el precio.',
      'Cumple su función, nada extraordinario.',
    ];

    const comentariosNegativos = [
      'No era lo que esperaba, un poco decepcionado.',
      'La calidad no es la mejor, mejor buscar otra opción.',
      'Tardó en llegar y no era exactamente como la foto.',
      'Regular, hay mejores alternativas.',
      'No me convenció del todo.',
    ];

    const creadas = [];
    for (let i = 0; i < Math.min(cantidad, 50); i++) {
      const calificacionPeso = Math.random();
      let calificacion;
      let comentario = null;

      if (calificacionPeso < 0.45) {
        calificacion = 5;
        comentario = comentariosPositivos[Math.floor(Math.random() * comentariosPositivos.length)];
      } else if (calificacionPeso < 0.7) {
        calificacion = 4;
        comentario = comentariosPositivos[Math.floor(Math.random() * comentariosPositivos.length)];
      } else if (calificacionPeso < 0.82) {
        calificacion = 3;
        comentario = comentariosNeutrales[Math.floor(Math.random() * comentariosNeutrales.length)];
      } else if (calificacionPeso < 0.92) {
        calificacion = 2;
        comentario = comentariosNegativos[Math.floor(Math.random() * comentariosNegativos.length)];
      } else {
        calificacion = 1;
        comentario = comentariosNegativos[Math.floor(Math.random() * comentariosNegativos.length)];
      }

      if (Math.random() < 0.25) comentario = null;

      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const diasAtras = Math.floor(Math.random() * 90);

      const resena = await prisma.resena.create({
        data: {
          productoTiendaId: productoId,
          nombre,
          calificacion,
          comentario,
          createdAt: new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000)
        }
      });
      creadas.push(resena);
    }

    res.status(201).json({ message: `${creadas.length} reseñas generadas`, count: creadas.length });
  } catch (error) {
    console.error('Generar reseñas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getByProducto, create, generarAleatorias };
