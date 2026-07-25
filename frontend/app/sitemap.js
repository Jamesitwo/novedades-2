export default async function sitemap() {
  const baseUrl = 'https://pizdo.info';

  const staticPages = [
    { url: `${baseUrl}/tienda`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/tienda?oferta=true`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ];

  let productPages = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pizdo.info';
    const res = await fetch(`${apiUrl}/api/tienda?limit=200&orden=reciente`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      const productos = data.productos || [];
      productPages = productos.map(p => ({
        url: `${baseUrl}/tienda/${p.id}`,
        lastModified: new Date(p.updatedAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.7
      }));
    }
  } catch {}

  return [...staticPages, ...productPages];
}
