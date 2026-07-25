import { MetadataRoute } from 'next';

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/tienda', disallow: ['/tienda/admin', '/tienda/comprar', '/api/'] },
      { userAgent: 'Googlebot', allow: '/tienda', disallow: ['/tienda/admin', '/tienda/comprar', '/api/'] }
    ],
    sitemap: 'https://pizdo.info/sitemap.xml'
  };
}
