'use client';

// Subida automatica a Dropi (motor de ZuntoStore): encender/apagar, modo
// prueba, tiendas de Dropi, transportadoras y topes de envio, sesion de
// Dropi, IA que lee el chat, Lucid Bot y el registro de lo que hizo.
import { useAuthStore } from '@/store/authStore';
import ZuntoUI from '@/components/zunto/ZuntoUI';
import { SubidaDropi } from '@/components/zunto/components/SubidaDropi';

export default function SubidaDropiPage() {
  const { usuario } = useAuthStore();
  if (usuario && usuario.rol !== 'admin') {
    return (
      <div className="page-content" style={{ padding: 24 }}>
        Solo un administrador puede cambiar la subida a Dropi.
      </div>
    );
  }
  return (
    <div className="page-content" style={{ padding: 24, overflow: 'auto' }}>
      <ZuntoUI>
        <SubidaDropi />
      </ZuntoUI>
    </div>
  );
}
