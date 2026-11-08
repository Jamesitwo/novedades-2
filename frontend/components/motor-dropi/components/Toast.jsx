'use client';
// Panel del motor de subida a Dropi (components/Toast.tsx), transpilado a JS.
// Generado con scripts/sincronizar-motor-dropi.js: los cambios de fondo se hacen en el origen.
import { createContext, useCallback, useContext, useRef, useState, } from "react";
const ToastContext = createContext(null);
const ICON = { success: "✓", error: "✕", info: "ℹ" };
export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const seq = useRef(0);
    const push = useCallback((kind, msg) => {
        const id = ++seq.current;
        setItems((arr) => [...arr, { id, kind, msg }]);
        window.setTimeout(() => {
            setItems((arr) => arr.filter((t) => t.id !== id));
        }, kind === "error" ? 6000 : 3500);
    }, []);
    const api = useRef({
        success: (m) => push("success", m),
        error: (m) => push("error", m),
        info: (m) => push("info", m),
    }).current;
    return (<ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (<div key={t.id} className={`toast ${t.kind}`} onClick={() => setItems((a) => a.filter((x) => x.id !== t.id))}>
            <span className="toast-icon">{ICON[t.kind]}</span>
            <span>{t.msg}</span>
          </div>))}
      </div>
    </ToastContext.Provider>);
}
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx)
        throw new Error("useToast debe usarse dentro de ToastProvider");
    return ctx;
}
