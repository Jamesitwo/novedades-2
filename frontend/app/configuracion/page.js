'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ConfiguracionPage() {
  const { usuario } = useAuthStore();
  const [config, setConfig] = useState({
    auto_asignar_novedades: false,
    auto_asignar_oficina: false,
    metodo_asignacion: 'round_robin',
    operadores_incluidos: [],
    empresa_nombre: '',
    empresa_nit: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: ''
  });
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (usuario?.rol !== 'admin') {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [configRes, operadoresRes] = await Promise.all([
          api.get('/api/configuracion'),
          api.get('/api/usuarios/operadores')
        ]);
        setConfig(configRes.data);
        setOperadores(operadoresRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [usuario]);

  const handleToggle = (field) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleMetodoChange = (e) => {
    setConfig(prev => ({ ...prev, metodo_asignacion: e.target.value }));
  };

  const handleOperadorToggle = (operadorId) => {
    setConfig(prev => {
      const incluidos = prev.operadores_incluidos.includes(operadorId)
        ? prev.operadores_incluidos.filter(id => id !== operadorId)
        : [...prev.operadores_incluidos, operadorId];
      return { ...prev, operadores_incluidos: incluidos };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/configuracion', {
        auto_asignar_novedades: config.auto_asignar_novedades,
        auto_asignar_oficina: config.auto_asignar_oficina,
        metodo_asignacion: config.metodo_asignacion,
        operadores_incluidos: config.operadores_incluidos,
        empresa_nombre: config.empresa_nombre,
        empresa_nit: config.empresa_nit,
        empresa_direccion: config.empresa_direccion,
        empresa_telefono: config.empresa_telefono,
        empresa_email: config.empresa_email
      });
      showToast('Configuración guardada correctamente');
    } catch (error) {
      showToast('Error al guardar configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (usuario?.rol !== 'admin') {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <h2>Acceso denegado</h2>
          <p>Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

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

      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Configuración de Auto-Asignación</h1>

      <div className="table-card" style={{ maxWidth: 700 }}>
        <div className="table-header">
          <span className="table-header-title">Novedades</span>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div
              onClick={() => handleToggle('auto_asignar_novedades')}
              style={{
                width: 48, height: 26, borderRadius: 13, background: config.auto_asignar_novedades ? 'var(--accent)' : 'var(--bg3)',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer'
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: config.auto_asignar_novedades ? 24 : 2,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
            <span style={{ fontSize: 14 }}>Auto-asignar novedades al crear</span>
          </label>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8, marginLeft: 60 }}>
            Los nuevos pedidos de novedad se asignarán automáticamente según el método seleccionado.
          </p>
        </div>
      </div>

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header">
          <span className="table-header-title">Oficina</span>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div
              onClick={() => handleToggle('auto_asignar_oficina')}
              style={{
                width: 48, height: 26, borderRadius: 13, background: config.auto_asignar_oficina ? 'var(--accent)' : 'var(--bg3)',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer'
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: config.auto_asignar_oficina ? 24 : 2,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
            <span style={{ fontSize: 14 }}>Auto-asignar pedidos de oficina al crear</span>
          </label>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8, marginLeft: 60 }}>
            Los nuevos pedidos en oficina se asignarán automáticamente según el método seleccionado.
          </p>
        </div>
      </div>

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header">
          <span className="table-header-title">Método de Distribución</span>
        </div>
        <div style={{ padding: 20 }}>
          <select
            value={config.metodo_asignacion}
            onChange={handleMetodoChange}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '10px 14px', fontSize: 14, color: 'var(--text)',
              cursor: 'pointer', minWidth: 200
            }}
          >
            <option value="round_robin">Round Robin (ciclar operadores)</option>
            <option value="menor_carga">Menor Carga (al que tiene menos asignados)</option>
          </select>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>
            {config.metodo_asignacion === 'round_robin'
              ? 'Los pedidos se asignan cíclicamente en orden.'
              : 'Los pedidos se asignan al operador con menos pedidos asignados.'}
          </p>
        </div>
      </div>

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header">
          <span className="table-header-title">Operadores Incluidos</span>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>
            Selecciona los operadores que participan en la auto-asignación. Los operadores inactivos serán omitidos.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {operadores.map(op => (
              <label
                key={op.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: 'var(--bg3)' }}
              >
                <input
                  type="checkbox"
                  checked={config.operadores_incluidos.includes(op.id)}
                  onChange={() => handleOperadorToggle(op.id)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 14 }}>{op.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                  {op.rol === 'operador_asignado' ? 'Agente' : op.rol}
                </span>
              </label>
            ))}
            {operadores.length === 0 && (
              <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                No hay operadores disponibles
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header">
          <span className="table-header-title">Datos de la Empresa</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Aparecen en las facturas PDF</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div className="form-group">
            <label>Nombre de la empresa</label>
            <input
              type="text"
              value={config.empresa_nombre}
              onChange={e => setConfig(prev => ({ ...prev, empresa_nombre: e.target.value }))}
              placeholder="Ej: GestiónNovedades SAS"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>NIT</label>
              <input
                type="text"
                value={config.empresa_nit}
                onChange={e => setConfig(prev => ({ ...prev, empresa_nit: e.target.value }))}
                placeholder="Ej: 900.123.456-7"
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="text"
                value={config.empresa_telefono}
                onChange={e => setConfig(prev => ({ ...prev, empresa_telefono: e.target.value }))}
                placeholder="Ej: (601) 123-4567"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={config.empresa_direccion}
              onChange={e => setConfig(prev => ({ ...prev, empresa_direccion: e.target.value }))}
              placeholder="Ej: Calle 123 #45-67, Bogotá"
              style={{ width: '100%' }}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={config.empresa_email}
              onChange={e => setConfig(prev => ({ ...prev, empresa_email: e.target.value }))}
              placeholder="Ej: info@empresa.com"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn btn-primary"
        style={{ marginTop: 24, padding: '12px 32px', fontSize: 14 }}
      >
        {saving ? 'Guardando...' : 'Guardar Configuración'}
      </button>
    </div>
  );
}