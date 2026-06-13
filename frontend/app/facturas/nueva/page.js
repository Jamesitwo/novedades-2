'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [cliente, setCliente] = useState({ nombre: '', documento: '', telefono: '', direccion: '' });
  const [items, setItems] = useState([{ descripcion: '', cantidad: 1, precioUnitario: 0 }]);
  const [iva, setIva] = useState(0);
  const [notas, setNotas] = useState('');

  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000); };
  const formatNum = (n) => Number(n).toLocaleString('es-CO');

  const addItem = () => setItems([...items, { descripcion: '', cantidad: 1, precioUnitario: 0 }]);

  const removeItem = (i) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  };

  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const subtotal = items.reduce((s, i) => s + ((parseFloat(i.precioUnitario) || 0) * (parseInt(i.cantidad) || 1)), 0);
  const total = subtotal + (parseFloat(iva) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cliente.nombre) { showToast('Nombre del cliente requerido', 'error'); return; }
    if (items.some(i => !i.descripcion)) { showToast('Todos los items necesitan descripción', 'error'); return; }

    setLoading(true);
    try {
      await api.post('/api/facturas', {
        clienteNombre: cliente.nombre,
        clienteDocumento: cliente.documento || null,
        clienteTelefono: cliente.telefono || null,
        clienteDireccion: cliente.direccion || null,
        iva: parseFloat(iva) || 0,
        notas: notas || null,
        items: items.map(i => ({ ...i, cantidad: parseInt(i.cantidad) || 1, precioUnitario: parseFloat(i.precioUnitario) || 0 }))
      });
      router.push('/facturas');
    } catch (e) {
      showToast('Error al crear factura', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', padding: '12px 20px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500 }}>{toast.message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Nueva Factura</h2>
        <button onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="table-card" style={{ marginBottom: 16 }}>
          <div className="table-header"><span className="table-header-title">Datos del cliente</span></div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group span2">
              <label>Nombre / Razón social</label>
              <input value={cliente.nombre} onChange={e => setCliente({ ...cliente, nombre: e.target.value })} required placeholder="Nombre del cliente" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>NIT / CC</label>
              <input value={cliente.documento} onChange={e => setCliente({ ...cliente, documento: e.target.value })} placeholder="Opcional" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={cliente.telefono} onChange={e => setCliente({ ...cliente, telefono: e.target.value })} placeholder="Opcional" style={{ width: '100%' }} />
            </div>
            <div className="form-group span2">
              <label>Dirección</label>
              <input value={cliente.direccion} onChange={e => setCliente({ ...cliente, direccion: e.target.value })} placeholder="Opcional" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        <div className="table-card" style={{ marginBottom: 16 }}>
          <div className="table-header">
            <span className="table-header-title">Items</span>
            <button type="button" onClick={addItem} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>+ Item</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ width: 80, textAlign: 'center' }}>Cant</th>
                <th style={{ width: 120, textAlign: 'right' }}>Precio Unit</th>
                <th style={{ width: 120, textAlign: 'right' }}>Total</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={item.descripcion}
                      onChange={e => updateItem(i, 'descripcion', e.target.value)}
                      required
                      placeholder="Descripción del item"
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="1"
                      value={item.cantidad}
                      onChange={e => updateItem(i, 'cantidad', e.target.value)}
                      style={{ width: '100%', textAlign: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="0"
                      value={item.precioUnitario}
                      onChange={e => updateItem(i, 'precioUnitario', e.target.value)}
                      style={{ width: '100%', textAlign: 'right', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                    />
                  </td>
                  <td className="td-mono" style={{ fontWeight: 600, textAlign: 'right' }}>
                    ${formatNum((parseFloat(item.precioUnitario) || 0) * (parseInt(item.cantidad) || 1))}
                  </td>
                  <td>
                    <button type="button" onClick={() => removeItem(i)} className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--red)' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="table-card">
            <div className="table-header"><span className="table-header-title">Totales</span></div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>Subtotal</span>
                <span className="td-mono">${formatNum(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, alignItems: 'center' }}>
                <span style={{ color: 'var(--text2)' }}>IVA</span>
                <input type="number" min="0" value={iva} onChange={e => setIva(e.target.value)}
                  style={{ width: 120, textAlign: 'right', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)' }} />
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 15 }}>
                <span>TOTAL</span>
                <span className="td-mono" style={{ color: 'var(--accent2)' }}>${formatNum(total)}</span>
              </div>
            </div>
          </div>
          <div className="table-card">
            <div className="table-header"><span className="table-header-title">Notas</span></div>
            <div style={{ padding: 12 }}>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas adicionales..."
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', minHeight: 100, resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            {loading ? 'Creando...' : 'Crear Factura'}
          </button>
        </div>
      </form>
    </div>
  );
}
