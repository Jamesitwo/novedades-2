'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CHART_COLORS = ['#f59e0b', '#6366f1', '#14b8a6', '#22c55e', '#a855f7', '#ef4444', '#3b82f6', '#ec4899'];

export default function MetricasPage() {
  const [metricas, setMetricas] = useState(null);
  const [tiempoActivo, setTiempoActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [tab, setTab] = useState('rendimiento');
  const [sortField, setSortField] = useState('totalResueltos');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [metRes, tempRes] = await Promise.all([
          api.get(`/api/dashboard/metricas-operadores?periodo=${periodo}`),
          api.get(`/api/dashboard/tiempo-activo?periodo=${periodo}`)
        ]);
        setMetricas(metRes.data);
        setTiempoActivo(tempRes.data);
      } catch (error) {
        console.error('Error fetching metricas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [periodo]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Métricas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['hoy', 'semana', 'mes', 'todos'].map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
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
            <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>Período: {periodo}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('operador')} style={{ cursor: 'pointer' }}>
                    Operador <SortIcon field="operador" />
                  </th>
                  <th onClick={() => handleSort('totalAsignados')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Asignados <SortIcon field="totalAsignados" />
                  </th>
                  <th onClick={() => handleSort('totalResueltos')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Resueltos <SortIcon field="totalResueltos" />
                  </th>
                  <th onClick={() => handleSort('tasaResolucion')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Tasa <SortIcon field="tasaResolucion" />
                  </th>
                  <th onClick={() => handleSort('intentosContacto')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Intentos <SortIcon field="intentosContacto" />
                  </th>
                  <th onClick={() => handleSort('contactosExitosos')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Contactos <SortIcon field="contactosExitosos" />
                  </th>
                  <th onClick={() => handleSort('transferenciasEnviadas')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Transf. <SortIcon field="transferenciasEnviadas" />
                  </th>
                  <th onClick={() => handleSort('registrosCreados')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Creados <SortIcon field="registrosCreados" />
                  </th>
                  <th onClick={() => handleSort('dineroManejado')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Dinero <SortIcon field="dineroManejado" />
                  </th>
                  <th onClick={() => handleSort('promedioResolucionHoras')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Prom. Res. <SortIcon field="promedioResolucionHoras" />
                  </th>
                  <th onClick={() => handleSort('tiempoActivoMinutos')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    Tiempo Act. <SortIcon field="tiempoActivoMinutos" />
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
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{m.totalAsignados}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)' }}>{m.totalResueltos}</td>
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
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{m.registrosCreados}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green)' }}>
                      {formatMoney(m.dineroManejado)}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {m.promedioResolucionHoras > 0 ? `${m.promedioResolucionHoras}h` : '-'}
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
    </div>
  );
}
