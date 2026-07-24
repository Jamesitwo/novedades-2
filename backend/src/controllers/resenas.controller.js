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
    const { cantidad = 10, distribucion, diasMax = 90, conComentario = 75 } = req.body;

    const producto = await prisma.productoTienda.findUnique({ where: { id: productoId } });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const dist = distribucion && typeof distribucion === 'object' ? distribucion : { 5: 45, 4: 25, 3: 12, 2: 10, 1: 8 };
    const thresholds = [];
    let acum = 0;
    [5, 4, 3, 2, 1].forEach(star => {
      acum += (dist[String(star)] || dist[star] || 0);
      thresholds.push({ star, max: acum });
    });
    if (acum === 0) thresholds.push({ star: 5, max: 100 });

    const commentProb = Math.min(100, Math.max(0, parseInt(conComentario) || 75)) / 100;

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

    const getCalificacion = () => {
      const r = Math.random() * acum;
      for (const t of thresholds) {
        if (r < t.max) return t.star;
      }
      return 5;
    };

    const getComentario = (calificacion) => {
      if (calificacion >= 4) return comentariosPositivos[Math.floor(Math.random() * comentariosPositivos.length)];
      if (calificacion >= 3) return comentariosNeutrales[Math.floor(Math.random() * comentariosNeutrales.length)];
      return comentariosNegativos[Math.floor(Math.random() * comentariosNegativos.length)];
    };

    const creadas = [];
    for (let i = 0; i < Math.min(parseInt(cantidad) || 10, 50); i++) {
      const calificacion = getCalificacion();
      let comentario = Math.random() < commentProb ? getComentario(calificacion) : null;
      if (Math.random() < 0.25) comentario = null;

      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const diasAtras = Math.floor(Math.random() * (parseInt(diasMax) || 90));

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
