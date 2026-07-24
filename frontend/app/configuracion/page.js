'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ConfiguracionPage() {
  const { usuario } = useAuthStore();
  const [config, setConfig] = useState({
    auto_asignar_novedades: false,
    auto_asignar_oficina: false,
    auto_asignar_lucidsales: false,
    metodo_asignacion: 'round_robin',
    operadores_incluidos: [],
    empresa_nombre: '', empresa_nit: '', empresa_direccion: '', empresa_telefono: '', empresa_email: '',
    empresa_logo: '', empresa_banco: '', empresa_tipo_cuenta: '', empresa_numero_cuenta: '', empresa_titular_cuenta: '',
    factura_terminos: '', factura_resolucion: '', factura_rango_desde: '', factura_rango_hasta: '',
    factura_vigencia: '', factura_pie_legal: '', factura_prefijo: '',
    lucidsales_email: '', lucidsales_password: '', lucidsales_shop_id: '', lucidsales_activo: false
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
        auto_asignar_lucidsales: config.auto_asignar_lucidsales,
        metodo_asignacion: config.metodo_asignacion,
        operadores_incluidos: config.operadores_incluidos,
        empresa_nombre: config.empresa_nombre, empresa_nit: config.empresa_nit,
        empresa_direccion: config.empresa_direccion, empresa_telefono: config.empresa_telefono,
        empresa_email: config.empresa_email, empresa_logo: config.empresa_logo,
        empresa_banco: config.empresa_banco, empresa_tipo_cuenta: config.empresa_tipo_cuenta,
        empresa_numero_cuenta: config.empresa_numero_cuenta, empresa_titular_cuenta: config.empresa_titular_cuenta,
        factura_terminos: config.factura_terminos, factura_resolucion: config.factura_resolucion,
        factura_rango_desde: config.factura_rango_desde, factura_rango_hasta: config.factura_rango_hasta,
        factura_vigencia: config.factura_vigencia, factura_pie_legal: config.factura_pie_legal,
        factura_prefijo: config.factura_prefijo,
        lucidsales_email: config.lucidsales_email, lucidsales_password: config.lucidsales_password,
        lucidsales_shop_id: Number(config.lucidsales_shop_id) || null,
        lucidsales_activo: config.lucidsales_activo
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
          <span className="table-header-title">LucidSales · Pedidos</span>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div
              onClick={() => handleToggle('auto_asignar_lucidsales')}
              style={{
                width: 48, height: 26, borderRadius: 13, background: config.auto_asignar_lucidsales ? 'var(--accent)' : 'var(--bg3)',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer'
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: config.auto_asignar_lucidsales ? 24 : 2,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
            <span style={{ fontSize: 14 }}>Auto-asignar pedidos de LucidSales al vincular</span>
          </label>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8, marginLeft: 60 }}>
            Los pedidos vinculados desde LucidSales se asignarán automáticamente según el método seleccionado.
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

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header">
          <span className="table-header-title">Logo de la Empresa</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>URL de la imagen</span>
        </div>
        <div style={{ padding: 20 }}>
          <input type="url" value={config.empresa_logo} onChange={e => setConfig(prev => ({ ...prev, empresa_logo: e.target.value }))}
            placeholder="https://tudominio.com/logo.png" style={{ width: '100%' }} />
          <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>Aparece en la esquina superior izquierda de los PDF. Debe ser PNG o JPG, idealmente 200x200px.</p>
        </div>
      </div>

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header"><span className="table-header-title">Facturación</span></div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div className="form-group"><label>Prefijo de numeración</label>
            <input type="text" value={config.factura_prefijo} onChange={e => setConfig(prev => ({ ...prev, factura_prefijo: e.target.value }))}
              placeholder="FAC" style={{ width: 120 }} />
            <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 4 }}>Ej: FAC-0001, NV-0001</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group"><label>Resolución DIAN</label>
              <input type="text" value={config.factura_resolucion} onChange={e => setConfig(prev => ({ ...prev, factura_resolucion: e.target.value }))}
                placeholder="N° 18764000012345" style={{ width: '100%' }} />
            </div>
            <div className="form-group"><label>Rango desde</label>
              <input type="number" value={config.factura_rango_desde} onChange={e => setConfig(prev => ({ ...prev, factura_rango_desde: e.target.value }))}
                placeholder="1" style={{ width: '100%' }} />
            </div>
            <div className="form-group"><label>Rango hasta</label>
              <input type="number" value={config.factura_rango_hasta} onChange={e => setConfig(prev => ({ ...prev, factura_rango_hasta: e.target.value }))}
                placeholder="5000" style={{ width: '100%' }} />
            </div>
          </div>
          <div className="form-group"><label>Vigencia</label>
            <input type="text" value={config.factura_vigencia} onChange={e => setConfig(prev => ({ ...prev, factura_vigencia: e.target.value }))}
              placeholder="2027-12-31" style={{ width: 120 }} />
          </div>
          <div className="form-group"><label>Términos y condiciones</label>
            <textarea value={config.factura_terminos} onChange={e => setConfig(prev => ({ ...prev, factura_terminos: e.target.value }))}
              placeholder="Pago a 30 días. 2% descuento por pronto pago..." rows={3}></textarea>
          </div>
          <div className="form-group"><label>Pie de página legal</label>
            <input type="text" value={config.factura_pie_legal} onChange={e => setConfig(prev => ({ ...prev, factura_pie_legal: e.target.value }))}
              placeholder="Documento generado por sistema..." style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header">
          <span className="table-header-title">Datos Bancarios</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Solo se muestran en facturas con método Transferencia</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group"><label>Banco</label>
              <input type="text" value={config.empresa_banco} onChange={e => setConfig(prev => ({ ...prev, empresa_banco: e.target.value }))}
                placeholder="Bancolombia" style={{ width: '100%' }} />
            </div>
            <div className="form-group"><label>Tipo de cuenta</label>
              <input type="text" value={config.empresa_tipo_cuenta} onChange={e => setConfig(prev => ({ ...prev, empresa_tipo_cuenta: e.target.value }))}
                placeholder="Ahorros / Corriente" style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group"><label>Número de cuenta</label>
              <input type="text" value={config.empresa_numero_cuenta} onChange={e => setConfig(prev => ({ ...prev, empresa_numero_cuenta: e.target.value }))}
                placeholder="123-456789-00" style={{ width: '100%' }} />
            </div>
            <div className="form-group"><label>Titular de la cuenta</label>
              <input type="text" value={config.empresa_titular_cuenta} onChange={e => setConfig(prev => ({ ...prev, empresa_titular_cuenta: e.target.value }))}
                placeholder="GestiónNovedades SAS" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="table-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <div className="table-header">
          <span className="table-header-title">LucidSales</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Integración con panel.lucidsales.co</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div
              onClick={() => setConfig(prev => ({ ...prev, lucidsales_activo: !prev.lucidsales_activo }))}
              style={{
                width: 48, height: 26, borderRadius: 13,
                background: config.lucidsales_activo ? 'var(--green)' : 'var(--bg3)',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer'
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: config.lucidsales_activo ? 24 : 2,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
            <span style={{ fontSize: 14 }}>Activar integración con LucidSales</span>
          </label>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 60, marginTop: -8 }}>
            Habilita la sincronización de pedidos desde LucidSales hacia esta plataforma.
          </p>

          <div className="form-group">
            <label>Email de LucidSales</label>
            <input type="email" value={config.lucidsales_email}
              onChange={e => setConfig(prev => ({ ...prev, lucidsales_email: e.target.value }))}
              placeholder="tu@email.com (el mismo del login de panel.lucidsales.co)"
              style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={config.lucidsales_password}
                onChange={e => setConfig(prev => ({ ...prev, lucidsales_password: e.target.value }))}
                placeholder="Contraseña de LucidSales"
                style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>ID de Tienda</label>
              <input type="number" value={config.lucidsales_shop_id}
                onChange={e => setConfig(prev => ({ ...prev, lucidsales_shop_id: e.target.value }))}
                placeholder="Ej: 3682"
                style={{ width: '100%' }} />
            </div>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 4 }}>
            El ID de la tienda se obtiene del <code style={{ background: 'var(--bg3)', padding: '1px 4px', borderRadius: 3 }}>idEmpresa</code> en la respuesta del login. 
            Es la tienda que quedará activa para gestionar pedidos.
          </p>
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