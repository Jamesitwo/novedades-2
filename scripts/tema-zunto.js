// Pasa el CSS del panel de ZuntoStore (tema claro, colores fijos) al tema de
// Pizdo: oscuro/claro segun [data-theme], con sus variables (--bg, --bg2,
// --border, --text, --accent, --green, --amber, --red...). Lo usa
// scripts/sincronizar-zunto.js despues de prefijar con .zunto-ui.
//
// 1. Las variables de Zunto que chocan con las de Pizdo (--bg, --border,
//    --text, --radius) se renombran a --z-*, y todas apuntan a Pizdo.
// 2. Cada color fijo se cambia segun DONDE se usa: un blanco de fondo pasa a
//    ser la tarjeta de Pizdo, un rosado de fondo pasa a "rojo suave", un rojo
//    oscuro de texto pasa a --red, etc. El blanco de texto (botones) se deja.
const postcss = require('postcss');

const RENOMBRAR = ['--bg', '--border', '--text', '--radius'];

// variables de Zunto -> tokens de Pizdo
const MAPA_VARIABLES = {
  '--z-bg': 'var(--bg)',
  '--surface': 'var(--bg2)',
  '--z-border': 'var(--border)',
  '--z-text': 'var(--text)',
  '--muted': 'var(--text2)',
  '--primary': 'var(--accent)',
  '--primary-dark': 'var(--accent2)',
  '--ok': 'var(--green)',
  '--warn': 'var(--amber)',
  '--danger': 'var(--red)',
  '--sidebar': 'var(--bg2)',
  '--z-radius': 'var(--radius, 8px)',
  '--shadow': '0 1px 2px rgba(0, 0, 0, 0.25)'
};

function hexARgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}

function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/** Familia del color: el token de Pizdo que le corresponde. */
function familia(h) {
  if (h < 18 || h >= 340) return 'var(--red)';
  if (h < 65) return 'var(--amber)';
  if (h < 170) return 'var(--green)';
  if (h < 200) return 'var(--teal)';
  return 'var(--accent)';
}

function tipoPropiedad(prop) {
  if (/^(color|caret-color|fill|stroke|-webkit-text-fill-color|text-decoration-color)$/.test(prop)) return 'texto';
  if (/^(border|outline)/.test(prop)) return 'borde';
  if (/shadow/.test(prop)) return 'sombra';
  if (/^background/.test(prop)) return 'fondo';
  if (/^--/.test(prop)) return 'fondo';
  return 'otro';
}

function convertir(rgb, tipo) {
  const { s, l, h } = hsl(rgb);
  const neutro = s < 0.18 || (l > 0.96 && s < 0.6);
  const alfa = rgb.a < 1 ? rgb.a : null;

  if (tipo === 'texto') {
    if (l > 0.93 && neutro) return null; // texto blanco (botones): se queda
    if (neutro) return l < 0.35 ? 'var(--text)' : 'var(--text2)';
    return familia(h);
  }
  if (tipo === 'sombra') {
    if (neutro) return null;
    return `color-mix(in srgb, ${familia(h)} ${Math.round((alfa ?? 0.3) * 100)}%, transparent)`;
  }
  if (tipo === 'borde') {
    if (neutro) return l > 0.6 ? 'var(--border)' : 'var(--text3)';
    if (l > 0.8) return `color-mix(in srgb, ${familia(h)} 45%, var(--border))`;
    return familia(h);
  }
  // fondo (y lo demas)
  if (neutro) {
    if (l > 0.985) return 'var(--bg2)';
    if (l > 0.93) return 'color-mix(in srgb, var(--text) 4%, var(--bg2))';
    if (l > 0.6) return 'var(--bg3)';
    return null;
  }
  if (l > 0.86) return `color-mix(in srgb, ${familia(h)} 14%, transparent)`;
  if (alfa !== null) return `color-mix(in srgb, ${familia(h)} ${Math.round(alfa * 100)}%, transparent)`;
  return familia(h);
}

const COLOR = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)|\bwhite\b/g;

function rgbDe(token) {
  if (token === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (token.startsWith('#')) return hexARgb(token);
  const n = token.match(/[\d.]+/g).map(Number);
  return { r: n[0], g: n[1], b: n[2], a: n[3] ?? 1 };
}

function aplicarTema(css) {
  // 1. variables que chocan con Pizdo -> --z-*
  for (const v of RENOMBRAR) {
    const nuevo = `--z-${v.slice(2)}`;
    css = css.replace(new RegExp(`(^|[\\s;{(,])${v}(?=\\s*:)`, 'g'), `$1${nuevo}`);
    css = css.replace(new RegExp(`var\\(\\s*${v}\\s*([,)])`, 'g'), `var(${nuevo}$1`);
  }
  const raiz = postcss.parse(css);
  let cambios = 0;
  raiz.walkDecls((d) => {
    // las variables propias de Zunto toman los valores de Pizdo
    if (d.parent?.selector === '.zunto-ui' && MAPA_VARIABLES[d.prop]) {
      d.value = MAPA_VARIABLES[d.prop];
      cambios++;
      return;
    }
    const tipo = tipoPropiedad(d.prop);
    const nuevo = d.value.replace(COLOR, (token) => {
      const r = convertir(rgbDe(token), tipo);
      if (r) cambios++;
      return r ?? token;
    });
    d.value = nuevo;
  });
  // tipografia de Pizdo
  raiz.walkRules('.zunto-ui', (r) => {
    r.walkDecls('font-family', (d) => { d.value = 'var(--font)'; });
    // sin fondo propio: los paneles se ven sobre la pagina o el detalle de Pizdo
    r.walkDecls('background', (d) => { d.value = 'transparent'; });
  });
  raiz.walkRules((r) => {
    if (/\.zunto-ui (code|pre)|code-input|json-view/.test(r.selector)) r.walkDecls('font-family', (d) => { d.value = 'var(--mono)'; });
  });
  // controles nativos (casillas, selects, fechas) y botones sin color propio
  // con el tema de Pizdo
  const extra = `
/* --- ajustes al tema de Pizdo (scripts/tema-zunto.js) --- */
.zunto-ui { color-scheme: dark; }
[data-theme="light"] .zunto-ui { color-scheme: light; }
.zunto-ui button { color: inherit; }
.zunto-ui input[type="checkbox"], .zunto-ui input[type="radio"] { accent-color: var(--accent); }
`;
  return { css: raiz.toString() + extra, cambios };
}

module.exports = { aplicarTema, convertir, hexARgb };
