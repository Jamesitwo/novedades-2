'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function TiendaAdminPage() {
  const router = useRouter();
  const { usuario, isAuthenticated, initialized, initialize } = useAuthStore();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: '', precioVenta: 0, precioProveedor: 0,
    imagen: '', imagenes: '', linkCompra: '', stock: 0,
    ofertaActiva: false, ofertaPrecio: 0, ofertaHasta: '',
    ventasSimuladas: 0, activo: true, destacado: false
  });

  useEffect(() => { initialize(); }, []);
  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (usuario?.rol !== 'admin') { router.push('/dashboard'); return; }
  }, [initialized, isAuthenticated, usuario, router]);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProductos = async () => {
    try {
      const { data } = await api.get('/api/tienda?limit=200');
      setProductos(data.productos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAuthenticated && usuario?.rol === 'admin') fetchProductos(); }, [isAuthenticated, usuario]);

  const openModal = (p = null) => {
    if (p) {
      setEditando(p);
      setForm({
        nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria,
        precioVenta: p.precioVenta, precioProveedor: p.precioProveedor || 0,
        imagen: p.imagen || '', imagenes: Array.isArray(p.imagenes) ? p.imagenes.join('\n') : '',
        linkCompra: p.linkCompra || '', stock: p.stock,
        ofertaActiva: p.ofertaActiva, ofertaPrecio: p.ofertaPrecio || 0,
        ofertaHasta: p.ofertaHasta ? new Date(p.ofertaHasta).toISOString().slice(0, 16) : '',
        ventasSimuladas: p.ventasSimuladas, activo: p.activo, destacado: p.destacado
      });
    } else {
      setEditando(null);
      setForm({
        nombre: '', descripcion: '', categoria: '', precioVenta: 0, precioProveedor: 0,
        imagen: '', imagenes: '', linkCompra: '', stock: 0,
        ofertaActiva: false, ofertaPrecio: 0, ofertaHasta: '',
        ventasSimuladas: 0, activo: true, destacado: false
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.categoria || !form.precioVenta) { showToast('Llena los campos requeridos', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        imagenes: form.imagenes ? form.imagenes.split('\n').map(s => s.trim()).filter(Boolean) : [],
        ofertaHasta: form.ofertaHasta || null
      };
      if (editando) {
        await api.put(`/api/tienda/${editando.id}`, payload);
        showToast('Producto actualizado');
      } else {
        await api.post('/api/tienda', payload);
        showToast('Producto creado');
      }
      setShowModal(false);
      fetchProductos();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (id, current) => {
    try {
      await api.patch(`/api/tienda/${id}/toggle`);
      fetchProductos();
    } catch { showToast('Error', 'error'); }
  };

  const handleToggleDestacado = async (id, current) => {
    try {
      await api.put(`/api/tienda/${id}`, { destacado: !current });
      fetchProductos();
    } catch { showToast('Error', 'error'); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      await api.delete(`/api/tienda/${p.id}`);
      showToast('Producto eliminado');
      fetchProductos();
    } catch { showToast('Error al eliminar', 'error'); }
  };

  const formatPrice = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  if (!initialized || !isAuthenticated || usuario?.rol !== 'admin') return null;

  return (
    <div className="content">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Administrar Pizdo</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            <a href="/tienda" target="_blank" style={{ color: 'var(--accent)' }}>Ver Pizdo publica</a>
          </div>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">+ Nuevo producto</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Cargando...</div>
      ) : (
        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">{productos.length} productos</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: 60 }}>Img</th>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Precio</th>
                <th>Oferta</th>
                <th>Stock</th>
                <th style={{ width: 70 }}>Destacado</th>
                <th style={{ width: 60 }}>Activo</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.4 }}>
                  <td>
                    {p.imagen ? (
                      <img src={p.imagen} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, background: 'var(--bg3)' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, background: 'var(--bg3)', borderRadius: 6 }} />
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.nombre}</div>
                    {p.descripcion && <div style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</div>}
                  </td>
                  <td><span style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 10px', borderRadius: 10 }}>{p.categoria}</span></td>
                  <td className="td-mono" style={{ fontSize: 12 }}>
                    {p.ofertaActiva && p.ofertaPrecio ? (
                      <>
                        <span style={{ color: 'var(--red)', fontWeight: 600 }}>{formatPrice(p.ofertaPrecio)}</span>
                        <br />
                        <span style={{ textDecoration: 'line-through', color: 'var(--text3)', fontSize: 10 }}>{formatPrice(p.precioVenta)}</span>
                      </>
                    ) : formatPrice(p.precioVenta)}
                  </td>
                  <td>
                    {p.ofertaActiva ? (
                      <span style={{ color: 'var(--red)', fontSize: 11, fontWeight: 600 }}>
                        {p.ofertaHasta ? new Date(p.ofertaHasta).toLocaleDateString('es-CO') : 'Activa'}
                      </span>
                    ) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>}
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                      color: p.stock <= 5 ? 'var(--red)' : p.stock === 0 ? 'var(--text3)' : 'var(--text)'
                    }}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleToggleDestacado(p.id, p.destacado)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                      color: p.destacado ? 'var(--amber)' : 'var(--text3)'
                    }}>{p.destacado ? '★' : '☆'}</button>
                  </td>
                  <td>
                    <button onClick={() => handleToggleActivo(p.id, p.activo)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      color: p.activo ? 'var(--green)' : 'var(--red)'
                    }}>{p.activo ? 'ON' : 'OFF'}</button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openModal(p)} className="action-btn">Editar</button>
                      <button onClick={() => handleDelete(p)} className="action-btn" style={{ color: 'var(--red)' }}>X</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 14, width: 'min(560px, 94vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 16, position: 'sticky', top: 0, background: 'var(--bg2)' }}>
              {editando ? 'Editar producto' : 'Nuevo producto'}
            </div>
            <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Nombre *
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, marginTop: 4, outline: 'none' }} />
                </label>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Categoria *
                  <input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} required style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, marginTop: 4, outline: 'none' }} />
                </label>
              </div>
              <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                Descripcion
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={2} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, marginTop: 4, outline: 'none', resize: 'vertical' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Precio venta *
                  <input type="number" min="0" value={form.precioVenta} onChange={e => setForm({...form, precioVenta: parseFloat(e.target.value) || 0})} required style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, marginTop: 4, outline: 'none' }} />
                </label>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Stock
                  <input type="number" min="0" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, marginTop: 4, outline: 'none' }} />
                </label>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Ventas simuladas
                  <input type="number" min="0" value={form.ventasSimuladas} onChange={e => setForm({...form, ventasSimuladas: parseInt(e.target.value) || 0})} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, marginTop: 4, outline: 'none' }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Imagen URL
                  <input value={form.imagen} onChange={e => setForm({...form, imagen: e.target.value})} placeholder="https://..." style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, marginTop: 4, outline: 'none' }} />
                </label>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Link de compra
                  <input value={form.linkCompra} onChange={e => setForm({...form, linkCompra: e.target.value})} placeholder="https://..." style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, marginTop: 4, outline: 'none' }} />
                </label>
              </div>
              <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                Imagenes adicionales (una URL por linea)
                <textarea value={form.imagenes} onChange={e => setForm({...form, imagenes: e.target.value})} rows={2} placeholder="https://..." style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, marginTop: 4, outline: 'none', resize: 'vertical' }} />
              </label>

              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.ofertaActiva} onChange={e => setForm({...form, ofertaActiva: e.target.checked})} />
                    Oferta activa
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.destacado} onChange={e => setForm({...form, destacado: e.target.checked})} />
                    Destacado
                  </label>
                </div>
                {form.ofertaActiva && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Precio oferta
                      <input type="number" min="0" value={form.ofertaPrecio} onChange={e => setForm({...form, ofertaPrecio: parseFloat(e.target.value) || 0})} style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, marginTop: 4, outline: 'none' }} />
                    </label>
                    <label style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Vence
                      <input type="datetime-local" value={form.ofertaHasta} onChange={e => setForm({...form, ofertaHasta: e.target.value})} style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14, marginTop: 4, outline: 'none' }} />
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
