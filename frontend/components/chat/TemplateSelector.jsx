'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function TemplateSelector({ onSelect, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/api/whatsapp/plantillas');
        setTemplates(data);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const CATEGORY_LABELS = {
    marketing: 'Marketing',
    utility: 'Utilidad',
    authentication: 'Autenticación'
  };

  return (
    <div className="template-selector-overlay" onClick={onClose}>
      <div className="template-selector" onClick={e => e.stopPropagation()}>
        <div className="template-selector-header">
          <span>Plantillas WhatsApp</span>
          <button onClick={onClose} className="template-close">✕</button>
        </div>
        {loading ? (
          <div className="template-loading">Cargando plantillas...</div>
        ) : templates.length === 0 ? (
          <div className="template-empty">
            No hay plantillas disponibles. Sincroniza desde el panel de administración.
          </div>
        ) : (
          <div className="template-list">
            {templates.map(t => (
              <button
                key={t.id}
                className="template-item"
                onClick={() => onSelect(t)}
              >
                <div className="template-item-name">{t.nombre}</div>
                <div className="template-item-meta">
                  <span className={`template-category ${t.categoria}`}>
                    {CATEGORY_LABELS[t.categoria] || t.categoria}
                  </span>
                  <span className="template-language">{t.idioma}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
