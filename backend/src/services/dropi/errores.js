// CONVERTIDO desde ZuntoStore (errores.js) ESM -> CommonJS.
// Revision manual pendiente:
//   - (ninguna)

// Error con codigo HTTP: el servidor lo captura y responde {ok:false, msg}.
class ErrorApi extends Error {
  constructor(status, msg, detalle) {
    super(msg);
    this.name = "ErrorApi";
    this.status = status;
    this.detalle = detalle;
  }
}

const validacion = (msg) => new ErrorApi(400, msg);
const noEncontrado = (msg) => new ErrorApi(404, msg);
const noDisponible = (msg) => new ErrorApi(503, msg);

module.exports = { ErrorApi, validacion, noEncontrado, noDisponible };
