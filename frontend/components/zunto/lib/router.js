'use client';
// react-router-dom -> next/link. Las rutas del panel de Zunto se pasan a las de Pizdo.
import NextLink from 'next/link';

function aPizdo(to) {
  const s = String(to || '');
  const m = s.match(/^\/pedidos\/([^/?#]+)/);
  if (m) return `/admin/lucidsales/${m[1]}`;
  if (s.startsWith('/ajustes')) return '/admin/subida-dropi';
  return s;
}

export function Link({ to, children, ...resto }) {
  return <NextLink href={aPizdo(to)} {...resto}>{children}</NextLink>;
}
