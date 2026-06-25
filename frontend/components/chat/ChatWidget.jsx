'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import MessageBubble from './MessageBubble';
import TemplateSelector from './TemplateSelector';

export default function ChatWidget({ tabla, registroId, onClose }) {
  const [conversacion, setConversacion] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [texto, setTexto] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError] = useState(null);
  const [noLeidos, setNoLeidos] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const fetchConversation = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/whatsapp/${tabla}/${registroId}/mensajes`);
      setConversacion(data);
      setMensajes(data.mensajes || []);
      setNoLeidos(data.noLeidos || 0);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar conversación');
    } finally {
      setLoading(false);
    }
  }, [tabla, registroId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/whatsapp/${tabla}/${registroId}/mensajes`);
        if (JSON.stringify(data.mensajes) !== JSON.stringify(mensajes)) {
          setMensajes(data.mensajes || []);
          setNoLeidos(data.noLeidos || 0);
          setConversacion(prev => ({ ...prev, ...data }));
        }
      } catch {}
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [tabla, registroId, mensajes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const markAsRead = useCallback(async () => {
    if (noLeidos > 0) {
      try {
        await api.patch('/api/whatsapp/leer', { tabla, registroId });
        setNoLeidos(0);
      } catch {}
    }
  }, [tabla, registroId, noLeidos]);

  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!texto.trim() || sending) return;

    const msgTexto = texto.trim();
    setTexto('');
    setSending(true);
    setError(null);

    const tempMsg = {
      id: 'temp-' + Date.now(),
      direccion: 'saliente',
      tipo: 'texto',
      contenido: msgTexto,
      estado: 'enviando',
      createdAt: new Date().toISOString(),
      usuario: conversacion?.usuario
    };
    setMensajes(prev => [...prev, tempMsg]);

    try {
      const { data } = await api.post('/api/whatsapp/enviar', {
        tabla,
        registroId,
        tipo: 'texto',
        contenido: msgTexto
      });

      setMensajes(prev => prev.map(m =>
        m.id === tempMsg.id ? data.mensaje : m
      ));

      setConversacion(prev => ({
        ...prev,
        record: { ...prev.record, chatActivo: data.ventanaActiva }
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar mensaje');
      setMensajes(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (template) => {
    setShowTemplates(false);
    setSending(true);
    setError(null);

    try {
      const { data } = await api.post('/api/whatsapp/enviar', {
        tabla,
        registroId,
        tipo: 'plantilla',
        plantillaNombre: template.nombre
      });

      setMensajes(prev => [...prev, data.mensaje]);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar plantilla');
    } finally {
      setSending(false);
    }
  };

  const ventanaActiva = conversacion?.ventanaActiva;
  const optOut = conversacion?.record?.optOutWhatsapp;
  const tiempoRestante = conversacion?.record?.tiempoRestante;

  function formatTimeRemaining(ms) {
    if (!ms && ms !== 0) return null;
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) {
    return (
      <div className="chat-widget" onClick={e => e.stopPropagation()}>
        <div className="chat-header">
          <div className="chat-header-title">WhatsApp</div>
          {onClose && <button onClick={onClose} className="chat-close">✕</button>}
        </div>
        <div className="chat-loading">Cargando conversación...</div>
      </div>
    );
  }

  return (
    <div className="chat-widget" onClick={e => e.stopPropagation()}>
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-title">WhatsApp</div>
          {ventanaActiva && (
            <span className="chat-window-badge active">
              Ventana activa {tiempoRestante ? formatTimeRemaining(tiempoRestante) : ''}
            </span>
          )}
          {!ventanaActiva && conversacion?.mensajes?.length > 0 && (
            <span className="chat-window-badge inactive">Ventana cerrada</span>
          )}
        </div>
        {onClose && <button onClick={onClose} className="chat-close">✕</button>}
      </div>

      {optOut && (
        <div className="chat-optout-banner">
          El cliente optó por no recibir mensajes
        </div>
      )}

      <div className="chat-messages">
        {mensajes.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <div className="chat-empty-text">
              {ventanaActiva
                ? 'Escribe un mensaje para iniciar la conversación'
                : 'La ventana de 24h está cerrada. Usa una plantilla para contactar al cliente.'}
            </div>
          </div>
        ) : (
          mensajes.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          {error}
          <button onClick={() => setError(null)} className="chat-error-close">✕</button>
        </div>
      )}

      {!optOut && (
        <form className="chat-input-area" onSubmit={handleSend}>
          {ventanaActiva ? (
            <>
              <input
                ref={inputRef}
                type="text"
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="chat-input"
                disabled={sending}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!texto.trim() || sending}
              >
                {sending ? '...' : '▶'}
              </button>
              <button
                type="button"
                className="chat-template-btn"
                onClick={() => setShowTemplates(!showTemplates)}
                title="Usar plantilla"
              >
                📋
              </button>
            </>
          ) : (
            <button
              type="button"
              className="chat-template-only-btn"
              onClick={() => setShowTemplates(true)}
              disabled={sending}
            >
              📋 Enviar plantilla
            </button>
          )}
        </form>
      )}

      {showTemplates && (
        <TemplateSelector
          onSelect={handleSendTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
