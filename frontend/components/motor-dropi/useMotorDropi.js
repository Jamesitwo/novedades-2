'use client';
// ¿Esta activo el motor de subida a Dropi? Lo decide el backend (MOTOR_DROPI=1).
// Mientras no responda, o si falla, se toma como apagado: nada se muestra.
import { useEffect, useState } from 'react';
import api from '@/lib/api';

let cache = null; // { activo, t }
let pedido = null;
const VIGENCIA_MS = 5 * 60 * 1000;

function consultar() {
  if (cache && Date.now() - cache.t < VIGENCIA_MS) return Promise.resolve(cache.activo);
  if (!pedido) {
    pedido = api.get('/api/motor-dropi/_estado')
      .then(({ data }) => Boolean(data?.activo))
      .catch(() => false)
      .then((activo) => {
        cache = { activo, t: Date.now() };
        pedido = null;
        return activo;
      });
  }
  return pedido;
}

export function useMotorDropiActivo() {
  const [activo, setActivo] = useState(cache?.activo ?? false);
  useEffect(() => {
    let vivo = true;
    consultar().then((a) => vivo && setActivo(a));
    return () => { vivo = false; };
  }, []);
  return activo;
}
