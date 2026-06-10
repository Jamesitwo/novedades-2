'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { StatsSkeleton, TableSkeleton } from '@/components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = {
  amber: '#f59e0b',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  purple: '#a855f7',
  teal: '#14b8a6',
  accent: '#6366f1',
  accent2: '#818cf8'
};

const ESTADO_COLORS = {
  novedad: COLORS.amber,
  contactado: COLORS.blue,
  solucionado: COLORS.green,
  cancelado: COLORS.red,
  devolucion: COLORS.purple
};

const ESTADO_LABELS = {
  novedad: 'Novedad',
  contactado: 'Contactado',
  solucionado: 'Solucionado',
  cancelado: 'Cancelado',
  devolucion: 'Devolución'
};

export default function DashboardPage() {
  const { usuario } = useAuthStore();
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [chartDays, setChartDays] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, vencRes, chartRes] = await Promise.all([
          api.get(`/api/dashboard/resumen?periodo=${periodo}`),
          api.get('/api/oficina/vencimientos'),
          api.get(`/api/dashboard/chart?dias=${chartDays}`)
        ]);
        setData({ ...dashRes.data, vencimientos: vencRes.data });
        setChartData(chartRes.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [periodo, chartDays]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Dashboard</h2>
        </div>
        <StatsSkeleton />
        <div className="table-card" style={{ marginTop: 24 }}>
          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    );
  }

  const { novedades, oficina, estadisticas, rankingTransportadoras, actividadReciente, vencimientos } = data || {};
  const { chartData: dailyData, estadoDistribution } = chartData || {};

  const pieData = estadoDistribution
    ? Object.entries(estadoDistribution)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: ESTADO_LABELS[k] || k, value: v, color: ESTADO_COLORS[k] || COLORS.teal }))
    : [];

  const barDataNovedades = dailyData
    ? dailyData.filter(d => d.novedades_total > 0 || d.novedades_solucionado > 0).slice(-30)
    : [];

  const barDataOficina = dailyData
    ? dailyData.filter(d => d.oficina_total > 0 || d.oficina_va_recoger > 0).slice(-30)
    : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px', fontSize: 12
        }}>
          <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{formatDate(label)}</div>
          {payload.map((p, i) => (
            <div key={i} style={{ color: p.color, fontFamily: 'var(--mono)' }}>
              {p.name}: <strong>{p.value}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['hoy', 'semana', 'mes', 'todos'].map(p => (
            <button
              key={p}
              onClick={() => { setPeriodo(p); setChartDays(p === 'hoy' ? 1 : p === 'semana' ? 7 : p === 'mes' ? 30 : 90); }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: '1px solid var(--border)',
                background: periodo === p ? 'var(--accent)' : 'var(--bg3)',
                color: periodo === p ? '#fff' : 'var(--text2)', transition: 'all 0.15s'
              }}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card c-amber">
          <div className="stat-label">Total Valor</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--mono)', marginTop: 8 }}>
            {formatMoney(estadisticas?.totalDinero || 0)}
          </div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-label">Recuperado</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--mono)', marginTop: 8 }}>
            {formatMoney(estadisticas?.dineroSolucionado || 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{estadisticas?.porcentajeRecuperado || 0}%</div>
        </div>
        <div className="stat-card c-red">
          <div className="stat-label">Perdido</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--red)', fontFamily: 'var(--mono)', marginTop: 8 }}>
            {formatMoney(estadisticas?.dineroCancelado || 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{estadisticas?.porcentajePerdido || 0}%</div>
        </div>
      </div>

      {vencimientos && vencimientos.length > 0 && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <span className="alert-icon">⚠</span>
          <span className="alert-text">
            <strong>{vencimientos.length} paquete{vencimientos.length !== 1 ? 's' : ''}</strong> por vencer en 3 días
          </span>
          <Link href="/oficina" style={{ marginLeft: 'auto', color: 'var(--accent2)', fontSize: 12 }}>Ver oficina →</Link>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Novedades por Día</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {barDataNovedades.length > 0 ? `${barDataNovedades[0]?.fecha} — ${barDataNovedades[barDataNovedades.length - 1]?.fecha}` : 'Sin datos'}
            </span>
          </div>
          <div style={{ padding: '16px 8px 4px 0' }}>
            {barDataNovedades.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barDataNovedades}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="novedades_total" name="Creadas" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="novedades_solucionado" name="Solucionadas" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos de novedades para este período</div>
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Distribución de Estados</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Novedades</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: 'var(--text2)', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos de estados</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Oficina por Día</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {barDataOficina.length > 0 ? `${barDataOficina[0]?.fecha} — ${barDataOficina[barDataOficina.length - 1]?.fecha}` : 'Sin datos'}
            </span>
          </div>
          <div style={{ padding: '16px 8px 4px 0' }}>
            {barDataOficina.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barDataOficina}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="oficina_total" name="Creados" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="oficina_va_recoger" name="Recogidos" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos de oficina para este período</div>
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Resumen Novedades</span>
          </div>
          <div className="stats-grid" style={{ padding: '8px 0', marginBottom: 0 }}>
            <div style={{ padding: '20px 16px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{novedades?.novedad || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Novedad</div>
            </div>
            <div style={{ padding: '20px 16px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>{novedades?.contactado || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Contactado</div>
            </div>
            <div style={{ padding: '20px 16px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{novedades?.solucionado || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Solucionado</div>
            </div>
            <div style={{ padding: '20px 16px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--red)', fontFamily: 'var(--mono)' }}>{novedades?.cancelado || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Cancelado</div>
            </div>
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--purple)', fontFamily: 'var(--mono)' }}>{novedades?.devolucion || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Devolución</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Transportadoras</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Transportadora</th>
                <th style={{ textAlign: 'center' }}>Cantidad</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {rankingTransportadoras?.map((t, i) => (
                <tr key={t.transportadora}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: i === 0 ? 'var(--amber)' : 'var(--bg4)',
                        color: i === 0 ? '#000' : 'var(--text3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600
                      }}>{i + 1}</span>
                      <span className="td-name">{t.transportadora}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.total}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green)' }}>{formatMoney(t.dinero)}</td>
                </tr>
              ))}
              {(!rankingTransportadoras || rankingTransportadoras.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 20 }}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Actividad Reciente</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {actividadReciente && actividadReciente.length > 0 ? (
              actividadReciente.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: i < actividadReciente.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{a.texto}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.hace}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 20 }}>Sin actividad reciente</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Resumen Oficina</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text2)' }}>Pendientes llamar</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--amber)' }}>{oficina?.pendiente_llamar || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text2)' }}>Contactados</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent2)' }}>{oficina?.contactado || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text2)' }}>Van a recoger</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)' }}>{oficina?.va_a_recoger || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text2)' }}>No van a recoger</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--red)' }}>{oficina?.no_va_a_recoger || 0}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>Total</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{oficina?.total || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Accesos Rápidos</span>
          </div>
          <div style={{ padding: 16 }}>
            <div className="grid-auto" style={{ gap: 12 }}>
              <Link href="/novedades" style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s', textDecoration: 'none'
              }}>
                <span style={{ fontSize: 24 }}>⚠</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Novedades</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{novedades?.novedad || 0} activas</span>
              </Link>
              <Link href="/oficina" style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s', textDecoration: 'none'
              }}>
                <span style={{ fontSize: 24 }}>📦</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>En Oficina</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{oficina?.pendiente_llamar || 0} pendientes</span>
              </Link>
              <Link href="/novedades/nueva" style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s', textDecoration: 'none'
              }}>
                <span style={{ fontSize: 24 }}>➕</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Nueva</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Novedad</span>
              </Link>
              {usuario?.rol === 'admin' ? (
                <Link href="/dashboard/metricas" style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 16,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s', textDecoration: 'none'
                }}>
                  <span style={{ fontSize: 24 }}>📊</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Métricas</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Admin</span>
                </Link>
              ) : (
                <Link href="/oficina/nueva" style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 16,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s', textDecoration: 'none'
                }}>
                  <span style={{ fontSize: 24 }}>🏢</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Nuevo</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Oficina</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
