'use client';
// Adaptador de la sesion de los paneles: tienda de LucidSales y usuario salen
// de Pizdo (GET /api/motor-dropi/_sesion), no de un login de LucidSales.
import { useEffect, useState } from 'react';
import { backend } from '../api/backend';

let actual = null;
let pedido = null;
const oyentes = new Set();

export function sesionActual() {
  return actual;
}

function cargar() {
  if (!pedido) {
    pedido = backend('/api/_sesion')
      .then((r) => {
        actual = r?.ok
          ? {
              tiendaActiva: r.tienda?.shopId ? Number(r.tienda.shopId) : null,
              idEmpresa: r.tienda?.shopId ? [String(r.tienda.shopId)] : [],
              nombreTienda: r.tienda?.nombre ?? null,
              user: r.usuario ?? null,
              esAdmin: Boolean(r.esAdmin)
            }
          : null;
      })
      .catch(() => {
        actual = null;
      })
      .finally(() => {
        oyentes.forEach((f) => f(actual));
      });
  }
  return pedido;
}

/** Cambio de tienda en Pizdo: se vuelve a pedir la sesion. */
export function reiniciarSesionPanel() {
  pedido = null;
  actual = null;
  return cargar();
}

export function useAuth() {
  const [session, setSession] = useState(actual);
  useEffect(() => {
    oyentes.add(setSession);
    if (!actual) void cargar();
    else setSession(actual);
    return () => oyentes.delete(setSession);
  }, []);
  return { session };
}
