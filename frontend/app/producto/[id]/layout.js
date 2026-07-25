export async function generateMetadata({ params }) {
  const id = params.id;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${baseUrl}/api/tienda/${id}`, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    });
    clearTimeout(timeout);
    if (!res.ok) return { title: 'Producto | Pizdo' };
    const producto = await res.json();
    const nombre = producto.nombre || 'Producto';
    const descripcion = producto.descripcion || `Compra ${nombre} en Pizdo. Herramientas industriales de calidad.`;
    const precio = producto.ofertaActiva && producto.ofertaPrecio ? producto.ofertaPrecio : producto.precioVenta;
    
    return {
      title: `${nombre} — Pizdo Industrial Tools`,
      description: `${descripcion} Precio: ${Number(precio).toLocaleString('es-CO')}. Envíos a toda Colombia.`,
      openGraph: {
        title: `${nombre} | Pizdo`,
        description: `${descripcion} — ${Number(precio).toLocaleString('es-CO')}`,
        images: producto.imagen ? [{ url: producto.imagen, width: 800, height: 800 }] : [],
        type: 'product',
      },
      alternates: { canonical: `https://pizdo.info/producto/${id}` }
    };
  } catch {
    return { title: 'Producto | Pizdo' };
  }
}

export default function ProductoLayout({ children }) {
  return children;
}
