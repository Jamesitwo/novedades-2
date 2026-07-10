'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CHART_COLORS = ['#f59e0b', '#6366f1', '#14b8a6', '#22c55e', '#a855f7', '#ef4444', '#3b82f6', '#ec4899'];

const COL_INFO = {
  'Asignados': 'Novedades + Oficina asignadas al operador',
  'Resueltos': 'Novedades solucionadas + Oficina entregadas (va_a_recoger)',
  'Tasa': '(Resueltos ÷ Asignados) × 100. Combina novedades y oficina.',
  'Intentos': 'Llamadas y mensajes registrados (IntentoContacto)',
  'Contactos': 'Intentos con resultado "contactado" (cliente respondió)',
  'Transf.': 'Transferencias enviadas (ámbar) / recibidas (azul) entre operadores',
  'Creados': 'Registros creados por el operador (novedades + oficina)',
  'Dinero': 'Suma de totalAPagar solucionado + precio oficina recogida',
  'Prom. Res.': 'Tiempo promedio (horas) entre creación y resolución de novedades y oficina',
  'Tiempo Act.': 'Minutos acumulados de actividad en la plataforma (heartbeat cada 60s)',
};

const InfoBadge = ({ label }) => (
  <span title={COL_INFO[label]} style={{
    cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 15, height: 15, borderRadius: '50%', fontSize: 10, fontWeight: 600,
    background: 'var(--bg4)', color: 'var(--text3)', marginLeft: 3, flexShrink: 0
  }}>?</span>
);

const SplitBadge = ({ n, o, nLabel, oLabel }) => (
  <span style={{ fontSize: 10, color: 'var(--text3)', display: 'block', lineHeight: 1.4 }}>
    {nLabel || 'N'}:{n || 0} {oLabel || 'O'}:{o || 0}
  </span>
);

