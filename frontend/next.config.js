/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/tienda', destination: '/', permanent: true },
      { source: '/tienda/:id', destination: '/producto/:id', permanent: true },
      { source: '/tienda/comprar/:id', destination: '/comprar/:id', permanent: true },
      { source: '/dashboard', destination: '/admin/dashboard', permanent: true },
      { source: '/dashboard/:path*', destination: '/admin/dashboard/:path*', permanent: true },
      { source: '/login', destination: '/admin/login', permanent: true },
      { source: '/novedades/:path*', destination: '/admin/novedades/:path*', permanent: true },
      { source: '/oficina/:path*', destination: '/admin/oficina/:path*', permanent: true },
      { source: '/lucidsales/:path*', destination: '/admin/lucidsales/:path*', permanent: true },
      { source: '/usuarios', destination: '/admin/usuarios', permanent: true },
      { source: '/apikey', destination: '/admin/apikey', permanent: true },
      { source: '/configuracion', destination: '/admin/configuracion', permanent: true },
      { source: '/facturas/:path*', destination: '/admin/facturas/:path*', permanent: true },
      { source: '/garantias/:path*', destination: '/admin/garantias/:path*', permanent: true },
      { source: '/tareas/:path*', destination: '/admin/tareas/:path*', permanent: true },
      { source: '/pizdo', destination: '/admin/pizdo', permanent: true },
      { source: '/sesiones', destination: '/admin/sesiones', permanent: true },
      { source: '/etiquetas', destination: '/admin/etiquetas', permanent: true },
      { source: '/devoluciones', destination: '/admin/devoluciones', permanent: true },
      { source: '/solucionados', destination: '/admin/solucionados', permanent: true },
      { source: '/recoger', destination: '/admin/recoger', permanent: true },
    ];
  },
  webpack: (config) => {
    config.resolve.alias['@/lib'] = path.join(__dirname, 'lib');
    config.resolve.alias['@/store'] = path.join(__dirname, 'store');
    return config;
  },
}

module.exports = nextConfig