'use client';
// Envoltorio de los paneles del motor de subida a Dropi dentro de Pizdo:
// avisos, confirmaciones y sus estilos (prefijados con .panel-dropi para no
// chocar con los de Pizdo, y con los colores del tema de Pizdo).
import './panel-dropi.css';
import { ToastProvider } from './components/Toast';
import { ConfirmarProvider } from './components/Confirmar';

export default function PanelDropi({ children, className = '' }) {
  return (
    <div className={`panel-dropi ${className}`.trim()}>
      <ToastProvider>
        <ConfirmarProvider>{children}</ConfirmarProvider>
      </ToastProvider>
    </div>
  );
}
