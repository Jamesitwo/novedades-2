// Adaptador del cliente de LucidSales de los paneles: en Pizdo no hay sesion de
// LucidSales en el navegador; la sesion es la de Pizdo (ver auth/AuthContext).
import { sesionActual } from '../auth/AuthContext';

export function errMsg(e) {
  if (!e) return 'Error desconocido';
  if (typeof e === 'string') return e;
  return e.response?.data?.msg || e.response?.data?.error?.message || e.response?.data?.error || e.message || String(e);
}

export function loadSession() {
  return sesionActual();
}

export function normaIds(v) {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}
