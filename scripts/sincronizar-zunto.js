#!/usr/bin/env node
// Trae a Pizdo lo ultimo de ZuntoStore: el motor (backend/zunto/) y los
// paneles de subida a Dropi (frontend/components/zunto/), con sus estilos.
//
//   node scripts/sincronizar-zunto.js <ruta a ZuntoStore>
//
// Necesita (solo para correrlo): npm i --no-save typescript@5 postcss postcss-prefix-selector
// Los adaptadores (frontend/components/zunto/api, auth, lib/router...) y el
// puente (backend/src/services/zunto/) son de Pizdo: este script no los toca.
const fs = require('fs');
const path = require('path');

const ZUNTO = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(ZUNTO, 'server', 'subidaAutomatica.js'))) {
  console.log('Uso: node scripts/sincronizar-zunto.js <ruta a ZuntoStore>');
  process.exit(1);
}
const RAIZ = path.resolve(__dirname, '..');

// ---- 1. motor (backend/zunto): mismos archivos, tal cual ----
const MOTOR = ['agente', 'apiKeys', 'asignacion', 'auditoria', 'config', 'conversacion', 'credenciales', 'cuentas', 'direccionColombia', 'dropi', 'dropiNavegador', 'errores', 'estado', 'estadosEnvio', 'etiquetas', 'fechaEntrega', 'historial', 'interrapidisimo', 'llm', 'llmConfig', 'lucidbotContactos', 'lucidsales', 'oficinasInter', 'pedidosLucidBot', 'pedidosPorEnvio', 'productosDropi', 'programados', 'registroIntentos', 'repartoAutomatico', 'secretos', 'serviciosCuenta', 'servidor', 'sesionPanel', 'subidaAutomatica', 'validadorDireccion', 'variantes'];
for (const f of MOTOR) {
  fs.copyFileSync(path.join(ZUNTO, 'server', `${f}.js`), path.join(RAIZ, 'backend', 'zunto', `${f}.js`));
}
console.log(`motor: ${MOTOR.length} archivos copiados a backend/zunto`);
for (const f of fs.readdirSync(path.join(RAIZ, 'backend', 'zunto'))) {
  const s = fs.readFileSync(path.join(RAIZ, 'backend', 'zunto', f), 'utf8');
  for (const m of s.matchAll(/from\s+"\.\/([^"]+)"/g)) {
    if (!fs.existsSync(path.join(RAIZ, 'backend', 'zunto', m[1]))) console.warn(`  !! ${f} importa ${m[1]}, que no esta copiado: agregalo a MOTOR`);
  }
}

// ---- 2. paneles (TSX -> JSX) ----
const ts = require('typescript');
const SRC = path.join(ZUNTO, 'panel', 'src');
const DST = path.join(RAIZ, 'frontend', 'components', 'zunto');
const archivos = ['components/SubidaDropi.tsx','components/ReglasEnvio.tsx','components/SheetProductos.tsx','components/AnalisisPedido.tsx','components/IdPedidoLucidBot.tsx','components/IntentosSubida.tsx','components/SubirPedidoDropi.tsx','components/EntregaProgramada.tsx','components/ui.tsx','components/Toast.tsx','components/Confirmar.tsx','components/Modal.tsx','lib/format.ts'];
for (const rel of archivos) {
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
  let out = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false, verbatimModuleSyntax: false } , fileName: rel}).outputText;
  out = out.replace(/from "react-router-dom"/g, 'from "../lib/router"');
  // fetch directo a "/api/...": en Pizdo va al motor (/api/zunto/...)
  if (/fetch\(path,/.test(out)) {
    out = out.replace(/fetch\(path,/g, 'fetch(urlBackend(path),');
    out = out.replace(/import \{([^}]*)\} from "\.\.\/api\/backend";/, (m, a) => `import {${a.trim().replace(/,?\s*$/, '')}, urlBackend } from "../api/backend";`);
  }
  const cliente = rel.startsWith('components/');
  const destino = path.join(DST, rel.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const cabecera = `${cliente ? "'use client';\n" : ''}// Copiado de ZuntoStore/panel/src/${rel} (transpilado a JS para Pizdo).\n// Los cambios de fondo se hacen en Zunto y se vuelven a copiar (scripts/sincronizar-zunto.js).\n`;
  fs.writeFileSync(destino, cabecera + out);
  console.log('panel:', path.relative(DST, destino));
}

// ---- 3. estilos, prefijados con .zunto-ui ----
const postcss = require('postcss');
const prefixer = require('postcss-prefix-selector');
let css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
// keyframes con nombre propio (no pisar las de Pizdo)
const nombres = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
for (const n of new Set(nombres)) {
  css = css.replace(new RegExp(`@keyframes\\s+${n}\\b`, 'g'), `@keyframes zunto-${n}`);
  css = css.replace(new RegExp(`(animation(?:-name)?\\s*:[^;{}]*?)\\b${n}\\b`, 'g'), `$1zunto-${n}`);
}
const out = postcss([prefixer({
  prefix: '.zunto-ui',
  transform(prefix, selector, prefixed) {
    if (/^(:root|html|body)$/.test(selector)) return prefix;
    if (/^(html|body)\s+/.test(selector)) return selector.replace(/^(html|body)\s+/, prefix + ' ');
    if (/^:root/.test(selector)) return selector.replace(/^:root/, prefix);
    return prefixed;
  },
})]).process(css, { from: undefined }).css;
const tema = require('./tema-zunto').aplicarTema(out);
console.log(`tema de Pizdo: ${tema.cambios} colores/variables adaptados`);
fs.writeFileSync(path.join(DST, 'zunto.css'), '/* Estilos del panel de ZuntoStore (panel/src/styles.css), prefijados con .zunto-ui\n   para no chocar con los de Pizdo, y con los colores del tema de Pizdo (scripts/tema-zunto.js). Generado con scripts/sincronizar-zunto.js: no editar a mano. */\n' + tema.css);
console.log('keyframes renombradas:', [...new Set(nombres)].join(', '));
