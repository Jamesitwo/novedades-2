'use client';
// Envoltorio de los paneles de Zunto dentro de Pizdo: avisos, confirmaciones
// y los estilos de Zunto (prefijados con .zunto-ui para no chocar con Pizdo).
import './zunto.css';
import { ToastProvider } from './components/Toast';
import { ConfirmarProvider } from './components/Confirmar';

export default function ZuntoUI({ children, className = '' }) {
  return (
    <div className={`zunto-ui ${className}`.trim()}>
      <ToastProvider>
        <ConfirmarProvider>{children}</ConfirmarProvider>
      </ToastProvider>
    </div>
  );
}