export default function MetricasPage() {
  const searchParams = useSearchParams();
  const [metricas, setMetricas] = useState(null);
  const [tiempoActivo, setTiempoActivo] = useState(null);
  const [resumenDiario, setResumenDiario] = useState(null);
  const [metricasLucidsales, setMetricasLucidsales] = useState(null);
  const [pedidosSubidos, setPedidosSubidos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tab, setTab] = useState('rendimiento');
  const [sortField, setSortField] = useState('totalResueltos');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedDay, setExpandedDay] = useState(null);

  const isCustomRange = fechaDesde && fechaHasta;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = isCustomRange
          ? `fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`
          : `periodo=${periodo}`;

        const promises = [
          api.get(`/api/dashboard/metricas-operadores?${params}`),
          api.get(`/api/dashboard/tiempo-activo?${params}`)
        ];

        if (isCustomRange) {
          promises.push(api.get(`/api/dashboard/resumen-diario?${params}`));
        }

        const results = await Promise.all(promises);
        setMetricas(results[0].data);
        setTiempoActivo(results[1].data);
        setResumenDiario(isCustomRange ? results[2].data : null);
      } catch (error) {
        console.error('Error fetching metricas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    api.get(`/api/dashboard/metricas-lucidsales?${isCustomRange ? `fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}` : `periodo=${periodo}`}`)
      .then(({ data }) => setMetricasLucidsales(data))
      .catch(() => {});
    api.get(`/api/dashboard/pedidos-subidos?${isCustomRange ? `fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}` : `periodo=${periodo}`}`)
      .then(({ data }) => setPedidosSubidos(data))
      .catch(() => {});
  }, [periodo, fechaDesde, fechaHasta, isCustomRange]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) setTab(tabParam);
  }, []);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedMetricas = metricas ? [...metricas].sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1;
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return aVal > bVal ? dir : aVal < bVal ? -dir : 0;
  }) : [];

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  if (loading) {
    return (
      <div className="content">
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Métricas</h2>
        <div className="table-card"><TableSkeleton rows={5} columns={5} /></div>
      </div>
    );
  }

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Métricas</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isCustomRange && ['hoy', 'semana', 'mes', 'todos'].map(p => (
            <button
              key={p}
              onClick={() => { setPeriodo(p); setFechaDesde(''); setFechaHasta(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid var(--border)',
                background: periodo === p ? 'var(--accent)' : 'var(--bg3)',
                color: periodo === p ? '#fff' : 'var(--text2)',
                transition: 'all 0.15s'
              }}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Todo'}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPeriodo(''); }}
              style={{
                background: isCustomRange ? 'var(--accent)' : 'var(--bg3)',
                border: `1px solid ${isCustomRange ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 20, padding: '6px 12px', fontSize: 12, color: isCustomRange ? '#fff' : 'var(--text2)',
                outline: 'none', cursor: 'pointer', fontFamily: 'var(--mono)'
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>→</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPeriodo(''); }}
              style={{
                background: isCustomRange ? 'var(--accent)' : 'var(--bg3)',
                border: `1px solid ${isCustomRange ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 20, padding: '6px 12px', fontSize: 12, color: isCustomRange ? '#fff' : 'var(--text2)',
                outline: 'none', cursor: 'pointer', fontFamily: 'var(--mono)'
              }}
            />
            {isCustomRange && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); setPeriodo('mes'); }}
                style={{
                  padding: '6px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)'
                }}
              >✕</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg3)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        <button
          onClick={() => setTab('rendimiento')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'rendimiento' ? 'var(--accent)' : 'transparent',
            color: tab === 'rendimiento' ? '#fff' : 'var(--text2)',
            transition: 'all 0.15s'
          }}
        >
          Rendimiento
        </button>
        <button
          onClick={() => setTab('tiempo')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'tiempo' ? 'var(--accent)' : 'transparent',
            color: tab === 'tiempo' ? '#fff' : 'var(--text2)',
            transition: 'all 0.15s'
          }}
        >
          Tiempo Activo
        </button>
        <button
          onClick={() => setTab('diario')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'diario' ? 'var(--accent)' : 'transparent',
            color: tab === 'diario' ? '#fff' : 'var(--text2)',
            transition: 'all 0.15s'
          }}
        >
          Resumen Diario
        </button>
        <button
          onClick={() => setTab('pedidos')}
          style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            border: 'none', background: tab === 'pedidos' ? 'var(--accent)' : 'transparent',
            color: tab === 'pedidos' ? '#fff' : 'var(--text2)', transition: 'all 0.15s'
          }}
        >
          Pedidos
        </button>
        <button
          onClick={() => setTab('lucidsales')}
          style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            border: 'none', background: tab === 'lucidsales' ? 'var(--accent)' : 'transparent',
            color: tab === 'lucidsales' ? '#fff' : 'var(--text2)', transition: 'all 0.15s'
          }}
        >
          LucidSales
        </button>
      </div>

      {tab === 'rendimiento' && (
        <>
          {sortedMetricas.length > 0 && (
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="table-card">
                <div className="table-header">
                  <span className="table-header-title">Total Resueltos por Operador</span>
                </div>
                <div style={{ padding: '12px 8px 4px 0' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sortedMetricas} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                      <YAxis type="category" dataKey="operador" tick={{ fontSize: 11, fill: 'var(--text2)' }} width={100} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg2)', border: '1px solid var(--border)',
                          borderRadius: 8, fontSize: 12
                        }}
                      />
                      <Bar dataKey="totalResueltos" name="Resueltos" radius={[0, 4, 4, 0]}>
                        {sortedMetricas.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="table-card">
                <div className="table-header">
                  <span className="table-header-title">Tasa de Resolución</span>
                </div>
                <div style={{ padding: '12px 8px 4px 0' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sortedMetricas} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} domain={[0, 100]} />
                      <YAxis type="category" dataKey="operador" tick={{ fontSize: 11, fill: 'var(--text2)' }} width={100} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg2)', border: '1px solid var(--border)',
                          borderRadius: 8, fontSize: 12
                        }}
                        formatter={(value) => [`${value}%`, 'Tasa']}
                      />
                      <Bar dataKey="tasaResolucion" name="Tasa %" radius={[0, 4, 4, 0]}>
                        {sortedMetricas.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Rendimiento por Operador</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>
              {isCustomRange ? `${fechaDesde} → ${fechaHasta}` : `Período: ${periodo}`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('operador')} style={{ cursor: 'pointer' }}>
                    Operador <SortIcon field="operador" />
                  </th>
                  <th onClick={() => handleSort('totalAsignados')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Asignados <InfoBadge label="Asignados" /> <SortIcon field="totalAsignados" />
                  </th>
                  <th onClick={() => handleSort('totalResueltos')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Resueltos <InfoBadge label="Resueltos" /> <SortIcon field="totalResueltos" />
                  </th>
                  <th onClick={() => handleSort('tasaResolucion')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Tasa <InfoBadge label="Tasa" /> <SortIcon field="tasaResolucion" />
                  </th>
                  <th onClick={() => handleSort('intentosContacto')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Intentos <InfoBadge label="Intentos" /> <SortIcon field="intentosContacto" />
                  </th>
                  <th onClick={() => handleSort('contactosExitosos')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Contactos <InfoBadge label="Contactos" /> <SortIcon field="contactosExitosos" />
                  </th>
                  <th onClick={() => handleSort('transferenciasEnviadas')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Transf. <InfoBadge label="Transf." /> <SortIcon field="transferenciasEnviadas" />
                  </th>
                  <th onClick={() => handleSort('registrosCreados')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Creados <InfoBadge label="Creados" /> <SortIcon field="registrosCreados" />
                  </th>
                  <th onClick={() => handleSort('dineroManejado')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Dinero <InfoBadge label="Dinero" /> <SortIcon field="dineroManejado" />
                  </th>
                  <th onClick={() => handleSort('promedioResolucionHoras')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Prom. Res. <InfoBadge label="Prom. Res." /> <SortIcon field="promedioResolucionHoras" />
                  </th>
                  <th onClick={() => handleSort('tiempoActivoMinutos')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Tiempo Act. <InfoBadge label="Tiempo Act." /> <SortIcon field="tiempoActivoMinutos" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMetricas.map((m, i) => (
                  <tr key={m.operadorId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: i === 0 ? 'var(--amber)' : i === 1 ? 'var(--accent2)' : i === 2 ? 'var(--accent)' : 'var(--bg4)',
                          color: i < 3 ? '#000' : 'var(--text3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 600, flexShrink: 0
                        }}>{i + 1}</span>
                        <div>
                          <span className="td-name">{m.operador}</span>
                          <span style={{ fontSize: 10, color: 'var(--text3)', display: 'block', textTransform: 'capitalize' }}>{m.rol}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
                      {m.totalAsignados}
                      <SplitBadge n={m.novedadesAsignadas} o={m.oficinaAsignadas} />
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)' }}>
                      {m.totalResueltos}
                      <SplitBadge n={m.novedadesResueltas} o={m.oficinaRecogidas} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        background: m.tasaResolucion >= 80 ? 'rgba(34,197,94,0.15)' : m.tasaResolucion >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: m.tasaResolucion >= 80 ? 'var(--green)' : m.tasaResolucion >= 50 ? 'var(--amber)' : 'var(--red)'
                      }}>
                        {m.tasaResolucion}%
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{m.intentosContacto}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: m.contactosExitosos > 0 ? 'var(--green)' : 'var(--text3)' }}>
                      {m.contactosExitosos}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12 }}>
                      <span style={{ color: 'var(--amber)' }}>{m.transferenciasEnviadas}</span>
                      <span style={{ color: 'var(--text3)' }}> / </span>
                      <span style={{ color: 'var(--accent2)' }}>{m.transferenciasRecibidas}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
                      {m.registrosCreados}
                      <SplitBadge n={m.registrosNovedadCreados} o={m.registrosOficinaCreados} />
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green)' }}>
                      {formatMoney(m.dineroManejado)}
                      <SplitBadge n={formatMoney(m.dineroNovedad || 0)} o={formatMoney(m.dineroOficina || 0)} nLabel="" oLabel="" />
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {m.promedioResolucionHoras > 0 ? `${m.promedioResolucionHoras}h` : '-'}
                      <SplitBadge n={m.promResNovedadHoras ? `${m.promResNovedadHoras}h` : '-'} o={m.promResOficinaHoras ? `${m.promResOficinaHoras}h` : '-'} nLabel="" oLabel="" />
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent2)' }}>
                      {Math.floor(m.tiempoActivoMinutos / 60)}h {m.tiempoActivoMinutos % 60}m
                    </td>
                  </tr>
                ))}
                {sortedMetricas.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text3)', padding: 20 }}>Sin datos para este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {tab === 'tiempo' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            {tiempoActivo && tiempoActivo.map((t) => (
              <div key={t.usuarioId} className="table-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--bg4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 600, color: 'var(--accent)'
                  }}>
                    {t.usuario.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.usuario}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>{t.rol}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>
                      {t.horas}<span style={{ fontSize: 16, fontWeight: 400 }}>h</span> {t.minutos}<span style={{ fontSize: 16, fontWeight: 400 }}>m</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Tiempo activo total</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text3)' }}>
                    <div>{t.sesiones} sesión{t.sesiones !== 1 ? 'es' : ''}</div>
                    {t.ultimaActividad && (
                      <div style={{ marginTop: 2 }}>
                        Última: {new Date(t.ultimaActividad).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{
                  marginTop: 12,
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--bg4)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 2,
                    background: `linear-gradient(90deg, var(--accent), var(--green))`,
                    width: `${Math.min(100, (t.minutosActivos / 480) * 100)}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            ))}
          </div>
          {tiempoActivo && tiempoActivo.length > 0 && (
            <div className="table-card">
              <div className="table-header">
                <span className="table-header-title">Resumen Tiempo Activo</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th style={{ textAlign: 'center' }}>Sesiones</th>
                    <th style={{ textAlign: 'center' }}>Minutos</th>
                    <th style={{ textAlign: 'center' }}>Horas</th>
                    <th style={{ textAlign: 'center' }}>Última Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {tiempoActivo.map((t) => (
                    <tr key={t.usuarioId}>
                      <td><span className="td-name">{t.usuario}</span></td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.sesiones}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.minutosActivos}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent2)' }}>
                        {t.horas}h {t.minutos}m
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                        {t.ultimaActividad ? new Date(t.ultimaActividad).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(!tiempoActivo || tiempoActivo.length === 0) && (
            <div className="table-card">
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                Sin datos de tiempo activo para este período
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'diario' && (
        <>
          {!isCustomRange ? (
            <div className="table-card">
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Selecciona un rango de fechas</div>
                <div style={{ fontSize: 12 }}>Usa los campos de fecha arriba para ver el resumen diario</div>
              </div>
            </div>
          ) : resumenDiario ? (
            <>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="stat-card c-blue">
                  <div className="stat-label">Novedades Creadas</div>
                  <div className="stat-value blue">{resumenDiario.totales.novedadesCreadas}</div>
                </div>
                <div className="stat-card c-green">
                  <div className="stat-label">Novedades Resueltas</div>
                  <div className="stat-value green">{resumenDiario.totales.novedadesResueltas}</div>
                </div>
                <div className="stat-card c-purple">
                  <div className="stat-label">Oficina Creados</div>
                  <div className="stat-value purple">{resumenDiario.totales.oficinaCreadas}</div>
                </div>
                <div className="stat-card c-amber">
                  <div className="stat-label">Oficina Resueltos</div>
                  <div className="stat-value amber">{resumenDiario.totales.oficinaResueltas}</div>
                </div>
                <div className="stat-card c-red">
                  <div className="stat-label">Pendientes Novedades</div>
                  <div className="stat-value red">{resumenDiario.totales.novedadesPendientes}</div>
                </div>
                <div className="stat-card c-teal">
                  <div className="stat-label">Tasa Resolución Novedades</div>
                  <div className="stat-value teal">{resumenDiario.totales.tasaNovedades}%</div>
                </div>
              </div>

              <div className="table-card" style={{ marginBottom: 16 }}>
                <div className="table-header">
                  <span className="table-header-title">Resumen Diario · {resumenDiario.rango.desde} → {resumenDiario.rango.hasta}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 110 }}>Fecha</th>
                        <th style={{ textAlign: 'center' }}>Creados</th>
                        <th style={{ textAlign: 'center' }}>Resueltos</th>
                        <th style={{ textAlign: 'center' }}>Pendientes</th>
                        <th style={{ textAlign: 'center' }}>Tasa</th>
                        <th style={{ textAlign: 'left' }}>Operadores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenDiario.diario.map((d) => {
                        const totalCreados = d.novedadesCreadas + d.oficinaCreadas;
                        const totalResueltos = d.novedadesResueltas + d.oficinaResueltas;
                        const pendientes = totalCreados - totalResueltos;
                        const tasa = totalCreados > 0 ? Math.round((totalResueltos / totalCreados) * 100) : 0;
                        const isExpanded = expandedDay === d.fecha;

                        return (
                          <React.Fragment key={d.fecha}>
                            <tr
                              onClick={() => setExpandedDay(isExpanded ? null : d.fecha)}
                              style={{ cursor: 'pointer', background: isExpanded ? 'var(--bg3)' : 'transparent' }}
                            >
                              <td>
                                <div className="td-name">{new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                              </td>
                              <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
                                {totalCreados > 0 ? totalCreados : '-'}
                              </td>
                              <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600, color: totalResueltos > 0 ? 'var(--green)' : 'var(--text3)' }}>
                                {totalResueltos > 0 ? totalResueltos : '-'}
                              </td>
                              <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: pendientes > 0 ? 'var(--red)' : 'var(--green)' }}>
                                {pendientes > 0 ? pendientes : '0'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                  background: tasa >= 80 ? 'rgba(34,197,94,0.15)' : tasa >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: tasa >= 80 ? 'var(--green)' : tasa >= 50 ? 'var(--amber)' : 'var(--red)'
                                }}>
                                  {tasa}%
                                </span>
                              </td>
                              <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                                {d.operadores.map(op => op.operador).join(', ') || '-'}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} style={{ padding: '0 16px 12px 16px', background: 'var(--bg3)' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {d.operadores.length === 0 ? (
                                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sin casos resueltos este día</span>
                                    ) : (
                                      d.operadores.map((op, i) => (
                                        <div key={i}>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                                            {op.operador} → {op.novedadesResueltas + op.oficinaResueltas} resueltos
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            {op.casos.map((c, j) => (
                                              <div key={j} style={{
                                                display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
                                                padding: '4px 8px', borderRadius: 6, background: 'var(--bg2)'
                                              }}>
                                                <span>{c.tipo === 'novedad' ? '⚠' : '📦'}</span>
                                                <span style={{ fontWeight: 500 }}>{c.cliente}</span>
                                                <span style={{ color: 'var(--text3)' }}>·</span>
                                                <span style={{ color: 'var(--text3)' }}>{c.producto}</span>
                                                <span style={{ color: 'var(--text3)' }}>·</span>
                                                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)' }}>{c.guia}</span>
                                                <span style={{ marginLeft: 'auto', fontWeight: 500, color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                                                  {formatMoney(c.valor)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {resumenDiario.diario.length > 0 && (
                <div className="table-card">
                  <div className="table-header">
                    <span className="table-header-title">Gráfico Diario</span>
                  </div>
                  <div style={{ padding: '12px 8px 4px 0' }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={resumenDiario.diario} margin={{ left: 0, right: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="fecha"
                          tick={{ fontSize: 10, fill: 'var(--text3)' }}
                          tickFormatter={(v) => {
                            const d = new Date(v + 'T12:00:00');
                            return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                          }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                            borderRadius: 8, fontSize: 12
                          }}
                        />
                        <Bar dataKey="novedadesCreadas" name="Novedades" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="oficinaCreadas" name="Oficina" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="novedadesResueltas" name="Resueltas N." stackId="b" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="oficinaResueltas" name="Resueltas O." stackId="b" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="table-card">
              <TableSkeleton rows={5} columns={5} />
            </div>
          )}
        </>
      )}

      {tab === 'pedidos' && (
        <>
          {pedidosSubidos ? (
            <>
              <div className="grid-3" style={{ marginBottom: 16 }}>
                <div className="stat-card" style={{ borderLeft: '3px solid var(--accent2)' }}>
                  <div className="stat-label">Pedidos Subidos</div>
                  <div className="stat-value" style={{ color: 'var(--accent2)' }}>{pedidosSubidos.totalPedidos}</div>
                </div>
                <div className="stat-card" style={{ borderLeft: '3px solid var(--amber)' }}>
                  <div className="stat-label">Se volvieron Novedad</div>
                  <div className="stat-value" style={{ color: 'var(--amber)' }}>{pedidosSubidos.totalNovedades}</div>
                </div>
                <div className="stat-card" style={{ borderLeft: '3px solid var(--red)' }}>
                  <div className="stat-label">Devoluciones</div>
                  <div className="stat-value" style={{ color: 'var(--red)' }}>{pedidosSubidos.totalDevoluciones}</div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="table-card">
                  <div className="table-header">
                    <span className="table-header-title">Pedidos por Asesor</span>
                  </div>
                  <div style={{ padding: '12px 8px 4px 0' }}>
                    {pedidosSubidos.operadores?.some(o => o.pedidosSubidos > 0) ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={pedidosSubidos.operadores.filter(o => o.pedidosSubidos > 0)} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                          <YAxis type="category" dataKey="operador" tick={{ fontSize: 11, fill: 'var(--text2)' }} width={100} />
                          <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="pedidosSubidos" name="Subidos" fill="#818cf8" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin pedidos en este período</div>
                    )}
                  </div>
                </div>
                <div className="table-card">
                  <div className="table-header">
                    <span className="table-header-title">Novedades vs Devoluciones</span>
                  </div>
                  <div style={{ padding: '12px 8px 4px 0' }}>
                    {pedidosSubidos.operadores?.some(o => o.novedadesCreadas > 0 || o.devoluciones > 0) ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={pedidosSubidos.operadores.filter(o => o.novedadesCreadas > 0 || o.devoluciones > 0)} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                          <YAxis type="category" dataKey="operador" tick={{ fontSize: 11, fill: 'var(--text2)' }} width={100} />
                          <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="novedadesCreadas" name="Novedades" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                          <Bar dataKey="devoluciones" name="Devoluciones" fill="#ef4444" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos en este período</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="table-card">
                <div className="table-header">
                  <span className="table-header-title">Detalle por Asesor</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {isCustomRange ? `${fechaDesde} → ${fechaHasta}` : `Período: ${periodo}`}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Asesor</th>
                        <th style={{ textAlign: 'center' }}>Pedidos Subidos</th>
                        <th style={{ textAlign: 'center' }}>Novedades</th>
                        <th style={{ textAlign: 'center' }}>Devoluciones</th>
                        <th style={{ textAlign: 'center' }}>Tasa Novedad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosSubidos.operadores?.length > 0 ? pedidosSubidos.operadores.map((m, i) => (
                        <tr key={m.operadorId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, color: i < 3 ? 'var(--accent2)' : 'var(--text3)', fontWeight: 600 }}>{i + 1}</span>
                              <span className="td-name">{m.operador}</span>
                              <span style={{ fontSize: 10, color: 'var(--text3)' }}>({m.rol})</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent2)' }}>{m.pedidosSubidos}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: m.novedadesCreadas > 0 ? 'var(--amber)' : 'var(--text2)' }}>{m.novedadesCreadas}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: m.devoluciones > 0 ? 'var(--red)' : 'var(--text2)' }}>{m.devoluciones}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
                            {m.pedidosSubidos > 0 ? `${Math.round((m.novedadesCreadas / m.pedidosSubidos) * 100)}%` : '-'}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>Sin datos en este período</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="table-card">
              <TableSkeleton rows={5} columns={5} />
            </div>
          )}
        </>
      )}

      {tab === 'lucidsales' && (
        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Vinculaciones LucidSales</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {isCustomRange ? `${fechaDesde} → ${fechaHasta}` : `Período: ${periodo}`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Operador</th>
                  <th style={{ textAlign: 'center' }}>Creados</th>
                  <th style={{ textAlign: 'center' }}>Asignados</th>
                </tr>
              </thead>
              <tbody>
                {metricasLucidsales && metricasLucidsales.length > 0 ? metricasLucidsales.map((m, i) => (
                  <tr key={m.operadorId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: i < 3 ? 'var(--accent)' : 'var(--text3)', fontWeight: 600 }}>{i + 1}</span>
                        <span className="td-name">{m.operador}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>{m.vinculadosCreados}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{m.vinculadosAsignados}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>Sin datos en este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
