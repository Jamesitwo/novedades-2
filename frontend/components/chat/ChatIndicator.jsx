'use client';

export default function ChatIndicator({ record, tabla, onOpenChat }) {
  if (!record) return null;

  const hasConversacion = !!record.whatsappThreadId || !!record.conversacionLink;
  const chatActivo = record.chatActivo;
  const optOut = record.optOutWhatsapp;

  if (!hasConversacion) return null;

  let icon = '💤';
  let title = 'Chat inactivo (ventana 24h cerrada)';
  let style = { opacity: 0.3 };

  if (optOut) {
    icon = '🚫';
    title = 'Cliente optó por no recibir mensajes';
    style = { opacity: 0.6, cursor: 'not-allowed' };
  } else if (chatActivo) {
    icon = '💬';
    title = 'Chat activo (ventana 24h abierta)';
    style = { opacity: 1, cursor: 'pointer' };
  } else {
    style = { opacity: 0.3, cursor: 'pointer' };
  }

  return (
    <span
      title={title}
      style={{
        fontSize: 14,
        transition: 'opacity 0.2s',
        userSelect: 'none',
        ...style
      }}
      onClick={optOut ? undefined : onOpenChat}
    >
      {icon}
    </span>
  );
}
