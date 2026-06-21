'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TableSkeleton } from '@/components/Skeleton';

const COLUMNAS = [
  { id: 'pendiente', title: '📋 Pendiente', count: 0 },
  { id: 'en_progreso', title: '🚧 En Progreso', count: 0 },
  { id: 'revision', title: '👁 Revisión', count: 0 },
  { id: 'completada', title: '✅ Completadas', count: 0 },
  { id: 'cancelada', title: '❌ Canceladas', count: 0 }
];

const PRIORIDAD = {
  urgente: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '🔴 Urgente' },
  alta: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: '🟠 Alta' },
  media: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '🟡 Media' },
  baja: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: '🟢 Baja' }
};

export default function TareasKanbanPage() {
  const [columns, setColumns] = useState(COLUMNAS.map(c => ({ ...c, items: [] })));
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'media', asignadoId: '', fechaLimite: '' });
  const [operadores, setOperadores] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchTareas = async () => {
    const { data } = await api.get('/api/tareas');
    const cols = COLUMNAS.map(col => ({
      ...col,
      items: data.todas?.filter(t => t.estado === col.id) || [],
      count: (data.todas?.filter(t => t.estado === col.id) || []).length
    }));
    setColumns(cols);
    setLoading(false);
  };

  useEffect(() => { fetchTareas(); }, []);

  useEffect(() => {
    api.get('/api/usuarios/operadores').then(({ data }) => setOperadores(data)).catch(() => {});
  }, []);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = columns.find(c => c.id === source.droppableId);
    const destCol = columns.find(c => c.id === destination.droppableId);
    if (!sourceCol || !destCol) return;

    const newItems = Array.from(sourceCol.items);
    const [moved] = newItems.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      newItems.splice(destination.index, 0, moved);
      setColumns(columns.map(c => c.id === source.droppableId ? { ...c, items: newItems } : c));
    } else {
      const destItems = Array.from(destCol.items);
      destItems.splice(destination.index, 0, moved);
      setColumns(columns.map(c => {
        if (c.id === source.droppableId) return { ...c, items: newItems };
        if (c.id === destination.droppableId) return { ...c, items: destItems };
        return c;
      }));
      try {
        await api.patch(`/api/tareas/${moved.id}/estado`, { estado: destination.droppableId });
      } catch { fetchTareas(); }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);
    try {
      await api.post('/api/tareas', {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        prioridad: form.prioridad,
        asignadoId: form.asignadoId || null,
        fechaLimite: form.fechaLimite || null
      });
      setShowModal(false);
      setForm({ titulo: '', descripcion: '', prioridad: 'media', asignadoId: '', fechaLimite: '' });
      fetchTareas();
    } catch { /* error */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="content"><TableSkeleton rows={5} columns={4} /></div>;

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Tareas</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ padding: '8px 16px' }}>+ Nueva tarea</button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, overflow: 'hidden' }}>
          {columns.map(col => (
            <div key={col.id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
              minHeight: 300, display: 'flex', flexDirection: 'column'
            }}>
              <div style={{
                padding: '10px 12px', borderBottom: '1px solid var(--border)',
                fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between'
              }}>
                <span>{col.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{col.items.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1, padding: 6, minHeight: 200,
                      background: snapshot.isDraggingOver ? 'var(--bg3)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    {col.items.map((tarea, i) => {
                      const pr = PRIORIDAD[tarea.prioridad] || PRIORIDAD.media;
                      return (
                        <Draggable key={tarea.id} draggableId={tarea.id} index={i}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                background: 'var(--bg3)', borderRadius: 8, padding: 10,
                                marginBottom: 6, border: `1px solid var(--border)`,
                                borderLeft: `3px solid ${pr.color}`,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                cursor: 'grab'
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, color: pr.color, marginBottom: 4 }}>
                                {pr.label}
                              </div>
                              <Link href={`/tareas/${tarea.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                                  {tarea.titulo}
                                </div>
                              </Link>
                              {tarea.descripcion && (
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {tarea.descripcion}
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--text3)' }}>
                                <span>
                                  {tarea.origenTipo === 'novedad' ? '⚠' : tarea.origenTipo === 'oficina' ? '📦' : '✏️'}
                                </span>
                                {tarea.asignado && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {tarea.asignado.nombre}
                                  </span>
                                )}
                              </div>
                              {tarea.fechaLimite && (
                                <div style={{ fontSize: 10, color: new Date(tarea.fechaLimite) < new Date() ? 'var(--red)' : 'var(--text3)', marginTop: 4 }}>
                                  📅 {new Date(tarea.fechaLimite).toLocaleDateString('es-CO')}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {col.items.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 20, fontSize: 12 }}>Vacío</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 14, width: 'min(460px, 94vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 16 }}>Nueva tarea</div>
            <form onSubmit={handleCreate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Título
                <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  Prioridad
                  <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  Asignar a
                  <select value={form.asignadoId} onChange={e => setForm({ ...form, asignadoId: e.target.value })}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                    <option value="">Sin asignar</option>
                    {operadores.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Fecha límite (opcional)
                <input type="date" value={form.fechaLimite} onChange={e => setForm({ ...form, fechaLimite: e.target.value })}
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Descripción
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3}
                  placeholder="Opcional"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Creando...' : 'Crear tarea'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
