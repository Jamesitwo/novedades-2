// Adaptador: los componentes de Zunto llaman a "/api/..." de su backend; en
// Pizdo ese backend es el motor montado en /api/zunto/... con la sesion de
// Pizdo (Bearer) y la tienda activa (?tienda=).
const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

function tiendaActiva() {
  try {
    const t = localStorage.getItem('tiendaActiva');
    return t === 'zunto' || t === 'pizdo' ? t : null;
  } catch {
    return null;
  }
}

/** "/api/subida" -> "<API>/api/zunto/subida?tienda=pizdo" */
export function urlBackend(path) {
  let p = String(path || '');
  if (/^https?:\/\//.test(p)) return p;
  p = p.replace(/^\/api(?=\/|$)/, '/api/zunto');
  const t = tiendaActiva();
  if (t && !/[?&]tienda=/.test(p)) p += `${p.includes('?') ? '&' : '?'}tienda=${t}`;
  return `${BASE}${p}`;
}

export function cabecerasBackend() {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function mensaje(datos, status) {
  if (datos && typeof datos.msg === 'string' && datos.msg) return datos.msg;
  if (datos && typeof datos.error === 'string') return datos.error;
  if (datos?.error?.message) return datos.error.message;
  return `Error ${status} del servidor`;
}

function sesionCaida(res) {
  if (res.status !== 401 || typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/admin')) return;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/admin/login';
}

export async function backend(path, opciones = {}) {
  const { method = 'GET', body } = opciones;
  let res;
  try {
    res = await fetch(urlBackend(path), {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...cabecerasBackend()
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    sesionCaida(res);
    throw new Error(mensaje(datos, res.status));
  }
  return datos;
}

/** GET que devuelve null si falla (no rompe la pantalla). */
export async function backendSuave(path) {
  try {
    return await backend(path);
  } catch {
    return null;
  }
}

export async function backendArchivo(path) {
  const res = await fetch(urlBackend(path), { headers: cabecerasBackend() });
  if (!res.ok) {
    const datos = await res.json().catch(() => null);
    throw new Error(mensaje(datos, res.status));
  }
  const disposition = res.headers.get('content-disposition') ?? '';
  const nombre = disposition.match(/filename="([^"]+)"/)?.[1] || 'descarga';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
