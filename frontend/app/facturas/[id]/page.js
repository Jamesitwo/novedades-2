'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function FacturaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useAuthStore();
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000); };
  const formatMoney = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  useEffect(() => { fetchFactura(); }, [params.id]);

  const fetchFactura = async () => {
    try {
      const { data } = await api.get(`/api/facturas/${params.id}`);
      setFactura(data);
    } catch { showToast('Error al cargar', 'error'); }
    finally { setLoading(false); }
  };

  const handleEstado = async (estado) => {
    try {
      await api.patch(`/api/facturas/${params.id}/estado`, { estado });
      fetchFactura();
      showToast(estado === 'pagada' ? 'Factura marcada como pagada' : 'Factura cancelada');
    } catch { showToast('Error', 'error'); }
  };

  const downloadPdf = () => {
    window.open(`/api/facturas/${params.id}/pdf`, '_blank');
  };

  if (loading) return <div className="content"><div className="loading">Cargando...</div></div>;
  if (!factura) return <div className="content"><div className="loading">Factura no encontrada</div></div>;

  return (
    <div className="content" style={{ maxWidth: 800 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', padding: '12px 20px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500 }}>{toast.message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Factura N° {String(factura.numero).padStart(4, '0')}</h2>
          <span className="badge" style={{
            background: factura.estado === 'pagada' ? 'rgba(34,197,94,0.15)' : factura.estado === 'cancelada' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
            color: factura.estado === 'pagada' ? 'var(--green)' : factura.estado === 'cancelada' ? 'var(--red)' : 'var(--amber)',
            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, textTransform: 'capitalize'
          }}>{factura.estado}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {factura.estado === 'pendiente' && (
            <button onClick={() => handleEstado('pagada')} className="btn btn-success" style={{ padding: '8px 16px' }}>Marcar pagada</button>
          )}
          <button onClick={downloadPdf} className="btn btn-primary" style={{ padding: '8px 16px' }}>📥 Descargar PDF</button>
          <button onClick={() => router.push('/facturas')} className="btn btn-ghost">Volver</button>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: 16 }}>
        <div className="table-header"><span className="table-header-title">Datos del cliente</span></div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Nombre</div><div style={{ fontWeight: 500 }}>{factura.clienteNombre}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>NIT / CC</div><div className="td-mono">{factura.clienteDocumento || '—'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Teléfono</div><div className="td-mono">{factura.clienteTelefono || '—'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Dirección</div><div>{factura.clienteDireccion || '—'}</div></div>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: 16 }}>
        <div className="table-header"><span className="table-header-title">Items</span></div>
        <table>
          <thead><tr><th>Descripción</th><th style={{ textAlign: 'center', width: 80 }}>Cant</th><th style={{ textAlign: 'right', width: 120 }}>Precio Unit</th><th style={{ textAlign: 'right', width: 120 }}>Total</th></tr></thead>
          <tbody>
            {factura.items.map((item, i) => (
              <tr key={item.id}>
                <td>{item.descripcion}</td>
                <td className="td-mono" style={{ textAlign: 'center' }}>{item.cantidad}</td>
                <td className="td-mono" style={{ textAlign: 'right' }}>{formatMoney(item.precioUnitario)}</td>
                <td className="td-mono" style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card" style={{ marginBottom: 16 }}>
        <div className="table-header"><span className="table-header-title">Totales</span></div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span style={{ color: 'var(--text2)' }}>Subtotal</span><span className="td-mono">{formatMoney(factura.subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span style={{ color: 'var(--text2)' }}>IVA</span><span className="td-mono">{formatMoney(factura.iva)}</span></div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 16 }}><span>TOTAL</span><span className="td-mono" style={{ color: 'var(--accent2)' }}>{formatMoney(factura.total)}</span></div>
        </div>
      </div>

      {factura.notas && (
        <div className="table-card" style={{ marginBottom: 16 }}>
          <div className="table-header"><span className="table-header-title">Notas</span></div>
          <div style={{ padding: 12, fontSize: 13, color: 'var(--text2)' }}>{factura.notas}</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
        <span>Creada por: {factura.createdBy?.nombre}</span>
        <span>{new Date(factura.createdAt).toLocaleString('es-CO')}</span>
      </div>
    </div>
  );
}
