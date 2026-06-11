'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/Skeleton';

const POTENCIAL_COLORS = {
  alto: { bg: 'rgba(61,220,132,.15)', text: '#3DDC84', border: '#3DDC84' },
  medio: { bg: 'rgba(255,196,0,.15)', text: '#FFC400', border: '#FFC400' },
  bajo: { bg: 'rgba(255,92,92,.15)', text: '#FF5C5C', border: '#FF5C5C' }
};

const ORDENES = [
  { value: 'ventas-desc', label: 'Más ventas' },
  { value: 'ventas-asc', label: 'Menos ventas' },
  { value: 'precio-desc', label: 'Mayor precio prov.' },
  { value: 'precio-asc', label: 'Menor precio prov.' },
  { value: 'nombre', label: 'Nombre A–Z' },
  { value: 'reciente', label: 'Reciente' }
];

export default function PizdoPage() {
  const [productos, setProductos] = useState([]);
  const [stats, setStats] = useState({ total: 0, alto: 0, medio: 0, bajo: 0, ventasTotales: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [potencial, setPotencial] = useState('');
  const [orden, setOrden] = useState('ventas-desc');
  const [categorias, setCategorias] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    dropiId: '', nombre: '', ventas: 0, categoria: '', potencial: 'medio', imagen: '', link: '', precioProveedor: 0
  });
  const [saving, setSaving] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ orden });
      if (search) params.append('search', search);
      if (categoria) params.append('categoria', categoria);
      if (potencial) params.append('potencial', potencial);
      const { data } = await api.get(`/api/pizdo?${params}`);
      setProductos(data.productos);
      setStats(data.stats);
      setCategorias(data.categorias || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [search, categoria, potencial, orden]);

  const openModal = (producto = null) => {
    if (producto) {
      setEditando(producto);
      setForm({
        dropiId: producto.dropiId || '',
        nombre: producto.nombre || '',
        ventas: producto.ventas || 0,
        categoria: producto.categoria || '',
        potencial: producto.potencial || 'medio',
        imagen: producto.imagen || '',
        link: producto.link || '',
        precioProveedor: producto.precioProveedor || 0
      });
    } else {
      setEditando(null);
      setForm({ dropiId: '', nombre: '', ventas: 0, categoria: '', potencial: 'medio', imagen: '', link: '', precioProveedor: 0 });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.dropiId || !form.nombre || !form.categoria) {
      showToast('ID, nombre y categoría son requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/api/pizdo/${editando.id}`, form);
      } else {
        await api.post('/api/pizdo', form);
      }
      setShowModal(false);
      fetchProductos();
      showToast(editando ? 'Producto actualizado' : 'Producto agregado');
    } catch (error) {
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;
    try {
      await api.delete(`/api/pizdo/${producto.id}`);
      fetchProductos();
      showToast('Producto eliminado');
    } catch (error) {
      showToast('Error al eliminar', 'error');
    }
  };

  const exportarJSON = () => {
    const data = productos.map(({ id, createdById, createdBy, createdAt, updatedAt, ...p }) => p);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pizdo-ganadores-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importarJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error('formato');
        await api.post('/api/pizdo/import', { productos: arr });
        fetchProductos();
        showToast(`${arr.length} productos importados`);
      } catch (err) {
        showToast('Archivo no válido', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatNum = (n) => Number(n).toLocaleString('es-CO');

  const handleSearchInput = (value) => {
    setSearch(value);
  };

  return (
    <div className="content">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Pizdo <span style={{ color: '#FFC400' }}>/ Ganadores Dropi</span>
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Radar de productos con potencial</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportarJSON} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>⬇ Exportar</button>
          <label className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            ⬆ Importar
            <input type="file" accept=".json" hidden onChange={importarJSON} />
          </label>
          <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12, background: '#FFC400', color: '#15171C' }}>
            + Agregar
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px'
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 16, color: 'var(--accent)',
            padding: '4px 12px', background: 'var(--bg3)', borderRadius: 8
          }}>{stats.total}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>productos</span>
          <span style={{
            fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, color: '#3DDC84',
            padding: '2px 10px', background: 'rgba(61,220,132,.1)', borderRadius: 6
          }}>{stats.alto} alto</span>
          <span style={{
            fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, color: '#FFC400',
            padding: '2px 10px', background: 'rgba(255,196,0,.1)', borderRadius: 6
          }}>{stats.medio} medio</span>
          <span style={{
            fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, color: '#FF5C5C',
            padding: '2px 10px', background: 'rgba(255,92,92,.1)', borderRadius: 6
          }}>{stats.bajo} bajo</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
            {formatNum(stats.ventasTotales)} ventas totales
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px'
      }}>
        <input
          type="search"
          placeholder="Buscar por nombre o ID…"
          value={search}
          onChange={(e) => handleSearchInput(e.target.value)}
          style={{
            flex: 1, minWidth: 180, background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none'
          }}
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '9px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={potencial}
          onChange={(e) => setPotencial(e.target.value)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '9px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="">Todo potencial</option>
          <option value="alto">Alto</option>
          <option value="medio">Medio</option>
          <option value="bajo">Bajo</option>
        </select>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '9px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none'
          }}
        >
          {ORDENES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="table-card"><TableSkeleton rows={6} columns={3} /></div>
      ) : productos.length === 0 ? (
        <div className="table-card">
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60, border: '1px dashed var(--border)', borderRadius: 10 }}>
            {search || categoria || potencial
              ? 'Ningún producto coincide con los filtros.'
              : 'Aún no hay productos. Toca "+ Agregar" para empezar tu radar.'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14
        }}>
          {productos.map(p => {
            const pc = POTENCIAL_COLORS[p.potencial] || POTENCIAL_COLORS.medio;
            return (
              <div key={p.id} style={{
                background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `4px solid ${pc.border}`,
                borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column'
              }}>
                {p.imagen ? (
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    style={{ width: '100%', height: 160, objectFit: 'cover', background: 'var(--bg3)' }}
                    onError={(e) => { e.target.outerHTML = '<div style="width:100%;height:160px;background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px">Sin imagen</div>'; }}
                  />
                ) : (
                  <div style={{ width: '100%', height: 160, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>Sin imagen</div>
                )}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>ID {p.dropiId}</span>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11,
                      letterSpacing: 1, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4,
                      background: pc.bg, color: pc.text
                    }}>{p.potencial}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, flex: 1 }}>{p.nombre}</div>
                  <span style={{
                    display: 'inline-block', background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 20, padding: '2px 10px', fontSize: 10, color: 'var(--text3)', width: 'fit-content'
                  }}>{p.categoria}</span>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600 }}>
                    {formatNum(p.ventas)} <small style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>VENTAS</small>
                  </div>
                  {p.precioProveedor > 0 && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, fontFamily: 'var(--mono)' }}>
                      <span style={{ color: 'var(--text3)' }}>
                        Costo: {formatNum(p.precioProveedor)}
                      </span>
                      <span style={{ color: (p.ventas - p.precioProveedor) > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        Margen: {formatNum(p.ventas - p.precioProveedor)}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener"
                        style={{
                          flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600,
                          padding: '6px 8px', color: '#FFC400', textDecoration: 'none',
                          background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8
                        }}
                      >
                        Ver en Dropi ↗
                      </a>
                    )}
                    <button onClick={() => openModal(p)} className="btn btn-ghost" style={{ flex: 1, fontSize: 11, padding: '6px 8px' }}>Editar</button>
                    <button onClick={() => handleDelete(p)} className="btn btn-danger" style={{ fontSize: 11, padding: '6px 10px' }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 14, width: 'min(480px, 92vw)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20,
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              {editando ? 'Editar producto' : 'Agregar producto'}
            </div>
            <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  ID Dropi
                  <input
                    value={form.dropiId}
                    onChange={e => setForm({ ...form, dropiId: e.target.value })}
                    required
                    placeholder="Ej: 154823"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  Ventas
                  <input
                    type="number"
                    min="0"
                    value={form.ventas}
                    onChange={e => setForm({ ...form, ventas: parseInt(e.target.value) || 0 })}
                    required
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  Precio Proveedor
                  <input
                    type="number"
                    min="0"
                    value={form.precioProveedor}
                    onChange={e => setForm({ ...form, precioProveedor: parseFloat(e.target.value) || 0 })}
                    placeholder="Costo del proveedor"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Nombre
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                  placeholder="Ej: Kit Taladro + Pulidora DEWALT"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  Categoría
                  <input
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value })}
                    required
                    placeholder="Ej: Herramientas"
                    list="catList"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                  <datalist id="catList">
                    {categorias.map(c => <option key={c} value={c} />)}
                  </datalist>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  Potencial
                  <select
                    value={form.potencial}
                    onChange={e => setForm({ ...form, potencial: e.target.value })}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="alto">Alto</option>
                    <option value="medio">Medio</option>
                    <option value="bajo">Bajo</option>
                  </select>
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                URL de imagen
                <input
                  type="url"
                  value={form.imagen}
                  onChange={e => setForm({ ...form, imagen: e.target.value })}
                  placeholder="https://…"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Link del producto (Dropi)
                <input
                  type="url"
                  value={form.link}
                  onChange={e => setForm({ ...form, link: e.target.value })}
                  placeholder="https://app.dropi.co/…"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ background: '#FFC400', color: '#15171C' }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
