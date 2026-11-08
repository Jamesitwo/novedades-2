#!/usr/bin/env node
// Trae a Pizdo lo ultimo de la app de origen del motor de subida a Dropi:
// el motor (backend/motor-dropi/) y sus paneles (frontend/components/motor-dropi/),
// con los estilos pasados al tema de Pizdo.
//
//   node scripts/sincronizar-motor-dropi.js <carpeta de la app de origen>
//
// (la carpeta que tiene server/subidaAutomatica.js y panel/src/)
//
// Necesita (solo para correrlo): npm i --no-save typescript@5 postcss postcss-prefix-selector
// Los adaptadores (frontend/components/motor-dropi/api, auth, lib/router...) y
// el puente (backend/src/services/motor-dropi/) son de Pizdo: no se tocan.
//
// En Pizdo no puede aparecer el nombre de la app de origen: los textos de los
// paneles se limpian y, si queda alguno, el script falla y dice donde.
const fs = require('fs');
const path = require('path');

const ORIGEN = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(ORIGEN, 'server', 'subidaAutomatica.js'))) {
  console.log('Uso: node scripts/sincronizar-motor-dropi.js <carpeta de la app de origen>');
  process.exit(1);
}
const RAIZ = path.resolve(__dirname, '..');
const MOTOR_DST = path.join(RAIZ, 'backend', 'motor-dropi');
const DST = path.join(RAIZ, 'frontend', 'components', 'motor-dropi');
const CLASE = '.panel-dropi'; // contenedor de los paneles (ver PanelDropi.jsx)

// nombre de la app de origen, armado por partes (este archivo tampoco lo lleva escrito)
const NOMBRE = ['zun', 'to'].join('');
const RE_NOMBRE = new RegExp(NOMBRE, 'i');

/** Textos de los paneles sin el nombre de la app de origen. */
function limpiarTexto(s) {
  return s
    .replace(new RegExp(`"${NOMBRE}:`, 'gi'), '"dropi:') // eventos del navegador
    .replace(new RegExp(`\\b${NOMBRE}\\s*store\\b`, 'gi'), 'Pizdo')
    .replace(new RegExp(`\\b${NOMBRE}\\b`, 'gi'), 'el sistema');
}

// ---- 1. motor: mismos archivos, tal cual (sus textos se limpian al responder) ----
const MOTOR = ['agente', 'apiKeys', 'asignacion', 'auditoria', 'config', 'conversacion', 'credenciales', 'cuentas', 'direccionColombia', 'dropi', 'dropiNavegador', 'errores', 'estado', 'estadosEnvio', 'etiquetas', 'fechaEntrega', 'historial', 'interrapidisimo', 'llm', 'llmConfig', 'lucidbotContactos', 'lucidsales', 'oficinasInter', 'pedidosLucidBot', 'pedidosPorEnvio', 'productosDropi', 'programados', 'registroIntentos', 'repartoAutomatico', 'secretos', 'serviciosCuenta', 'servidor', 'sesionPanel', 'subidaAutomatica', 'validadorDireccion', 'variantes'];
for (const f of MOTOR) {
  fs.copyFileSync(path.join(ORIGEN, 'server', `${f}.js`), path.join(MOTOR_DST, `${f}.js`));
}
console.log(`motor: ${MOTOR.length} archivos copiados a backend/motor-dropi`);
for (const f of fs.readdirSync(MOTOR_DST)) {
  if (!f.endsWith('.js')) continue;
  const s = fs.readFileSync(path.join(MOTOR_DST, f), 'utf8');
  for (const m of s.matchAll(/from\s+"\.\/([^"]+)"/g)) {
    if (!fs.existsSync(path.join(MOTOR_DST, m[1]))) console.warn(`  !! ${f} importa ${m[1]}, que no esta copiado: agregalo a MOTOR`);
  }
}

