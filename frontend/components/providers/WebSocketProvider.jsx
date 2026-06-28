'use client';
import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { on } from '@/lib/websocket';

export default function WebSocketProvider({ children }) {
  const addNotification = useNotificationStore(s => s.add);
  const notifications = useNotificationStore(s => s.notifications);
  const removeNotification = useNotificationStore(s => s.remove);

  useEffect(() => {
    const unsub = on('__notification__', (data) => {
      const tipo = data.tipo || 'info';
      const mensaje = data.mensaje || 'Notificación';
      addNotification(mensaje, tipo === 'nueva_asignacion' ? 'info' : tipo === 'transferencia' ? 'success' : 'info');
    });
    return () => unsub();
  }, [addNotification]);

  return (
    <>
      {children}
      {notifications.length > 0 && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: 'var(--text)',
              animation: 'slideIn 0.3s ease',
              cursor: 'pointer'
            }} onClick={() => removeNotification(n.id)}>
              <span style={{ fontSize: 18 }}>
                {n.type === 'success' ? '\u2705' : n.type === 'error' ? '\u274C' : '\uD83D\uDD14'}
              </span>
              <span style={{ flex: 1 }}>{n.message}</span>
              <button style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: 0 }}>\u2715</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
