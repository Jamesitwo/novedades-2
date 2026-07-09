function sinTildes(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const VIA_TYPES = [
  { regex: /^CALLE\b/i, canonical: 'Calle', abbr: 'Cll' },
  { regex: /^CLL?\b/i, canonical: 'Calle', abbr: 'Cll' },
  { regex: /^CARRERA\b/i, canonical: 'Carrera', abbr: 'Cra' },
  { regex: /^CRA\b/i, canonical: 'Carrera', abbr: 'Cra' },
  { regex: /^KR\b/i, canonical: 'Carrera', abbr: 'Cra' },
  { regex: /^(KRA|CARR)\b/i, canonical: 'Carrera', abbr: 'Cra' },
  { regex: /^AVENIDA\b/i, canonical: 'Avenida', abbr: 'Av' },
  { regex: /^AV\b/i, canonical: 'Avenida', abbr: 'Av' },
  { regex: /^(AVE|AVDA)\b/i, canonical: 'Avenida', abbr: 'Av' },
  { regex: /^DIAGONAL\b/i, canonical: 'Diagonal', abbr: 'Dg' },
  { regex: /^DG\b/i, canonical: 'Diagonal', abbr: 'Dg' },
  { regex: /^(DIAG|DGNAL)\b/i, canonical: 'Diagonal', abbr: 'Dg' },
  { regex: /^TRANSVERSAL\b/i, canonical: 'Transversal', abbr: 'Tv' },
  { regex: /^TV\b/i, canonical: 'Transversal', abbr: 'Tv' },
  { regex: /^(TRANS|TRAV)\b/i, canonical: 'Transversal', abbr: 'Tv' },
  { regex: /^CIRCULAR\b/i, canonical: 'Circular', abbr: 'Cir' },
  { regex: /^CIRC\b/i, canonical: 'Circular', abbr: 'Cir' },
  { regex: /^(CIR|CRC)\b/i, canonical: 'Circular', abbr: 'Cir' },
  { regex: /^MANZANA\b/i, canonical: 'Manzana', abbr: 'Mz' },
  { regex: /^MZ\b/i, canonical: 'Manzana', abbr: 'Mz' },
  { regex: /^AUTOPISTA\b/i, canonical: 'Autopista', abbr: 'Aut' },
  { regex: /^(AUTO|AUTP)\b/i, canonical: 'Autopista', abbr: 'Aut' },
  { regex: /^VIA\b/i, canonical: 'Vía', abbr: 'Vía' },
  { regex: /^PASAJE\b/i, canonical: 'Pasaje', abbr: 'Psj' },
  { regex: /^PASEO\b/i, canonical: 'Paseo', abbr: 'Ps' },
  { regex: /^BOULEVARD\b/i, canonical: 'Boulevard', abbr: 'Blvd' },
  { regex: /^BLVD\b/i, canonical: 'Boulevard', abbr: 'Blvd' },
];

const SUFIJOS_VIALES = /(SUR|NORTE|ESTE|OESTE|ORIENTE|OCCIDENTE)/i;

const COMPLEMENTOS = [
  { regex: /\bAPARTAMENTO\b/i, canonical: 'Apto' },
  { regex: /\bAPTO?\b/i, canonical: 'Apto' },
  { regex: /\bINTERIOR\b/i, canonical: 'Int' },
  { regex: /\bINT\b/i, canonical: 'Int' },
  { regex: /\bTORRE\b/i, canonical: 'Torre' },
  { regex: /\bTOR?\b/i, canonical: 'Torre' },
  { regex: /\bBLOQUE\b/i, canonical: 'Bloque' },
  { regex: /\bBLQ?\b/i, canonical: 'Bloque' },
  { regex: /\bCASA\b/i, canonical: 'Casa' },
  { regex: /\bLOCAL\b/i, canonical: 'Local' },
  { regex: /\bLCL?\b/i, canonical: 'Local' },
  { regex: /\bOFICINA\b/i, canonical: 'Oficina' },
  { regex: /\bOF\b/i, canonical: 'Oficina' },
  { regex: /\bPISO\b/i, canonical: 'Piso' },
  { regex: /\bCONJUNTO\b/i, canonical: 'Conjunto' },
  { regex: /\bCONJ?\b/i, canonical: 'Conjunto' },
  { regex: /\bEDIFICIO\b/i, canonical: 'Edificio' },
  { regex: /\bED\b/i, canonical: 'Edificio' },
  { regex: /\bURBANIZACION\b/i, canonical: 'Urb' },
  { regex: /\bURB\b/i, canonical: 'Urb' },
  { regex: /\bETAPA\b/i, canonical: 'Etapa' },
];

const NOMENCLATURA_PATTERN = /^(Calle|Cll|Carrera|Cra|Avenida|Av|Diagonal|Dg|Transversal|Tv|Circular|Cir|Manzana|Mz|Autopista|Vía|Pasaje|Paseo|Boulevard|Blvd)\.?\s*\d+\s*[A-Za-z]?\s*(#|No\.?|Nro\.?)?\s*\d+(-\d+)?(?:\s*(Sur|Norte|Este|Oeste|Oriente|Occidente))?\s*(#|No\.?|Nro\.?)?\s*\d+(-\d+)?(?:\s+(Apto|Int|Torre|Bloque|Casa|Local|Oficina|Piso|Conjunto|Edificio|Urb|Etapa)\.?\s*\d+[A-Za-z]?)?/i;

function detectarVia(direccion) {
  const trimmed = direccion.trim();
  for (const v of VIA_TYPES) {
    if (v.regex.test(trimmed)) {
      return { match: v.regex.exec(trimmed)[0], canonical: v.canonical, abbr: v.abbr };
    }
  }
  return null;
}

function extraerNumeros(texto) {
  const nums = texto.match(/\d+/g);
  return nums ? nums.map(Number) : [];
}

function detectarHashtag(direccion) {
  return /#/.test(direccion);
}

function detectarGuionesNumero(direccion) {
  const match = direccion.match(/\d+-\d+/g);
  return match || [];
}

function normalizar(direccion, via) {
  let d = direccion.trim();
  if (via) {
    d = d.replace(via.regex, via.canonical);
  }
  d = d.replace(/\s+/g, ' ');
  d = d.replace(/#\s*/g, ' # ');
  d = d.replace(/\s*#/g, ' #');
  d = d.replace(/\s*-\s*/g, '-');
  d = d.replace(/\s*#\s*-\s*/g, ' # ');
  d = d.replace(/#\s*(\d+)-/, '#$1-');
  d = d.replace(/\s+/g, ' ');

  COMPLEMENTOS.forEach(c => {
    const regex = new RegExp(`\\b${c.regex.source}`, 'i');
    d = d.replace(regex, c.canonical);
  });

  SUFIJOS_VIALES.lastIndex = 0;
  const sufijo = d.match(SUFIJOS_VIALES);
  if (sufijo) {
    const s = sufijo[0].charAt(0).toUpperCase() + sufijo[0].slice(1).toLowerCase();
    d = d.replace(sufijo[0], s);
  }

  d = d.trim();
  d = d.replace(/,\s*/g, ', ');

  return d;
}

function validarEstructuraColombiana(direccion) {
  const advertencias = [];
  const trimmed = direccion.trim().toUpperCase();
  const via = detectarVia(direccion);
  const nums = extraerNumeros(direccion);

  if (via && nums.length >= 2) {
    if (!detectarHashtag(direccion)) {
      const afterVia = trimmed.replace(via.regex, '').trim();
      if (extraerNumeros(afterVia).length >= 2) {
        advertencias.push({
          codigo: 'FALTA_SEPARADOR',
          mensaje: 'Use "#" para separar el número principal del secundario (ej: Cra 12 # 45-67)',
          sugerencia: null
        });
      }
    }
  }

  if (via && nums.length === 1) {
    const afterVia = trimmed.replace(via.regex, '').trim();
    if (!detectarHashtag(afterVia) && !detectarGuionesNumero(afterVia).length) {
      advertencias.push({
        codigo: 'FALTA_NUM_SECUNDARIO',
        mensaje: 'Considere agregar el número secundario después de "#" (ej: Cra 12 # 45-67)',
        sugerencia: null
      });
    }
  }

  if (/-\s*#/.test(trimmed) || /#\s*-/.test(trimmed)) {
    advertencias.push({
      codigo: 'FORMATO_MEZCLADO',
      mensaje: 'Formato mezclado: use "#" antes de los números secundarios y "-" solo para rangos (ej: Cra 12 # 45-67)',
      sugerencia: null
    });
  }

  const hashCount = (trimmed.match(/#/g) || []).length;
  if (hashCount > 2) {
    advertencias.push({
      codigo: 'EXCESO_HASH',
      mensaje: 'Demasiados "#" en la dirección. Use máximo 2.',
      sugerencia: null
    });
  }

  if (via) {
    const afterType = trimmed.replace(via.regex, '').trim();
    if (afterType && !/\d/.test(afterType.charAt(0)) && afterType.charAt(0) !== '.') {
      advertencias.push({
        codigo: 'NUM_ALEJADO_VIA',
        mensaje: 'El número debe ir inmediatamente después del tipo de vía',
        sugerencia: `${via.canonical} ${afterType}`
      });
    }
  }

  return advertencias;
}

function validarComplementos(direccion) {
  const advertencias = [];
  const upper = direccion.toUpperCase();

  const compsDetectados = [];
  COMPLEMENTOS.forEach(c => {
    if (c.regex.test(upper)) {
      compsDetectados.push(c);
    }
  });

  if (compsDetectados.length > 0) {
    let hasNum = false;
    compsDetectados.forEach(c => {
      const match = upper.match(new RegExp(c.regex.source + '\\s*\\d+', 'i'));
      if (match) hasNum = true;
    });
    if (!hasNum) {
      advertencias.push({
        codigo: 'COMPLEMENTO_SIN_NUM',
        mensaje: 'El complemento de dirección (Apto, Torre, etc.) debe incluir un número',
        sugerencia: null
      });
    }
  }

  return advertencias;
}

function tieneBarrioODetalle(direccion, via) {
  if (!via) return false;
  const trimmed = direccion.trim();
  const afterBase = trimmed.replace(via.regex, '').trim();
  const nums = extraerNumeros(afterBase);
  let resto = afterBase;
  nums.forEach(n => { resto = resto.replace(String(n), ''); });
  resto = resto.replace(/[#\-.,]/g, '').trim();
  return resto.length > 3;
}

function puntuarDireccion(direccion, via, errores, advertencias) {
  let score = 100;
  score -= errores.length * 30;
  score -= advertencias.length * 8;
  if (via) score += 5;
  const nums = extraerNumeros(direccion);
  if (nums.length >= 2 && detectarHashtag(direccion)) score += 10;
  if (tieneBarrioODetalle(direccion, via)) score += 5;
  return Math.max(0, Math.min(100, score));
}

function validate(direccion) {
  const errores = [];
  const advertencias = [];

  if (!direccion || direccion.trim().length < 3) {
    errores.push({ codigo: 'DIR_VACIA', mensaje: 'La dirección está vacía o es demasiado corta', sugerencia: null });
    return { valida: false, errores, advertencias, normalizada: '', viaDetectada: null };
  }

  const trimmed = direccion.trim();

  if (trimmed.length < 8) {
    advertencias.push({ codigo: 'DIR_CORTA', mensaje: 'La dirección es muy corta. Incluya tipo de vía, números y referencias.', sugerencia: null });
  }

  const via = detectarVia(direccion);

  if (!via) {
    errores.push({
      codigo: 'FALTA_VIA',
      mensaje: 'Debe incluir un tipo de vía (Calle, Carrera, Avenida, Diagonal, Transversal, etc.)',
      sugerencia: 'Ejemplos: Calle 80, Cra 43A, Av. Las Palmas, Dg 75B'
    });
  }

  const nums = extraerNumeros(direccion);
  if (nums.length === 0) {
    errores.push({
      codigo: 'FALTA_NUMERO',
      mensaje: 'Debe incluir al menos un número de dirección',
      sugerencia: null
    });
  }

  const advertenciasEstructura = validarEstructuraColombiana(direccion);
  advertenciasEstructura.forEach(a => advertencias.push(a));

  const advertenciasComplementos = validarComplementos(direccion);
  advertenciasComplementos.forEach(a => advertencias.push(a));

  const viaDetectada = via ? { nombre: via.canonical, abreviacion: via.abbr } : null;

  return {
    valida: errores.length === 0,
    errores,
    advertencias,
    normalizada: normalizar(direccion, via),
    viaDetectada,
    puntuacion: puntuarDireccion(direccion, viaDetectada, errores, advertencias)
  };
}

function validateFull(direccion, geoResult, pedidoCtx) {
  const local = validate(direccion);

  const sugerencias = [];

  if (local.viaDetectada) {
    const nums = extraerNumeros(direccion);
    const hasHash = detectarHashtag(direccion);
    if (nums.length >= 2 && !hasHash) {
      const sugerida = local.normalizada.replace(
        new RegExp(`(${local.viaDetectada.nombre}\\s+\\d+)\\s+(\\d+)`),
        '$1 # $2'
      );
      if (sugerida !== local.normalizada) {
        sugerencias.push({
          tipo: 'nomenclatura',
          direccion: sugerida,
          label: 'Con nomenclatura estándar (#)'
        });
      }
    }
  }

  let here = null;
  let puntuacionFinal = local.puntuacion;

  if (geoResult) {
    const { getBestResult, calculateGeoScore } = require('./here-geocoding.service');
    const best = getBestResult(geoResult);
    const geoScore = calculateGeoScore(best);

    here = {
      exito: geoResult.exito,
      resultType: best?.resultType || '',
      houseNumberType: best?.houseNumberType || '',
      geoLevel: geoScore.level,
      queryScore: best?.queryScore || 0,
      direccion: best?.direccion || '',
      ciudad: best?.ciudad || '',
      departamento: best?.departamento || '',
      distrito: best?.distrito || '',
      codigoPostal: best?.codigoPostal || '',
      lat: best?.lat || 0,
      lng: best?.lng || 0,
      error: geoResult.error || null
    };

    if (best && best.direccion) {
      const hereNorm = best.direccion.replace(/,\s*Colombia$/i, '').trim();
      const originalNorm = direccion.trim();
      const localNorm = local.normalizada;

      const isSameAsOriginal = hereNorm.toLowerCase() === originalNorm.toLowerCase();
      const isSameAsLocal = hereNorm.toLowerCase() === localNorm.toLowerCase();

      if (!isSameAsOriginal && !isSameAsLocal) {
        sugerencias.push({
          tipo: 'here_verified',
          direccion: hereNorm,
          label: `Verificada por HERE Maps (${Math.round(best.queryScore * 100)}%)`
        });
      }
    }

    puntuacionFinal = calcularPuntuacionFinal(local.puntuacion, geoScore.score);

    if (pedidoCtx && best) {
      const { ciudad: ciudadPedido, departamento: deptoPedido } = pedidoCtx;
      const ciudadGeo = sinTildes((best.ciudad || '').toLowerCase().trim());
      const deptoGeo = sinTildes((best.departamento || '').toLowerCase().trim());
      const ciudadPed = sinTildes((ciudadPedido || '').toLowerCase().trim());
      const deptoPed = sinTildes((deptoPedido || '').toLowerCase().trim());

      if (ciudadPed || deptoPed) {
        let matchCiudad = true;
        let matchDepto = true;

        if (ciudadGeo && ciudadPed) {
          const ciudadGeoCorta = ciudadGeo.split(',')[0].trim();
          const ciudadPedCorta = ciudadPed.split(',')[0].trim();
          matchCiudad = ciudadGeoCorta === ciudadPedCorta || ciudadGeoCorta.includes(ciudadPedCorta) || ciudadPedCorta.includes(ciudadGeoCorta);
        }

        if (deptoGeo && deptoPed) {
          const deptoGeoCorta = deptoGeo.split(',')[0].trim();
          const deptoPedCorta = deptoPed.split(',')[0].trim();
          matchDepto = deptoGeoCorta === deptoPedCorta || deptoGeoCorta.includes(deptoPedCorta) || deptoPedCorta.includes(deptoGeoCorta);
        }

        const partes = [];
        if (!matchCiudad && ciudadGeo && ciudadPed) {
          partes.push(`la ciudad geocodificada es "${best.ciudad}" pero el pedido indica "${ciudadPedido}"`);
        }
        if (!matchDepto && deptoGeo && deptoPed) {
          partes.push(`el departamento geocodificado es "${best.departamento}" pero el pedido indica "${deptoPedido}"`);
        }

        if (partes.length > 0) {
          local.advertencias.push({
            codigo: 'CIUDAD_NO_COINCIDE',
            mensaje: `La dirección no coincide con la ubicación del pedido: ${partes.join(' y ')}`,
            sugerencia: null
          });
          puntuacionFinal = Math.max(0, puntuacionFinal - 20);
        }
      }
    }
  }

  return {
    valida: local.valida,
    puntuacion: puntuacionFinal,
    direccionOriginal: direccion,
    direccionNormalizada: local.normalizada,
    viaDetectada: local.viaDetectada,
    errores: local.errores,
    advertencias: local.advertencias,
    sugerencias,
    here
  };
}

function calcularPuntuacionFinal(scoreLocal, scoreGeo) {
  const localWeight = 0.50;
  const geoWeight = 0.50;

  const localPart = scoreLocal * localWeight;
  const geoPart = (scoreGeo / 50) * 100 * geoWeight;

  return Math.max(0, Math.min(100, Math.round(localPart + geoPart)));
}

module.exports = {
  validate,
  validateFull,
  normalizar,
  detectarVia,
  extraerNumeros,
  VIA_TYPES,
  COMPLEMENTOS
};