// ---- 2. paneles (TSX -> JSX) ----
const ts = require('typescript');
const SRC = path.join(ORIGEN, 'panel', 'src');
const archivos = ['components/SubidaDropi.tsx', 'components/ReglasEnvio.tsx', 'components/SheetProductos.tsx', 'components/AnalisisPedido.tsx', 'components/IdPedidoLucidBot.tsx', 'components/IntentosSubida.tsx', 'components/SubirPedidoDropi.tsx', 'components/EntregaProgramada.tsx', 'components/ui.tsx', 'components/Toast.tsx', 'components/Confirmar.tsx', 'components/Modal.tsx', 'lib/format.ts'];
for (const rel of archivos) {
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
  let out = ts.transpileModule(src, {
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false, verbatimModuleSyntax: false },
    fileName: rel
  }).outputText;
  out = out.replace(/from "react-router-dom"/g, 'from "../lib/router"');
  // fetch directo a "/api/...": en Pizdo va al motor (/api/motor-dropi/...)
  if (/fetch\(path,/.test(out)) {
    out = out.replace(/fetch\(path,/g, 'fetch(urlBackend(path),');
    out = out.replace(/import \{([^}]*)\} from "\.\.\/api\/backend";/, (m, a) => `import {${a.trim().replace(/,?\s*$/, '')}, urlBackend } from "../api/backend";`);
  }
  out = limpiarTexto(out);
  const cliente = rel.startsWith('components/');
  const destino = path.join(DST, rel.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const cabecera = `${cliente ? "'use client';\n" : ''}// Panel del motor de subida a Dropi (${rel}), transpilado a JS.\n// Generado con scripts/sincronizar-motor-dropi.js: los cambios de fondo se hacen en el origen.\n`;
  fs.writeFileSync(destino, cabecera + out);
  console.log('panel:', path.relative(DST, destino));
}

// ---- 3. estilos, prefijados con la clase del contenedor y con el tema de Pizdo ----
const postcss = require('postcss');
const prefixer = require('postcss-prefix-selector');
let css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
// keyframes con nombre propio (no pisar las de Pizdo)
const nombres = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
for (const n of new Set(nombres)) {
  css = css.replace(new RegExp(`@keyframes\\s+${n}\\b`, 'g'), `@keyframes pd-${n}`);
  css = css.replace(new RegExp(`(animation(?:-name)?\\s*:[^;{}]*?)\\b${n}\\b`, 'g'), `$1pd-${n}`);
}
const out = postcss([prefixer({
  prefix: CLASE,
  transform(prefix, selector, prefixed) {
    if (/^(:root|html|body)$/.test(selector)) return prefix;
    if (/^(html|body)\s+/.test(selector)) return selector.replace(/^(html|body)\s+/, prefix + ' ');
    if (/^:root/.test(selector)) return selector.replace(/^:root/, prefix);
    return prefixed;
  }
})]).process(css, { from: undefined }).css;
const tema = require('./tema-motor-dropi').aplicarTema(out, CLASE);
console.log(`tema de Pizdo: ${tema.cambios} colores/variables adaptados`);
fs.writeFileSync(
  path.join(DST, 'panel-dropi.css'),
  `/* Estilos de los paneles del motor de subida a Dropi, prefijados con ${CLASE}\n   y con los colores del tema de Pizdo (scripts/tema-motor-dropi.js).\n   Generado con scripts/sincronizar-motor-dropi.js: no editar a mano. */\n` + limpiarTexto(tema.css)
);
console.log('keyframes renombradas:', [...new Set(nombres)].join(', '));

// ---- 4. verificacion: nada en el frontend puede llevar el nombre de origen ----
const conNombre = [];
(function revisar(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) revisar(abs);
    else if (RE_NOMBRE.test(e.name) || RE_NOMBRE.test(fs.readFileSync(abs, 'utf8'))) conNombre.push(path.relative(RAIZ, abs));
  }
})(DST);
if (conNombre.length) {
  console.error('\n!! Estos archivos todavia tienen el nombre de la app de origen:\n  ' + conNombre.join('\n  '));
  process.exit(1);
}
console.log('verificado: ningun archivo de los paneles tiene el nombre de la app de origen');
