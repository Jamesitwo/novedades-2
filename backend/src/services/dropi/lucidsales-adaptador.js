// Adaptador: expone la interfaz `cliente` que espera el motor de subida de
// ZuntoStore (obtenerPedido / actualizarPedido / listarPedidos / obtenerProducto)
// sobre los servicios reales de LucidSales de Pizdo.
//
// El motor de Zunto habla con un cliente que recibe `tienda`/`idEmpresa` como
// el "id de empresa" de LucidSales. Aqui eso ya no se pasa asi: Pizdo resuelve
// la credencial a partir del `tiendaId` (UUID) de nuestra BD. Por eso el
// adaptador se crea atado a una tienda y IGNORA el idEmpresa que le llega,
// usando siempre su tiendaId.
//
//   const cliente = crearClienteLucidPizdo(tiendaId);
//   const pedido = await cliente.obtenerPedido(123);   // tiendaId ya atado

const lucidsalesService = require('../lucidsales.service');

/**
 * Crea el `cliente` del motor de subida, atado a una tienda.
 * @param {string|null} tiendaId UUID de la tienda (null = por defecto)
 */
function crearClienteLucidPizdo(tiendaId = null) {
  return {
    /** Pedido completo por id. */
    async obtenerPedido(id) {
      return lucidsalesService.getPedidoById(id, tiendaId);
    },

    /**
     * Actualiza un pedido. El motor pasa el `idEmpresa` de LucidSales; aqui no
     * hace falta porque la credencial sale del tiendaId atado al adaptador.
     */
    async actualizarPedido(body /*, idEmpresa */) {
      return lucidsalesService.updatePedido(body, tiendaId);
    },

    /**
     * Listado paginado de pedidos (el "light data" que usa el tick).
     * El motor llama `listarPedidos({idEmpresa, page, itemsPerPage, search, filtros})`.
     * `filtros` de Zunto es un arreglo; en Pizdo `filters` es el JSON string.
     */
    async listarPedidos({ page = 1, itemsPerPage = 100, search = '', filtros = [], filters } = {}) {
      const filtrosStr = filters !== undefined
        ? filters
        : JSON.stringify(Array.isArray(filtros) ? filtros : []);
      const r = await lucidsalesService.getPedidos({ page, itemsPerPage, search, filters: filtrosStr, tiendaId });
      // El motor espera { pedidos, totalRecords }; Pizdo devuelve la cruda.
      const pedidos = Array.isArray(r) ? r : (r?.pedidos ?? r?.data ?? []);
      const totalRecords = Number(r?.totalRecords ?? r?.total ?? pedidos.length);
      return { pedidos, totalRecords };
    },

    /** Producto individual por id. */
    async obtenerProducto(id) {
      return lucidsalesService.getProducto(id, tiendaId);
    },

    /** Lista completa de productos (para el catalogo del agente). */
    async productosTienda() {
      const r = await lucidsalesService.getProductos(tiendaId);
      return Array.isArray(r) ? r : (r?.productos ?? r?.data ?? []);
    }
  };
}

module.exports = { crearClienteLucidPizdo };
