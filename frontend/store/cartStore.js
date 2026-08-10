import { create } from 'zustand';

const loadCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('pizdo_cart') || '[]');
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pizdo_cart', JSON.stringify(items));
  } catch {}
};

export const useCartStore = create((set, get) => ({
  items: [],
  drawerOpen: false,

  init: () => {
    set({ items: loadCart() });
  },

  addItem: (producto, cantidad = 1) => {
    const current = get().items;
    const existing = current.find(i => i.id === producto.id);
    let next;
    if (existing) {
      next = current.map(i =>
        i.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i
      );
    } else {
      next = [...current, {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.ofertaActiva && producto.ofertaPrecio ? producto.ofertaPrecio : producto.precioVenta,
        precioOriginal: producto.precioVenta,
        imagen: producto.imagen || '',
        categoria: producto.categoria || '',
        cantidad
      }];
    }
    saveCart(next);
    set({ items: next, drawerOpen: true });
  },

  removeItem: (id) => {
    const next = get().items.filter(i => i.id !== id);
    saveCart(next);
    set({ items: next });
  },

  updateQuantity: (id, cantidad) => {
    if (cantidad <= 0) {
      get().removeItem(id);
      return;
    }
    const next = get().items.map(i =>
      i.id === id ? { ...i, cantidad } : i
    );
    saveCart(next);
    set({ items: next });
  },

  clearCart: () => {
    saveCart([]);
    set({ items: [], drawerOpen: false });
  },

  toggleDrawer: () => set(s => ({ drawerOpen: !s.drawerOpen })),
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  getTotal: () => {
    return get().items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  },

  getCount: () => {
    return get().items.reduce((sum, i) => sum + i.cantidad, 0);
  }
}));
