'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import ConfirmDialog from './ConfirmDialog';

export default function TiendaAdminPage() {
  const router = useRouter();
  const { usuario, isAuthenticated, initialized, initialize } = useAuthStore();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [selected, setSelected] = useState([]);
  const LIMIT = 20;

  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: '', precioVenta: 0, precioProveedor: 0,
    imagen: '', imagenes: '', linkCompra: '', stock: 0,
    ofertaActiva: false, ofertaPrecio: 0, ofertaHasta: '',
    ventasSimuladas: 0, activo: true, destacado: false,
    upsellIds: []
  });
  const [allProducts, setAllProducts] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [lucidbotConfig, setLucidbotConfig] = useState({
    activo: false, api_key: '', tag_name: '', flow_id: '', field_values: []
  });
  const [savingBot, setSavingBot] = useState(false);

  useEffect(() => {
    api.get('/api/configuracion').then(({ data }) => {
      setLucidbotConfig({
        activo: data.lucidbot_activo || false,
        api_key: data.lucidbot_api_key || '',
        tag_name: data.lucidbot_tag_name || '',
        flow_id: data.lucidbot_flow_id || '',
        field_values: data.lucidbot_field_values || []
      });
    }).catch(() => {});
  }, [isAuthenticated, usuario]);

  const handleSaveLucidbot = async () => {
    setSavingBot(true);
    try {
      await api.put('/api/configuracion', {
        lucidbot_activo: lucidbotConfig.activo,
        lucidbot_api_key: lucidbotConfig.api_key,
        lucidbot_tag_name: lucidbotConfig.tag_name,
        lucidbot_flow_id: lucidbotConfig.flow_id ? Number(lucidbotConfig.flow_id) : null,
        lucidbot_field_values: lucidbotConfig.field_values
      });
      showToast('LucidBot guardado correctamente');
    } catch (e) {
      showToast('Error al guardar LucidBot', 'error');
    } finally {
      setSavingBot(false);
    }
  };

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

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.append('search', search);
      if (filtroCategoria) params.append('categoria', filtroCategoria);
      const { data } = await api.get(`/api/tienda?${params}`);
      let items = data.productos || [];
      if (filtroEstado === 'activo') items = items.filter(p => p.activo);
      if (filtroEstado === 'inactivo') items = items.filter(p => !p.activo);
      setProductos(items);
      setCategorias(data.categorias || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || items.length);
      setSelected([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filtroCategoria, filtroEstado]);

  useEffect(() => { if (isAuthenticated && usuario?.rol === 'admin') fetchProductos(); }, [fetchProductos, isAuthenticated, usuario]);

  useEffect(() => {
    if (!isAuthenticated || usuario?.rol !== 'admin') return;
    api.get('/api/tienda?limit=200&orden=reciente')
      .then(({ data }) => setAllProducts(data.productos))
      .catch(() => {});
  }, [isAuthenticated, usuario]);

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
        ventasSimuladas: p.ventasSimuladas, activo: p.activo, destacado: p.destacado,
        upsellIds: Array.isArray(p.upsellIds) ? p.upsellIds : []
      });
    } else {
      setEditando(null);
      setForm({
        nombre: '', descripcion: '', categoria: '', precioVenta: 0, precioProveedor: 0,
        imagen: '', imagenes: '', linkCompra: '', stock: 0,
        ofertaActiva: false, ofertaPrecio: 0, ofertaHasta: '',
        ventasSimuladas: 0, activo: true, destacado: false,
        upsellIds: []
      });
    }
    setNewCategory('');
    setShowModal(true);
  };

  const duplicateProduct = async (p, e) => {
    e.stopPropagation();
    const payload = {
      nombre: p.nombre + ' (copia)', descripcion: p.descripcion, categoria: p.categoria,
      precioVenta: p.precioVenta, precioProveedor: p.precioProveedor || 0,
      imagen: p.imagen || '', imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
      linkCompra: p.linkCompra || '', stock: p.stock,
      ofertaActiva: false, ofertaPrecio: 0, ofertaHasta: null,
      ventasSimuladas: 0, activo: true, destacado: false,
      upsellIds: Array.isArray(p.upsellIds) ? p.upsellIds : []
    };
    try {
      await api.post('/api/tienda', payload);
      showToast('Producto duplicado');
      fetchProductos();
    } catch (e) {
      showToast('Error al duplicar', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const categoria = newCategory.trim() || form.categoria;
    if (!form.nombre || !categoria || !form.precioVenta) { showToast('Nombre, categoría y precio son requeridos', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        categoria,
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

  const handleToggleActivo = async (id) => {
    await api.patch(`/api/tienda/${id}/toggle`);
    fetchProductos();
  };

  const handleToggleDestacado = async (id, current) => {
    await api.put(`/api/tienda/${id}`, { destacado: !current });
    fetchProductos();
  };

  const handleDelete = (p) => {
    setConfirm({
      message: `Estás por eliminar "${p.nombre}". Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirm(null);
        await api.delete(`/api/tienda/${p.id}`);
        showToast('Producto eliminado');
        fetchProductos();
      },
      onCancel: () => setConfirm(null)
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.length === productos.length ? [] : productos.map(p => p.id));
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkToggleActivo = async (activo) => {
    for (const id of selected) {
      await api.patch(`/api/tienda/${id}/toggle`).catch(() => {});
    }
    showToast(`${selected.length} productos ${activo ? 'activados' : 'desactivados'}`);
    fetchProductos();
  };

  const bulkDelete = () => {
    setConfirm({
      message: `Estás por eliminar ${selected.length} productos. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirm(null);
        for (const id of selected) {
          await api.delete(`/api/tienda/${id}`).catch(() => {});
        }
        showToast(`${selected.length} productos eliminados`);
        fetchProductos();
      },
      onCancel: () => setConfirm(null)
    });
  };

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const S = { border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e' };
  const hasOferta = form.ofertaActiva && form.ofertaPrecio > 0;

  if (!initialized || !isAuthenticated || usuario?.rol !== 'admin') return null;

  return (
    <div style={{ maxWidth: 1200, background: '#f7fafc', padding: '24px 24px 48px', minHeight: '100%', fontFamily: '"Inter", -apple-system, sans-serif', color: '#181c1e' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .admin-input { background: #ffffff; border: 2px solid #181c1e; padding: 8px 14px; font-size: 16px; font-weight: 700; color: #181c1e; outline: none; border-radius: 0; font-family: 'Inter', sans-serif; }
        .admin-input:focus { box-shadow: 0 0 0 3px #f28c00; }
        .admin-btn { min-height: 44px; padding: 0 20px; font-size: 15px; font-weight: 700; cursor: pointer; border: 2px solid #181c1e; box-shadow: 3px 3px 0px 0px #181c1e; transition: all 0.1s; display: inline-flex; align-items: center; gap: 6px; border-radius: 0; font-family: 'Inter', sans-serif; }
        .admin-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px 0px #181c1e; }
        .admin-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .admin-table th { background: #f1f4f6; border-bottom: 2px solid #181c1e; padding: 10px 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #554334; text-align: left; white-space: nowrap; }
        .admin-table td { padding: 10px 12px; border-bottom: 1px solid #e0e3e5; font-size: 14px; vertical-align: middle; }
        .admin-table tr:hover td { background: #f1f4f6; }
        @media (max-width: 768px) { .admin-table th, .admin-table td { padding: 6px 8px; font-size: 12px; } }
      `}} />

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#ba1a1a' : '#22c55e',
          color: '#fff', padding: '12px 20px', fontSize: 15, fontWeight: 700,
          border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
          fontFamily: '"Inter", sans-serif'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#181c1e', margin: '0 0 4px', borderLeft: '6px solid #f28c00', paddingLeft: 12 }}>
            Administrar Pizdo
          </h2>
          <div style={{ fontSize: 13, color: '#887362', marginTop: 4 }}>
            <a href="/tienda" target="_blank" style={{ color: '#f28c00', fontWeight: 700 }}>Ver tienda pública →</a>
            <span style={{ margin: '0 8px' }}>·</span>
            {totalRecords} productos
          </div>
        </div>
        <button onClick={() => openModal()} style={{
          ...S, background: '#f28c00', color: '#181c1e', minHeight: 48, padding: '0 24px',
          fontSize: 16, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap'
        }}>
          + Nuevo producto
        </button>
        <button onClick={() => setConfirm({
          message: '¿Eliminar TODOS los productos? Se borrarán también todas las reseñas. Esta acción NO se puede deshacer.',
          onConfirm: async () => {
            setConfirm(null);
            await api.delete('/api/tienda/todos').catch(() => {});
            showToast('Todos los productos eliminados');
            fetchProductos();
          },
          onCancel: () => setConfirm(null)
        })} style={{
          ...S, background: '#ba1a1a', color: '#ffffff', minHeight: 48, padding: '0 24px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 8
        }}>
          🗑 Eliminar todos
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="admin-input" type="text" placeholder="🔍 Buscar producto..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 260, minHeight: 44 }} />
        <select className="admin-input" value={filtroCategoria} onChange={e => { setFiltroCategoria(e.target.value); setPage(1); }}
          style={{ minHeight: 44, cursor: 'pointer', appearance: 'auto' }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="admin-input" value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1); }}
          style={{ minHeight: 44, cursor: 'pointer', appearance: 'auto' }}>
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#887362', fontWeight: 700 }}>
          Página {page} de {totalPages}
        </div>
      </div>

      {selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', marginBottom: 12,
          background: '#ffdcc0', border: '2px solid #f28c00', boxShadow: '3px 3px 0px 0px #181c1e',
          fontSize: 14, fontWeight: 700
        }}>
          <span>{selected.length} seleccionados</span>
          <button onClick={() => bulkToggleActivo(true)} style={{ ...S, background: '#22c55e', color: '#fff', fontSize: 12, padding: '4px 12px', minHeight: 32, cursor: 'pointer' }}>Activar</button>
          <button onClick={() => bulkToggleActivo(false)} style={{ ...S, background: '#ba1a1a', color: '#fff', fontSize: 12, padding: '4px 12px', minHeight: 32, cursor: 'pointer' }}>Desactivar</button>
          <button onClick={bulkDelete} style={{ ...S, background: '#181c1e', color: '#ffb875', fontSize: 12, padding: '4px 12px', minHeight: 32, cursor: 'pointer' }}>Eliminar</button>
          <button onClick={() => setSelected([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, fontSize: 16, fontWeight: 700, color: '#887362' }}>Cargando...</div>
      ) : (
        <div style={{ background: '#ffffff', border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e', overflow: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input type="checkbox" checked={selected.length === productos.length && productos.length > 0}
                    onChange={toggleSelectAll} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#f28c00' }} />
                </th>
                <th style={{ width: 56 }}>Img</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Oferta</th>
                <th style={{ textAlign: 'center' }}>Stock</th>
                <th style={{ textAlign: 'center', width: 30 }}>★</th>
                <th style={{ textAlign: 'center', width: 50 }}>ON/OFF</th>
                <th style={{ width: 130 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#887362', fontSize: 15, fontWeight: 700 }}>No se encontraron productos</td></tr>
              ) : (
                productos.map(p => (
                  <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.45 }}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={selected.includes(p.id)}
                        onChange={() => toggleSelect(p.id)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#f28c00' }} />
                    </td>
                    <td>
                      {p.imagen ? (
                        <img src={p.imagen} alt="" style={{ width: 44, height: 44, objectFit: 'cover', border: '2px solid #181c1e', background: '#f1f4f6' }}
                          onError={e => { e.target.outerHTML = '<div style="width:44px;height:44px;border:2px solid #181c1e;background:#f1f4f6"></div>'; }} />
                      ) : (
                        <div style={{ width: 44, height: 44, border: '2px solid #181c1e', background: '#f1f4f6' }} />
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      <button onClick={() => openModal(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#181c1e', fontWeight: 700, fontSize: 14, textAlign: 'left', padding: 0, textDecoration: 'underline', textDecorationColor: '#f28c00', textUnderlineOffset: 3 }}>
                        {p.nombre}
                      </button>
                      {p.descripcion && <div style={{ fontSize: 12, color: '#887362', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.descripcion}</div>}
                    </td>
                    <td><span style={{ fontSize: 12, fontWeight: 700, color: '#f28c00', textTransform: 'uppercase', letterSpacing: 1 }}>{p.categoria}</span></td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {p.ofertaActiva && p.ofertaPrecio ? (
                        <>
                          <span style={{ color: '#ba1a1a' }}>{formatPrice(p.ofertaPrecio)}</span>
                          <br />
                          <span style={{ textDecoration: 'line-through', color: '#887362', fontSize: 11 }}>{formatPrice(p.precioVenta)}</span>
                        </>
                      ) : formatPrice(p.precioVenta)}
                    </td>
                    <td>
                      {p.ofertaActiva ? (
                        <span style={{ color: '#ba1a1a', fontSize: 12, fontWeight: 700 }}>
                          {p.ofertaHasta ? new Date(p.ofertaHasta).toLocaleDateString('es-CO') : 'Activa'}
                        </span>
                      ) : <span style={{ color: '#887362', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: p.stock <= 5 ? '#ba1a1a' : '#181c1e' }}>
                      {p.stock}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleToggleDestacado(p.id, p.destacado)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 22,
                        color: p.destacado ? '#f28c00' : '#e0e3e5'
                      }}>{p.destacado ? '★' : '☆'}</button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleToggleActivo(p.id)} style={{
                        minWidth: 44, height: 32, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                        border: '2px solid #181c1e', background: p.activo ? '#22c55e' : '#ba1a1a', color: '#fff',
                        boxShadow: '2px 2px 0px 0px #181c1e'
                      }}>{p.activo ? 'ON' : 'OFF'}</button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); openModal(p); }} style={{ ...S, background: '#f28c00', color: '#181c1e', fontSize: 11, padding: '3px 10px', minHeight: 30, cursor: 'pointer' }}>Editar</button>
                        <button onClick={(e) => duplicateProduct(p, e)} style={{ ...S, background: '#ffffff', color: '#181c1e', fontSize: 11, padding: '3px 8px', minHeight: 30, cursor: 'pointer' }} title="Duplicar">📋</button>
                        <button onClick={() => handleDelete(p)} style={{ ...S, background: '#ba1a1a', color: '#fff', fontSize: 11, padding: '3px 8px', minHeight: 30, cursor: 'pointer' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...S, background: page <= 1 ? '#f1f4f6' : '#ffffff', color: '#181c1e', opacity: page <= 1 ? 0.4 : 1, fontSize: 14, padding: '6px 16px', minHeight: 40, cursor: 'pointer' }}>
            ← Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
            <span key={p}>
              {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: '#887362', margin: '0 4px' }}>…</span>}
              <button onClick={() => setPage(p)} style={{
                minWidth: 40, height: 40, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                border: '2px solid #181c1e', background: p === page ? '#f28c00' : '#ffffff',
                color: p === page ? '#181c1e' : '#554334',
                boxShadow: p === page ? '2px 2px 0px 0px #181c1e' : 'none'
              }}>{p}</button>
            </span>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...S, background: page >= totalPages ? '#f1f4f6' : '#ffffff', color: '#181c1e', opacity: page >= totalPages ? 0.4 : 1, fontSize: 14, padding: '6px 16px', minHeight: 40, cursor: 'pointer' }}>
            Siguiente →
          </button>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
          onClick={() => setShowModal(false)}>
          <div style={{
            background: '#ffffff', border: '2px solid #181c1e', boxShadow: '8px 8px 0px 0px #181c1e',
            width: 'min(900px, 96vw)', maxHeight: '92vh', overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '20px 28px', borderBottom: '2px solid #181c1e', fontWeight: 800, fontSize: 20, color: '#181c1e',
              background: '#f1f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 1
            }}>
              {editando ? 'Editar producto' : 'Nuevo producto'}
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#181c1e' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 0 }}>
              <form onSubmit={handleSave} style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Nombre *
                    <input className="admin-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required
                      style={{ width: '100%', marginTop: 6, padding: '10px 14px', fontSize: 16 }} />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Categoría *
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <select className="admin-input" value={form.categoria}
                        onChange={e => { setForm({...form, categoria: e.target.value}); setNewCategory(''); }}
                        style={{ flex: 1, cursor: 'pointer', appearance: 'auto', minWidth: 0, padding: '10px 14px' }}>
                        <option value="">Seleccionar...</option>
                        {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__new__">+ Nueva categoría</option>
                      </select>
                    </div>
                    {form.categoria === '__new__' && (
                      <input className="admin-input" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                        placeholder="Escribe la nueva categoría" style={{ width: '100%', marginTop: 6 }} />
                    )}
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Stock
                    <input type="number" min="0" className="admin-input" value={form.stock}
                      onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})} style={{ width: '100%', marginTop: 6 }} />
                  </label>
                </div>
                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Descripción
                  <textarea className="admin-input" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={3}
                    style={{ width: '100%', marginTop: 6, resize: 'vertical', fontFamily: 'Inter, sans-serif', padding: '10px 14px' }} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Precio *
                    <input type="number" min="0" className="admin-input" value={form.precioVenta}
                      onChange={e => setForm({...form, precioVenta: parseFloat(e.target.value) || 0})} required style={{ width: '100%', marginTop: 6 }} />
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Costo proveedor
                    <input type="number" min="0" className="admin-input" value={form.precioProveedor}
                      onChange={e => setForm({...form, precioProveedor: parseFloat(e.target.value) || 0})} style={{ width: '100%', marginTop: 6 }} />
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Ventas simuladas
                    <input type="number" min="0" className="admin-input" value={form.ventasSimuladas}
                      onChange={e => setForm({...form, ventasSimuladas: parseInt(e.target.value) || 0})} style={{ width: '100%', marginTop: 6 }} />
                  </label>
                </div>
                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Imagen principal (URL)
                  <input className="admin-input" value={form.imagen} onChange={e => setForm({...form, imagen: e.target.value})}
                    placeholder="https://..." style={{ width: '100%', marginTop: 6 }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Link de compra
                  <input className="admin-input" value={form.linkCompra} onChange={e => setForm({...form, linkCompra: e.target.value})}
                    placeholder="https://..." style={{ width: '100%', marginTop: 6 }} />
                </label>
                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Más imágenes (una URL por línea)
                  <textarea className="admin-input" value={form.imagenes} onChange={e => setForm({...form, imagenes: e.target.value})} rows={3}
                    placeholder="https://..." style={{ width: '100%', marginTop: 6, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                </label>

                <div style={{ background: '#f1f4f6', border: '2px solid #181c1e', padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    🔗 Upsell (productos relacionados)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allProducts.filter(a => a.id !== (editando?.id || '')).slice(0, 30).map(ap => {
                      const selected = form.upsellIds.includes(ap.id);
                      return (
                        <button key={ap.id} type="button" onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            upsellIds: selected ? prev.upsellIds.filter(id => id !== ap.id) : [...prev.upsellIds, ap.id]
                          }));
                        }} style={{
                          padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          border: '2px solid #181c1e', background: selected ? '#f28c00' : '#ffffff',
                          color: selected ? '#181c1e' : '#554334',
                          boxShadow: selected ? '2px 2px 0px 0px #181c1e' : 'none',
                          whiteSpace: 'nowrap'
                        }}>
                          {selected ? '✓ ' : ''}{ap.nombre}
                        </button>
                      );
                    })}
                    {allProducts.filter(a => a.id !== (editando?.id || '')).length === 0 && (
                      <span style={{ fontSize: 12, color: '#887362' }}>Cargando productos...</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#887362', marginTop: 6 }}>
                    Selecciona productos que aparecerán como "También te puede interesar". Si no seleccionas ninguno, se muestran productos de la misma categoría.
                  </div>
                </div>

                <div style={{ background: '#f1f4f6', border: '2px solid #181c1e', padding: 18, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: form.ofertaActiva ? 14 : 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700, color: '#181c1e', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.ofertaActiva} onChange={e => setForm({...form, ofertaActiva: e.target.checked})}
                        style={{ width: 22, height: 22, accentColor: '#ba1a1a', cursor: 'pointer' }} />
                      🔥 Oferta activa
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700, color: '#181c1e', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.destacado} onChange={e => setForm({...form, destacado: e.target.checked})}
                        style={{ width: 22, height: 22, accentColor: '#f28c00', cursor: 'pointer' }} />
                      ⭐ Destacado
                    </label>
                  </div>
                  {form.ofertaActiva && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <label style={{ fontSize: 13, fontWeight: 900, color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Precio oferta
                        <input type="number" min="0" className="admin-input" value={form.ofertaPrecio}
                          onChange={e => setForm({...form, ofertaPrecio: parseFloat(e.target.value) || 0})}
                          style={{ width: '100%', marginTop: 6, borderColor: '#ba1a1a' }} />
                      </label>
                      <label style={{ fontSize: 13, fontWeight: 900, color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Vence
                        <input type="datetime-local" className="admin-input" value={form.ofertaHasta}
                          onChange={e => setForm({...form, ofertaHasta: e.target.value})}
                          style={{ width: '100%', marginTop: 6, borderColor: '#ba1a1a' }} />
                      </label>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 14 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ ...S, background: '#ffffff', color: '#181c1e', minHeight: 52, padding: '0 32px', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} style={{ ...S, background: '#f28c00', color: '#181c1e', minHeight: 52, padding: '0 32px', cursor: 'pointer', fontSize: 16, fontWeight: 800, opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>

              {/* PREVIEW */}
              <div style={{ padding: '28px 28px 28px 20px', borderLeft: '1px solid #e0e3e5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                  Vista previa
                </div>
                <div style={{
                  border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
                  background: '#ffffff', fontSize: 13
                }}>
                  <div style={{ height: 160, overflow: 'hidden', borderBottom: '2px solid #181c1e', background: '#f1f4f6' }}>
                    {form.imagen ? (
                      <img src={form.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.outerHTML = '<div style="width:100%;height:100%;background:#f1f4f6;display:flex;align-items:center;justify-content:center;color:#887362;font-size:13px;font-weight:700">Sin imagen</div>'; }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#887362', fontSize: 13, fontWeight: 700 }}>Sin imagen</div>
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#f28c00', textTransform: 'uppercase', letterSpacing: 2 }}>
                      {form.categoria === '__new__' ? newCategory || 'Sin categoría' : form.categoria || 'Sin categoría'}
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 700, margin: '6px 0', color: '#181c1e' }}>{form.nombre || 'Nombre del producto'}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {hasOferta ? (
                        <>
                          <span style={{ fontSize: 20, fontWeight: 900, color: '#ba1a1a' }}>{formatPrice(form.ofertaPrecio)}</span>
                          <span style={{ fontSize: 14, color: '#887362', textDecoration: 'line-through' }}>{formatPrice(form.precioVenta)}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 20, fontWeight: 900, color: '#181c1e' }}>{formatPrice(form.precioVenta)}</span>
                      )}
                    </div>
                    {form.ventasSimuladas > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#8d4f00', marginTop: 6 }}>
                        🔥 {form.ventasSimuladas} vendidos
                      </div>
                    )}
                    {hasOferta && form.ofertaPrecio > 0 && (
                      <div style={{
                        fontSize: 11, fontWeight: 900, color: '#181c1e', background: '#f28c00',
                        padding: '4px 10px', border: '2px solid #181c1e', marginTop: 8, display: 'inline-block'
                      }}>
                        -{Math.round((1 - form.ofertaPrecio / (form.precioVenta || 1)) * 100)}% OFF
                      </div>
                    )}
                    <button style={{
                      width: '100%', minHeight: 36, background: '#f28c00', color: '#181c1e',
                      border: '2px solid #181c1e', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginTop: 10
                    }}>
                      🛒 Comprar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 40, background: '#ffffff', border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#181c1e', margin: '0 0 4px', borderLeft: '5px solid #f28c00', paddingLeft: 10 }}>
              🤖 LucidBot
            </h3>
            <span style={{ fontSize: 12, color: '#887362' }}>Integración con panel.lucidbot.co al confirmar una compra</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, maxWidth: 600 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div onClick={() => setLucidbotConfig(prev => ({ ...prev, activo: !prev.activo }))} style={{
              width: 44, height: 24, borderRadius: 12, background: lucidbotConfig.activo ? '#22c55e' : '#e0e3e5',
              position: 'relative', transition: 'background 0.15s', cursor: 'pointer'
            }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: lucidbotConfig.activo ? 22 : 2,
                transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Activar LucidBot al comprar</span>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
              API Key (X-ACCESS-TOKEN)
              <input className="admin-input" value={lucidbotConfig.api_key}
                onChange={e => setLucidbotConfig(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="tu_x_access_token" style={{ width: '100%', marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
              Flow ID
              <input className="admin-input" type="number" value={lucidbotConfig.flow_id}
                onChange={e => setLucidbotConfig(prev => ({ ...prev, flow_id: e.target.value }))}
                placeholder="12345" style={{ width: '100%', marginTop: 4 }} />
            </label>
          </div>

          <label style={{ fontSize: 12, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
            Tag Name
            <input className="admin-input" value={lucidbotConfig.tag_name}
              onChange={e => setLucidbotConfig(prev => ({ ...prev, tag_name: e.target.value }))}
              placeholder="pizdo_compra" style={{ width: '100%', marginTop: 4 }} />
          </label>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Campos personalizados (field_name → valor del formulario)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(lucidbotConfig.field_values || []).map((fv, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="admin-input" value={fv.field_name}
                    onChange={e => {
                      const next = [...(lucidbotConfig.field_values || [])];
                      next[i] = { ...next[i], field_name: e.target.value };
                      setLucidbotConfig(prev => ({ ...prev, field_values: next }));
                    }}
                    placeholder="field_name en LucidBot" style={{ flex: 1, fontSize: 13, padding: '6px 10px' }} />
                  <span style={{ color: '#887362', fontSize: 13, fontWeight: 700 }}>←</span>
                  <select value={fv.value_from || ''}
                    onChange={e => {
                      const next = [...(lucidbotConfig.field_values || [])];
                      next[i] = { ...next[i], value_from: e.target.value };
                      setLucidbotConfig(prev => ({ ...prev, field_values: next }));
                    }}
                    className="admin-input" style={{ flex: 1, fontSize: 13, padding: '6px 10px', cursor: 'pointer', appearance: 'auto' }}>
                    <option value="">Seleccionar dato...</option>
                    <option value="producto">Producto</option>
                    <option value="precio">Precio unitario</option>
                    <option value="total">Total</option>
                    <option value="nombre">Nombre</option>
                    <option value="apellido">Apellido</option>
                    <option value="celular">Celular</option>
                    <option value="departamento">Departamento</option>
                    <option value="ciudad">Ciudad</option>
                    <option value="direccion">Dirección</option>
                    <option value="email">Email</option>
                    <option value="notas">Notas</option>
                    <option value="cantidad">Cantidad</option>
                  </select>
                  <button onClick={() => {
                    const next = (lucidbotConfig.field_values || []).filter((_, idx) => idx !== i);
                    setLucidbotConfig(prev => ({ ...prev, field_values: next }));
                  }} style={{ background: 'none', border: 'none', color: '#ba1a1a', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>✕</button>
                </div>
              ))}
              <button onClick={() => setLucidbotConfig(prev => ({
                ...prev,
                field_values: [...(prev.field_values || []), { field_name: '', value_from: '' }]
              }))} style={{
                background: '#f1f4f6', border: '2px dashed #181c1e',
                padding: '8px', color: '#554334', cursor: 'pointer', fontSize: 13, fontWeight: 700
              }}>
                + Agregar campo
              </button>
            </div>
          </div>

          <button onClick={handleSaveLucidbot} disabled={savingBot} style={{
            ...S, background: savingBot ? '#887362' : '#f28c00', color: '#181c1e',
            minHeight: 48, padding: '0 28px', cursor: 'pointer', fontSize: 15, fontWeight: 800,
            justifySelf: 'start', opacity: savingBot ? 0.6 : 1
          }}>
            {savingBot ? 'Guardando...' : '💾 Guardar LucidBot'}
          </button>
        </div>
      </div>

      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={confirm.onCancel} />}
    </div>
  );
}
