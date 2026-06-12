'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { StatsSkeleton, TableSkeleton } from '@/components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = {
  amber: '#f59e0b', blue: '#3b82f6', green: '#22c55e',
  red: '#ef4444', purple: '#a855f7', teal: '#14b8a6',
  accent: '#6366f1', accent2: '#818cf8'
};

const ESTADO_COLORS = {
  novedad: COLORS.amber, contactado: COLORS.blue,
  solucionado: COLORS.green, cancelado: COLORS.red, devolucion: COLORS.purple
};

const ESTADO_LABELS = {
  novedad: 'Novedad', contactado: 'Contactado',
  solucionado: 'Solucionado', cancelado: 'Cancelado', devolucion: 'Devolución'
};

const ESTADOS_OFICINA_LABELS = {
  pendiente_llamar: 'Pend. llamar',
  contactado: 'Contactados',
  va_a_recoger: 'Van a recoger',
  no_va_a_recoger: 'No van a recoger',
  devolucion: 'Devolución'
};

const OFICINA_ESTADO_COLORS = {
  pendiente_llamar: COLORS.amber,
  contactado: COLORS.blue,
  va_a_recoger: COLORS.green,
  no_va_a_recoger: COLORS.red,
  devolucion: COLORS.purple
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
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  if (loading) {
    return <div className="content">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Dashboard</h2>
      <StatsSkeleton />
      <div className="table-card" style={{ marginTop: 24 }}><TableSkeleton rows={5} columns={5} /></div>
    </div>;
  }

  const { novedades, oficina, estadisticas, rankingTransportadoras, actividadReciente, vencimientos, motivosNovedad } = data || {};
  const { chartData: dailyData, estadoDistribution } = chartData || {};

  const pieData = estadoDistribution
    ? Object.entries(estadoDistribution).filter(([, v]) => v > 0).map(([k, v]) => ({
        name: ESTADO_LABELS[k] || k, value: v, color: ESTADO_COLORS[k] || COLORS.teal
      }))
    : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
          <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{formatDate(label)}</div>
          {payload.map((p, i) => (
            <div key={i} style={{ color: p.color, fontFamily: 'var(--mono)' }}>{p.name}: <strong>{p.value}</strong></div>
          ))}
        </div>
      );
    }
    return null;
  };

  const SectionTitle = ({ title, subtitle }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent2)' }}>{title}</h3>
      {subtitle && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{subtitle}</span>}
    </div>
  );

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['hoy', 'semana', 'mes', 'todos'].map(p => (
            <button key={p} onClick={() => { setPeriodo(p); setChartDays(p === 'hoy' ? 1 : p === 'semana' ? 7 : p === 'mes' ? 30 : 90); }}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border)', background: periodo === p ? 'var(--accent)' : 'var(--bg3)', color: periodo === p ? '#fff' : 'var(--text2)', transition: 'all 0.15s' }}>
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card c-amber">
          <div className="stat-label">Total Novedades</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--mono)', marginTop: 6 }}>{formatMoney(estadisticas?.totalDinero || 0)}</div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-label">Recuperado</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--mono)', marginTop: 6 }}>{formatMoney(estadisticas?.dineroSolucionado || 0)}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{estadisticas?.porcentajeRecuperado || 0}% de recuperación</div>
        </div>
        <div className="stat-card c-teal">
          <div className="stat-label">Total Oficina</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--teal)', fontFamily: 'var(--mono)', marginTop: 6 }}>{formatMoney(oficina?.totalPrecio || 0)}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{oficina?.total || 0} paquetes en oficina</div>
        </div>
      </div>

      {vencimientos && vencimientos.length > 0 && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <span className="alert-icon">⚠</span>
          <span className="alert-text"><strong>{vencimientos.length} paquete{vencimientos.length !== 1 ? 's' : ''}</strong> por vencer en 3 días</span>
          <Link href="/oficina" style={{ marginLeft: 'auto', color: 'var(--accent2)', fontSize: 12 }}>Ver oficina →</Link>
        </div>
      )}

      {/* Two-column layout: Novedades | Oficina */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        
        {/* ========== NOVEDADES ========== */}
        <div>
          <SectionTitle title="Novedades" subtitle={`${novedades?.total || 0} casos`} />

          <div className="table-card" style={{ marginBottom: 14 }}>
            <div className="table-header"><span className="table-header-title">Estados</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {['novedad', 'contactado', 'solucionado', 'cancelado', 'devolucion'].map((est, i) => (
                <div key={est} style={{ padding: '14px 10px', textAlign: 'center', borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'var(--mono)', color: ESTADO_COLORS[est] }}>{novedades?.[est] || 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontWeight: 500 }}>{ESTADO_LABELS[est]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-card" style={{ marginBottom: 14 }}>
            <div className="table-header"><span className="table-header-title">Evolución diaria</span></div>
            <div style={{ padding: '16px 8px 4px 0' }}>
              {dailyData && dailyData.some(d => d.novedades_total > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={formatDate} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="novedades_total" name="Creadas" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="novedades_solucionado" name="Solucionadas" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos</div>}
            </div>
          </div>

          <div className="table-card" style={{ marginBottom: 14 }}>
            <div className="table-header"><span className="table-header-title">Distribución de estados</span></div>
            <div style={{ padding: '8px 0' }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--text2)', fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos</div>}
            </div>
          </div>

          <div className="table-card" style={{ marginBottom: 14 }}>
            <div className="table-header"><span className="table-header-title">Motivos más repetidos</span></div>
            <div style={{ padding: '12px 8px 4px 0' }}>
              {motivosNovedad && motivosNovedad.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={motivosNovedad.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text3)' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="motivo" tick={{ fontSize: 10, fill: 'var(--text2)' }} width={140}
                      tickFormatter={(v) => v && v.length > 20 ? v.substring(0, 20) + '...' : v} />
                    <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="total" name="Casos" radius={[0, 3, 3, 0]} fill={COLORS.amber} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos</div>}
            </div>
          </div>
        </div>

        {/* ========== OFICINA ========== */}
        <div>
          <SectionTitle title="Oficina" subtitle={`${oficina?.total || 0} paquetes`} />

          <div className="table-card" style={{ marginBottom: 14 }}>
            <div className="table-header"><span className="table-header-title">Estados</span></div>
            <div style={{ padding: '12px 16px' }}>
              {['pendiente_llamar', 'contactado', 'va_a_recoger', 'no_va_a_recoger', 'devolucion'].map(est => (
                <div key={est} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: OFICINA_ESTADO_COLORS[est], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{ESTADOS_OFICINA_LABELS[est]}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: OFICINA_ESTADO_COLORS[est] }}>{oficina?.[est] || 0}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Total</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 15 }}>{oficina?.total || 0}</span>
              </div>
            </div>
          </div>

          <div className="table-card" style={{ marginBottom: 14 }}>
            <div className="table-header"><span className="table-header-title">Evolución diaria</span></div>
            <div style={{ padding: '16px 8px 4px 0' }}>
              {dailyData && dailyData.some(d => d.oficina_total > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={formatDate} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="oficina_total" name="Ingresados" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="oficina_va_recoger" name="Recogidos" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin datos</div>}
            </div>
          </div>

          <div className="table-card" style={{ marginBottom: 14 }}>
            <div className="table-header"><span className="table-header-title">Transportadoras</span></div>
            <table>
              <thead><tr><th style={{ fontSize: 12 }}>Transportadora</th><th style={{ textAlign: 'center', fontSize: 12 }}>Cant</th><th style={{ textAlign: 'right', fontSize: 12 }}>Valor</th></tr></thead>
              <tbody>
                {rankingTransportadoras?.map((t, i) => (
                  <tr key={t.transportadora}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? 'var(--amber)' : 'var(--bg4)', color: i === 0 ? '#000' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{i + 1}</span>
                        <span className="td-name" style={{ fontSize: 13 }}>{t.transportadora}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12 }}>{t.total}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green)', fontSize: 12 }}>{formatMoney(t.dinero)}</td>
                  </tr>
                ))}
                {(!rankingTransportadoras || rankingTransportadoras.length === 0) && (
                  <tr><td colSpan={3} style={{ color: 'var(--text3)', padding: 20, textAlign: 'center' }}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        <div className="table-card">
          <div className="table-header"><span className="table-header-title">Actividad Reciente</span></div>
          <div style={{ padding: '8px 0' }}>
            {actividadReciente && actividadReciente.length > 0 ? (
              actividadReciente.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < actividadReciente.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{a.texto}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.hace}</div>
                  </div>
                </div>
              ))
            ) : <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Sin actividad reciente</div>}
          </div>
        </div>
        <div className="table-card">
          <div className="table-header"><span className="table-header-title">Accesos Rápidos</span></div>
          <div style={{ padding: 16 }}>
            <div className="grid-auto" style={{ gap: 12 }}>
              <Link href="/novedades" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <span style={{ fontSize: 22 }}>⚠</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Novedades</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{novedades?.novedad || 0} activas</span>
              </Link>
              <Link href="/oficina" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <span style={{ fontSize: 22 }}>📦</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>En Oficina</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{oficina?.pendiente_llamar || 0} pendientes</span>
              </Link>
              <Link href="/novedades/nueva" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <span style={{ fontSize: 22 }}>➕</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Nueva</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Novedad</span>
              </Link>
              {usuario?.rol === 'admin' ? (
                <Link href="/dashboard/metricas" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                  <span style={{ fontSize: 22 }}>📊</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Métricas</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Admin</span>
                </Link>
              ) : (
                <Link href="/oficina/nueva" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                  <span style={{ fontSize: 22 }}>🏢</span>
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
