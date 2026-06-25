'use client';

export default function MessageBubble({ message }) {
  const isOutgoing = message.direccion === 'saliente';

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' ' +
        d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className={`chat-message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
      <div className="chat-bubble">
        {message.tipo === 'plantilla' && (
          <div className="chat-template-tag">📋 {message.plantillaNombre || 'Plantilla'}</div>
        )}
        {message.contenido && <div className="chat-text">{message.contenido}</div>}
        {message.tipo === 'image' && message.mediaUrl && (
          <img src={message.mediaUrl} alt="Imagen" className="chat-media" />
        )}
        {message.tipo === 'video' && message.mediaUrl && (
          <video src={message.mediaUrl} controls className="chat-media" />
        )}
        {message.tipo === 'document' && message.mediaUrl && (
          <div className="chat-document">📎 Documento</div>
        )}
      </div>
      <div className="chat-meta">
        <span className="chat-time">{formatTime(message.createdAt)}</span>
        {isOutgoing && (
          <span className={`chat-status ${message.estado}`}>
            {message.estado === 'enviando' && '⏳'}
            {message.estado === 'enviado' && '✓'}
            {message.estado === 'entregado' && '✓✓'}
            {message.estado === 'leido' && <span style={{ color: '#34b7f1' }}>✓✓</span>}
            {message.estado === 'fallido' && '⚠'}
          </span>
        )}
      </div>
    </div>
  );
}
