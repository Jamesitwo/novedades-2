#!/usr/bin/env node
// Copia el estado de una instalacion anterior del motor de subida (su carpeta
// de datos) al motor de Pizdo, para una tienda de Pizdo. Se usa UNA vez al
// pasar a Pizdo, con la subida de la instalacion anterior ya APAGADA.
//
//   node scripts/importar-estado-motor.js <carpeta de datos> <slug de la tienda en Pizdo> [--perfil]
//
//   <carpeta>  la de la instalacion anterior donde estan subidaAutomatica.json, programados.json,
//              intentos.jsonl, config/llm.json... (en Railway: /data; en local:
//              la carpeta server). Para otra cuenta: /data/cuentas/<id>.
//   <slug>     tienda de Pizdo que recibe el estado (su slug).
//   --perfil   tambien copia la sesion de Dropi (perfil de Chrome, sin caches).
//
// Necesita DATABASE_URL apuntando a la base de Pizdo. Escribe en la tabla
// motor_archivos: al reiniciar Pizdo, el motor arranca con ese estado.
// Si la instalacion anterior cifraba las claves (CLAVE_MAESTRA), pon en Pizdo
// la misma clave en MOTOR_DROPI_CLAVE_MAESTRA para que el motor pueda leerlas.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { listar } = require('../src/services/motor-dropi/persistencia');

// mismos archivos que usa cada cuenta del motor (motor.mjs -> RUTAS)
const ARCHIVOS = [
  'historial.jsonl',
  'conversacion.jsonl',
  'subidaAutomatica.json',
  'envios.json',
  'intentos.jsonl',
  'programados.json',
  'etiquetas.json',
  'auditoria.jsonl',
  'lucidbot-pedidos.json',
  'config/lucidbot-contactos.json',
  'config/llm.json',
  'config/mapas.json',
  'config/productosDropi.json'
];
// en la instalacion anterior (cuenta 1) el perfil de Chrome se llama .dropi-perfil o dropi-profile
const PERFILES = ['dropi-profile', '.dropi-perfil'];

async function main() {
  const [origen, slug] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const conPerfil = process.argv.includes('--perfil');
  if (!origen || !slug) {
    console.log('Uso: node scripts/importar-estado-motor.js <carpeta de datos> <slug de la tienda> [--perfil]');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const tienda = await prisma.tienda.findUnique({ where: { slug } });
  if (!tienda) throw new Error(`No existe la tienda «${slug}» en Pizdo`);

  const entradas = [];
  for (const rel of ARCHIVOS) {
    const abs = path.join(origen, ...rel.split('/'));
    if (fs.existsSync(abs)) entradas.push({ destino: `${slug}/${rel}`, abs });
  }
  if (conPerfil) {
    const perfil = PERFILES.map((p) => path.join(origen, p)).find((p) => fs.existsSync(p));
    if (perfil) {
      for (const rel of listar(perfil)) entradas.push({ destino: `${slug}/dropi-profile/${rel}`, abs: path.join(perfil, ...rel.split('/')) });
    } else {
      console.warn('  (no se encontro perfil de Chrome de Dropi: habra que pegar la sesion desde el panel)');
    }
  }
  if (!entradas.length) throw new Error(`No hay archivos del motor de subida en ${origen}`);

  // la subida llega apagada: se enciende desde Pizdo cuando todo este revisado
  let subidaApagada = false;
  for (const e of entradas) {
    let buf = fs.readFileSync(e.abs);
    if (e.destino.endsWith('/subidaAutomatica.json')) {
      try {
        const c = JSON.parse(buf.toString('utf8'));
        if (c.automatico) subidaApagada = true;
        c.automatico = false;
        buf = Buffer.from(JSON.stringify(c, null, 2));
      } catch {
        /* se copia tal cual */
      }
    }
    if (buf.length > 8 * 1024 * 1024) {
      console.warn(`  se omite ${e.destino} (${Math.round(buf.length / 1048576)} MB)`);
      continue;
    }
    const hash = crypto.createHash('sha1').update(buf).digest('hex');
    await prisma.motorArchivo.upsert({
      where: { ruta: e.destino },
      update: { contenido: buf, hash, tamano: buf.length },
      create: { ruta: e.destino, contenido: buf, hash, tamano: buf.length }
    });
    console.log(`  ✓ ${e.destino} (${buf.length} bytes)`);
  }
  console.log(`\nListo: ${entradas.length} archivo(s) para la tienda «${tienda.nombre}».`);
  if (subidaApagada) console.log('La subida automatica venia ENCENDIDA en la instalacion anterior: aqui quedo apagada. Enciendela desde Pizdo > Subida a Dropi.');
  console.log('Reinicia Pizdo para que el motor tome el estado importado.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
