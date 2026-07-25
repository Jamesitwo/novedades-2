import { MetadataRoute } from 'next';

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/comprar/', '/api/'] },
      { userAgent: 'Googlebot', allow: '/', disallow: ['/admin/', '/comprar/', '/api/'] }
    ],
    sitemap: 'https://pizdo.info/sitemap.xml'
  };
}
