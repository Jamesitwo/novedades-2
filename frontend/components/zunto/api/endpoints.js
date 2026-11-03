// Lo que los componentes de Zunto usan de su cliente de LucidSales, servido
// por las rutas de Pizdo.
import api from '@/lib/api';

export const ESTADOS_PEDIDO = {
  0: 'Por confirmar',
  1: 'Cancelado',
  2: 'Confirmado',
  3: 'Modificado',
  4: 'En Transito',
  5: 'En Reparto',
  6: 'Entregado',
  7: 'Devuelto',
  8: 'En Novedad',
  9: 'Novedad Solucionada'
};

export const productos = {
  // catalogo de la tienda (reglas de envio por producto)
  list: async () => (await api.post('/api/lucidsales/productos')).data
};

export const negocio = {
  // el enlace al inbox de Lucid Bot no se usa en Pizdo
  bot: async () => ({ data: [] })
};

export const auth = {
  tiendas: async () => ({ data: [] })
};
