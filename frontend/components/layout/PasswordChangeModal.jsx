'use client';

import { useState } from 'react';
import api from '../../lib/api';

export default function PasswordChangeModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 6) {
      setError('La nueva contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.put('/api/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contrasena');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        background: 'var(--bg2)', borderRadius: 14, width: 'min(400px, 92vw)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 16 }}>
          Cambiar contrasena
        </div>
        {success ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--green)', fontWeight: 500 }}>
            Contrasena actualizada correctamente
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12
              }}>
                {error}
              </div>
            )}
            {['currentPassword', 'newPassword', 'confirmPassword'].map((field, i) => (
              <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                {field === 'currentPassword' ? 'Contrasena actual' : field === 'newPassword' ? 'Nueva contrasena' : 'Confirmar nueva contrasena'}
                <input
                  type="password"
                  value={form[field]}
                  onChange={e => update(field, e.target.value)}
                  required
                  autoFocus={i === 0}
                  placeholder={field === 'newPassword' ? 'Minimo 6 caracteres' : ''}
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none'
                  }}
                />
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Cambiando...' : 'Cambiar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
