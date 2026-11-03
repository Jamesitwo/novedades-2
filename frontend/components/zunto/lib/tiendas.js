'use client';
// Nombre de la tienda de LucidSales: en Pizdo es la tienda activa.
import { useAuth } from '../auth/AuthContext';

export function etiquetaTienda(id, mapa) {
  const nombre = mapa[String(id)];
  return nombre ? `${nombre} (#${id})` : `Tienda #${id}`;
}

export function nombreTienda(id, mapa) {
  return mapa[String(id)] ?? null;
}

export function useNombresTiendas() {
  const { session } = useAuth();
  return session?.tiendaActiva ? { [String(session.tiendaActiva)]: session.nombreTienda || '' } : {};
}

export function useEtiquetaTienda() {
  const { session } = useAuth();
  const mapa = useNombresTiendas();
  return (id) => etiquetaTienda(id ?? session?.tiendaActiva ?? '', mapa);
}
