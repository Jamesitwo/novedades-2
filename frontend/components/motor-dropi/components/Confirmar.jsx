'use client';
// Panel del motor de subida a Dropi (components/Confirmar.tsx), transpilado a JS.
// Generado con scripts/sincronizar-motor-dropi.js: los cambios de fondo se hacen en el origen.
// Confirmaciones bonitas en lugar del window.confirm del navegador.
//
//   const confirmar = useConfirmar();
//   if (!(await confirmar({ titulo: "¿Borrar?", mensaje: "No se puede deshacer", peligro: true }))) return;
//
// Devuelve una promesa que se resuelve en true (Confirmar) o false (Cancelar,
// Escape o clic fuera).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
const Ctx = createContext(null);
export function ConfirmarProvider({ children }) {
    const [abierto, setAbierto] = useState(null);
    const resolver = useRef(null);
    const boton = useRef(null);
    const pedir = useCallback((o) => new Promise((res) => {
        resolver.current?.(false);
        resolver.current = res;
        setAbierto(o);
    }), []);
    const cerrar = useCallback((v) => {
        resolver.current?.(v);
        resolver.current = null;
        setAbierto(null);
    }, []);
    useEffect(() => {
        if (!abierto)
            return;
        boton.current?.focus();
        const tecla = (e) => {
            if (e.key === "Escape")
                cerrar(false);
        };
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [abierto, cerrar]);
    return (<Ctx.Provider value={pedir}>
      {children}
      {abierto ? (<div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && cerrar(false)}>
          <div className={`modal confirmar${abierto.peligro ? " peligro" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo">
            <div className="confirmar-icono" aria-hidden="true">
              {abierto.icono ?? (abierto.peligro ? "!" : "?")}
            </div>
            <h3 id="confirmar-titulo">{abierto.titulo}</h3>
            {abierto.mensaje ? <div className="confirmar-mensaje">{abierto.mensaje}</div> : null}
            <div className="confirmar-botones">
              <button type="button" className="btn ghost" onClick={() => cerrar(false)}>
                {abierto.cancelar ?? "Cancelar"}
              </button>
              <button ref={boton} type="button" className={`btn ${abierto.peligro ? "danger-solido" : "primary"}`} onClick={() => cerrar(true)}>
                {abierto.confirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>) : null}
    </Ctx.Provider>);
}
/** Pide confirmacion con un modal. Sin provider cae al confirm del navegador. */
export function useConfirmar() {
    const ctx = useContext(Ctx);
    return ctx ?? (async (o) => window.confirm(typeof o.mensaje === "string" ? `${o.titulo}\n\n${o.mensaje}` : o.titulo));
}
