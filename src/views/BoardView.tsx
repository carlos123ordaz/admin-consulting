import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB, invalidateDB } from '../context/DBContext';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import PrioTag from '../components/PrioTag';
import TaskLabel from '../components/TaskLabel';
import Modal, { Field } from '../components/Modal';
import { fmtDateShort, isLate } from '../lib/utils';
import { apiUpdateTaskCol, apiCreateSprint, apiUpdateSprint, apiAssignTaskToSprint } from '../lib/api';
import type { Task, TaskCol, ModalType, DB, Sprint } from '../types';

interface Props {
  search: string;
  setSearch: (s: string) => void;
  openTask: (id: string) => void;
  openModal: (type: ModalType, preset?: { col?: TaskCol; sprintId?: string }) => void;
}

type BoardTab = 'tablero' | 'lista' | 'backlog' | 'sprints';
const PAGE_SIZE = 25;

// ---- Create Sprint Modal ----
function CreateSprintModal({ onClose, onCreated }: { onClose: () => void; onCreated: (msg: string) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [goal, setGoal] = useState('');

  const mut = useMutation({
    mutationFn: apiCreateSprint,
    onSuccess: (s) => {
      invalidateDB(qc);
      onCreated(`Sprint «${s.name}» creado`);
      onClose();
    },
  });

  const save = () => {
    if (!name.trim()) return;
    const id = `sprint-${Date.now()}`;
    mut.mutate({ id, name: name.trim(), status: 'Planificado', start_date: startDate, end_date: endDate, goal: goal.trim() });
  };

  return (
    <Modal
      icoName="board"
      icoBg="var(--blue-50)"
      icoColor="var(--blue)"
      title="Crear sprint"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={mut.isPending}>
            {mut.isPending ? 'Creando…' : 'Crear sprint'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nombre del sprint" required full>
          <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Sprint 25" />
        </Field>
        <Field label="Fecha inicio">
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label="Fecha fin">
          <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </Field>
        <Field label="Objetivo del sprint" full>
          <input className="input" value={goal} onChange={e => setGoal(e.target.value)} placeholder="¿Qué queremos lograr?" />
        </Field>
      </div>
    </Modal>
  );
}

// ---- Complete Sprint Modal ----
function CompleteSprintModal({ sprint, sprintTasks, plannedSprints, onConfirm, onClose, isLoading }: {
  sprint: Sprint;
  sprintTasks: Task[];
  plannedSprints: Sprint[];
  onConfirm: (targetSprintId: string | null) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const doneTasks       = sprintTasks.filter(t => t.col === 'done');
  const incompleteTasks = sprintTasks.filter(t => t.col !== 'done');
  const [dest, setDest] = useState<'backlog' | string>('backlog');

  return (
    <Modal
      icoName="flag"
      icoBg="var(--green-bg)"
      icoColor="var(--green)"
      title="Completar sprint"
      subtitle={sprint.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onConfirm(dest === 'backlog' ? null : dest)} disabled={isLoading}>
            {isLoading ? 'Cerrando…' : 'Completar sprint'}
          </button>
        </>
      }
    >
      {/* Resumen del sprint */}
      <div className="cs-summary">
        <div className="cs-stat cs-done">
          <Icon name="check" size={15} />
          <span><strong>{doneTasks.length}</strong> tarea{doneTasks.length !== 1 ? 's' : ''} completada{doneTasks.length !== 1 ? 's' : ''}</span>
        </div>
        {incompleteTasks.length > 0 && (
          <div className="cs-stat cs-pending">
            <Icon name="clock" size={15} />
            <span><strong>{incompleteTasks.length}</strong> tarea{incompleteTasks.length !== 1 ? 's' : ''} incompleta{incompleteTasks.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {incompleteTasks.length > 0 ? (
        <>
          <div className="cs-question">¿Qué hacemos con las tareas incompletas?</div>
          <div className="cs-dest-options">
            <div className={'cs-dest-opt' + (dest === 'backlog' ? ' selected' : '')} onClick={() => setDest('backlog')}>
              <div className="cs-radio"><div className={dest === 'backlog' ? 'cs-radio-dot' : ''} /></div>
              <div>
                <div className="cs-opt-title">Mover al backlog</div>
                <div className="cs-opt-desc">Las tareas quedan disponibles para planificar en el próximo sprint</div>
              </div>
            </div>
            {plannedSprints.map(s => (
              <div key={s.id} className={'cs-dest-opt' + (dest === s.id ? ' selected' : '')} onClick={() => setDest(s.id)}>
                <div className="cs-radio"><div className={dest === s.id ? 'cs-radio-dot' : ''} /></div>
                <div>
                  <div className="cs-opt-title">Asignar a {s.name}</div>
                  <div className="cs-opt-desc">
                    {s.goal || 'Sin objetivo definido'}{s.startDate ? ` · inicio ${s.startDate}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 14, lineHeight: 1.6 }}>
          Todas las tareas están completadas. El sprint se cerrará sin cambios pendientes.
        </p>
      )}
    </Modal>
  );
}

// ---- Sprint Card ----
function SprintCard({ sprint, tasks, onRequestComplete, onStart, hasActiveSprint, actionId, onToast }: {
  sprint: Sprint;
  tasks: Task[];
  onRequestComplete: (sprintId: string) => void;
  onStart: (sprintId: string) => void;
  hasActiveSprint: boolean;
  actionId: string | null;
  onToast: (msg: string) => void;
}) {
  const doneTasks = tasks.filter(t => t.col === 'done');
  const progress = tasks.length ? Math.round(doneTasks.length / tasks.length * 100) : 0;
  const isStarting   = actionId === sprint.id + '-start';
  const isCompleting = actionId === sprint.id + '-complete';

  const statusColor: Record<string, string> = {
    'Activo': 'var(--green)',
    'Planificado': 'var(--blue)',
    'Completado': 'var(--muted)',
  };

  return (
    <div className="sprint-card">
      <div className="sprint-card-head">
        <div>
          <div className="sprint-name">{sprint.name}</div>
          {sprint.goal && <div className="sprint-goal">{sprint.goal}</div>}
        </div>
        <span className="badge" style={{ background: statusColor[sprint.status] + '22', color: statusColor[sprint.status], fontWeight: 700, fontSize: 12 }}>
          {sprint.status}
        </span>
      </div>
      <div className="sprint-meta">
        {sprint.startDate && <span><Icon name="calendar" size={13} cls="muted" /> {sprint.startDate}</span>}
        {sprint.endDate && <span> → {sprint.endDate}</span>}
      </div>
      <div className="sprint-stats">
        <span>{tasks.length} tareas</span>
        <span>{doneTasks.length} completadas</span>
      </div>
      <div className="sprint-progress">
        <div className="sprint-progress-bar">
          <div className="sprint-progress-fill" style={{ width: progress + '%' }} />
        </div>
        <span className="sprint-progress-pct">{progress}%</span>
      </div>
      {sprint.status === 'Planificado' && !hasActiveSprint && (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: 12, width: '100%' }}
          onClick={() => onStart(sprint.id)}
          disabled={isStarting}
        >
          <Icon name="flag" size={15} />{isStarting ? 'Iniciando…' : 'Iniciar sprint'}
        </button>
      )}
      {sprint.status === 'Planificado' && hasActiveSprint && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', fontWeight: 600, textAlign: 'center' }}>
          Ya hay un sprint activo en curso
        </div>
      )}
      {sprint.status === 'Activo' && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 12, width: '100%' }}
          onClick={() => onRequestComplete(sprint.id)}
          disabled={isCompleting}
        >
          <Icon name="check" size={15} />{isCompleting ? 'Cerrando sprint…' : 'Completar sprint'}
        </button>
      )}
    </div>
  );
}

// ---- Main BoardView ----
export default function BoardView({ search, setSearch, openTask, openModal }: Props) {
  const db = useDB();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState('all');
  const [activeAssignees, setActiveAssignees] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [tab, setTab] = useState<BoardTab>('tablero');
  const [moreOpen, setMoreOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [sprintActionId, setSprintActionId] = useState<string | null>(null);
  const [pendingSprintTaskId, setPendingSprintTaskId] = useState<string | null>(null);
  const [completeSprintModal, setCompleteSprintModal] = useState<{ sprintId: string } | null>(null);
  const [backlogPage, setBacklogPage] = useState(0);
  const [backlogStatusFilter, setBacklogStatusFilter] = useState('all');
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const updateColMut = useMutation({
    mutationFn: ({ id, col }: { id: string; col: TaskCol }) => apiUpdateTaskCol(id, col),
    onMutate: async ({ id, col }) => {
      await queryClient.cancelQueries({ queryKey: ['db'] });
      const prev = queryClient.getQueryData<DB>(['db']);
      if (prev) queryClient.setQueryData<DB>(['db'], { ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, col } : t) });
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) queryClient.setQueryData(['db'], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['db'] }),
  });

  const requestCompleteSprint = (sprintId: string) => {
    setCompleteSprintModal({ sprintId });
  };

  const completeSprint = async (sprintId: string, targetSprintId: string | null) => {
    setCompleteSprintModal(null);
    setSprintActionId(sprintId + '-complete');
    try {
      const incompleteTasks = db.tasks.filter(t => t.sprintId === sprintId && t.col !== 'done');
      await Promise.all(incompleteTasks.map(t => apiAssignTaskToSprint(t.id, targetSprintId)));
      await apiUpdateSprint({ id: sprintId, status: 'Completado' });
      invalidateDB(queryClient);
    } finally {
      setSprintActionId(null);
    }
  };

  const startSprint = async (sprintId: string) => {
    setSprintActionId(sprintId + '-start');
    try {
      await apiUpdateSprint({ id: sprintId, status: 'Activo' });
      invalidateDB(queryClient);
    } finally {
      setSprintActionId(null);
    }
  };

  const addToSprintMut = useMutation({
    mutationFn: ({ taskId, sprintId }: { taskId: string; sprintId: string }) =>
      apiAssignTaskToSprint(taskId, sprintId),
    onSuccess: () => { invalidateDB(queryClient); setPendingSprintTaskId(null); },
    onError:   () => setPendingSprintTaskId(null),
  });

  const toggleAssignee = (id: string) =>
    setActiveAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const shareBoard = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const q = search.trim().toLowerCase();

  // Base filter (project + assignee + search)
  const baseFilter = (t: Task) => {
    if (projectFilter !== 'all' && t.project !== projectFilter) return false;
    if (activeAssignees.length && !activeAssignees.includes(t.assignee)) return false;
    if (q && !t.title.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
    return true;
  };

  // Tablero: show only active sprint tasks; empty board when no sprint is running
  const tableroTasks = db.tasks.filter(t => {
    if (!baseFilter(t)) return false;
    if (db.activeSprint) return t.sprintId === db.activeSprint.id;
    return false;
  });

  // Backlog: ALL tasks with optional status filter
  const backlogFiltered = db.tasks.filter(t => {
    if (!baseFilter(t)) return false;
    if (backlogStatusFilter !== 'all' && t.col !== backlogStatusFilter) return false;
    return true;
  });
  const backlogTotal = backlogFiltered.length;
  const backlogTasks = backlogFiltered.slice(backlogPage * PAGE_SIZE, (backlogPage + 1) * PAGE_SIZE);
  const backlogPages = Math.ceil(backlogTotal / PAGE_SIZE);

  const onDrop = (colId: TaskCol) => {
    if (dragId) updateColMut.mutate({ id: dragId, col: colId });
    setDragId(null); setOverCol(null);
  };

  const teamInBoard = db.team.filter(m => db.tasks.some(t => t.assignee === m.id));
  const hasFilters = projectFilter !== 'all' || activeAssignees.length > 0 || q;

  return (
    <div className="page fade-in">
      <div className="space-head">
        <div className="space-top">
          <div className="space-icon" style={{ background: 'linear-gradient(150deg,#2A6FDB,#4f86e6)' }}>
            <Icon name="board" size={18} />
          </div>
          <div>
            <div className="space-crumb">Espacio de trabajo</div>
            <div className="space-name">
              Tablero de proyectos
              {db.activeSprint && <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, color: 'var(--green)', background: 'var(--green-bg, #e6f4ec)', padding: '2px 8px', borderRadius: 99 }}>{db.activeSprint.name}</span>}
            </div>
          </div>
          <div className="space-actions">
            <button className="icon-btn" title="Compartir enlace" onClick={shareBoard}>
              <Icon name="share" size={17} />
            </button>
            <button className="icon-btn" title="Pantalla completa" onClick={toggleFullscreen}>
              <Icon name="expand" size={16} />
            </button>
            <div className="ctx-wrap" ref={moreRef}>
              <button className="icon-btn" title="Más opciones" onClick={() => setMoreOpen(o => !o)}>
                <Icon name="moreV" size={18} />
              </button>
              {moreOpen && (
                <div className="ctx-menu">
                  <button className="ctx-item" onClick={() => { setTab('tablero'); setMoreOpen(false); }}>
                    <Icon name="board" size={15} />Vista tablero
                  </button>
                  <button className="ctx-item" onClick={() => { setTab('lista'); setMoreOpen(false); }}>
                    <Icon name="list" size={15} />Vista lista
                  </button>
                  <div className="ctx-sep" />
                  <button className="ctx-item" onClick={() => { setProjectFilter('all'); setActiveAssignees([]); setMoreOpen(false); }}>
                    <Icon name="close" size={15} />Limpiar filtros
                  </button>
                  <button className="ctx-item" onClick={() => { shareBoard(); setMoreOpen(false); }}>
                    <Icon name="share" size={15} />Copiar enlace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-tabs">
          <button className={'space-tab' + (tab === 'tablero' ? ' active' : '')} onClick={() => setTab('tablero')}>
            <Icon name="board" size={16} />Tablero
          </button>
          <button className={'space-tab' + (tab === 'lista' ? ' active' : '')} onClick={() => setTab('lista')}>
            <Icon name="list" size={16} />Lista
          </button>
          <button className={'space-tab' + (tab === 'backlog' ? ' active' : '')} onClick={() => setTab('backlog')}>
            <Icon name="apps" size={16} />Backlog
          </button>
          <button className={'space-tab' + (tab === 'sprints' ? ' active' : '')} onClick={() => setTab('sprints')}>
            <Icon name="flag" size={16} />Sprints
          </button>
        </div>
      </div>

      {(tab === 'tablero' || tab === 'lista' || tab === 'backlog') && (
        <div className="board-toolbar">
          <div className="mini-search">
            <Icon name="search" size={15} />
            <input placeholder="Buscar en tablero" value={search} onChange={e => setSearch(e.target.value)} />
            {q && <button style={{ color: 'var(--muted)', lineHeight: 1 }} onClick={() => setSearch('')}><Icon name="close" size={13} /></button>}
          </div>

          <div className="filter-avs" title="Filtrar por responsable">
            {teamInBoard.map(m => (
              <div key={m.id}
                className={'avatar filter-av' + (activeAssignees.length && !activeAssignees.includes(m.id) ? ' off' : '')}
                style={{ background: m.color }} onClick={() => toggleAssignee(m.id)} title={m.name}>
                {m.initials}
              </div>
            ))}
          </div>

          <select className="select" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="all">Todos los proyectos</option>
            {db.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {hasFilters && (
            <button className="btn-subtle" onClick={() => { setProjectFilter('all'); setActiveAssignees([]); setSearch(''); }}>
              <Icon name="close" size={14} /> Limpiar
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => openModal('task', { sprintId: db.activeSprint?.id })}>
              <Icon name="plus" size={16} sw={2.4} />Nueva tarea
            </button>
          </div>
        </div>
      )}

      {tab === 'tablero' && !db.activeSprint && (
        <div className="sprint-empty-state">
          <div className="ses-icon"><Icon name="flag" size={32} /></div>
          <div className="ses-title">No hay sprint activo</div>
          <div className="ses-desc">Inicia un sprint para organizar las tareas en el tablero. Las tareas pendientes están disponibles en el Backlog.</div>
          <button className="btn btn-primary" onClick={() => setTab('sprints')}>
            <Icon name="flag" size={16} />Ver sprints
          </button>
        </div>
      )}
      {tab === 'tablero' && db.activeSprint && (
        <div className="sprint-info-bar">
          <div className="sib-left">
            <span className="sib-badge">
              <Icon name="flag" size={13} />
              {db.activeSprint.name}
            </span>
            {db.activeSprint.goal && <span className="sib-goal">{db.activeSprint.goal}</span>}
            {db.activeSprint.endDate && (
              <span className="sib-dates">
                <Icon name="calendar" size={13} cls="muted" />
                Vence: {db.activeSprint.endDate}
              </span>
            )}
          </div>
          <div className="sib-right">
            <span className="sib-count">{tableroTasks.length} tareas</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => requestCompleteSprint(db.activeSprint!.id)}
              disabled={sprintActionId === db.activeSprint.id + '-complete'}
            >
              <Icon name="check" size={15} />Completar sprint
            </button>
          </div>
        </div>
      )}
      {tab === 'tablero' && db.activeSprint && (
        <div className="board">
          {db.columns.map(col => {
            const colTasks = tableroTasks.filter(t => t.col === col.id);
            return (
              <div className="col" key={col.id}>
                <div className="col-head">
                  <span className="col-dot" style={{ background: col.color }}></span>
                  <span className="col-title">{col.title}</span>
                  <span className="col-count">{colTasks.length}</span>
                </div>
                <div className={'col-body' + (overCol === col.id ? ' drag-over' : '')}
                  onDragOver={e => { e.preventDefault(); setOverCol(col.id); }}
                  onDragLeave={e => { if (e.currentTarget === e.target) setOverCol(null); }}
                  onDrop={() => onDrop(col.id as TaskCol)}>
                  {colTasks.map(t => (
                    <KanbanCard key={t.id} task={t} dragging={dragId === t.id}
                      onClick={() => openTask(t.id)}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      projectColor={db.projectById[t.project]?.color || '#ccc'}
                    />
                  ))}
                  <button className="col-add" onClick={() => openModal('task', { col: col.id as TaskCol, sprintId: db.activeSprint?.id })}>
                    <Icon name="plus" size={15} sw={2.4} />Crear
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'lista' && (
        <TaskListView tasks={tableroTasks} openTask={openTask} />
      )}

      {tab === 'backlog' && (
        <div>
          <div className="backlog-toolbar">
            <span style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="flag" size={14} cls="muted" />
              {db.activeSprint
                ? `Sprint activo: ${db.activeSprint.name}`
                : 'Sin sprint activo — crea e inicia un sprint para comenzar'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <select className="select" value={backlogStatusFilter} onChange={e => { setBacklogStatusFilter(e.target.value); setBacklogPage(0); }}>
                <option value="all">Todos los estados</option>
                {db.columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{backlogTotal} tarea{backlogTotal !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="table-wrap">
            <div className="backlog-header-row">
              <span>Tarea</span>
              <span>ID</span>
              <span>Proyecto</span>
              <span>Prioridad</span>
              <span>Vencimiento</span>
              <span>Responsable</span>
              <span>Sprint</span>
            </div>
            {backlogTasks.map(t => {
              const p = db.projectById[t.project];
              const sprint = t.sprintId ? db.sprints.find(s => s.id === t.sprintId) : null;
              return (
                <div className="list-row backlog-row" key={t.id} onClick={() => openTask(t.id)}>
                  <div className="lr-title">
                    <span className="col-dot" style={{ background: db.columns.find(c => c.id === t.col)?.color || '#ccc', width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }}></span>
                    <span className="ktitle2">{t.title}</span>
                  </div>
                  <span className="kid">{t.id}</span>
                  <span className="flex gap-8" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', minWidth: 0 }}>
                    {p && <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0, display: 'inline-block', alignSelf: 'center' }}></span>}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.code}</span>
                  </span>
                  <PrioTag value={t.prio} />
                  <span className={'kdue' + (isLate(t.due) && t.col !== 'done' ? ' late' : '')}>{fmtDateShort(t.due)}</span>
                  {t.assignee ? <Avatar id={t.assignee} size={26} /> : <span />}
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {sprint ? (
                      <span className="badge" style={{ background: 'var(--blue-50)', color: 'var(--blue)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {sprint.name}
                      </span>
                    ) : db.activeSprint ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: '0 9px', height: 28, gap: 4 }}
                        disabled={pendingSprintTaskId === t.id}
                        onClick={() => {
                          setPendingSprintTaskId(t.id);
                          addToSprintMut.mutate({ taskId: t.id, sprintId: db.activeSprint!.id });
                        }}
                        title={`Añadir a ${db.activeSprint.name}`}
                      >
                        {pendingSprintTaskId === t.id ? '…' : <><Icon name="plus" size={12} sw={2.4} />Sprint</>}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
            {backlogTotal === 0 && (
              <div className="empty" style={{ padding: '40px 0', textAlign: 'center' }}>
                No hay tareas que coincidan con los filtros aplicados.
              </div>
            )}
          </div>
          {backlogPages > 1 && (
            <div className="backlog-pagination">
              <button className="btn btn-ghost btn-sm" onClick={() => setBacklogPage(p => Math.max(0, p - 1))} disabled={backlogPage === 0}>
                ← Anterior
              </button>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                Pág. {backlogPage + 1} / {backlogPages}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setBacklogPage(p => Math.min(backlogPages - 1, p + 1))} disabled={backlogPage >= backlogPages - 1}>
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'sprints' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateSprintOpen(true)}>
              <Icon name="plus" size={16} sw={2.4} />Crear sprint
            </button>
          </div>
          {db.sprints.length === 0 ? (
            <div className="empty" style={{ padding: '60px 0', textAlign: 'center' }}>
              No hay sprints creados todavía.
            </div>
          ) : (
            <div className="sprint-table">
              <div className="sprint-table-head">
                <span>Sprint</span>
                <span>Estado</span>
                <span>Progreso</span>
                <span>Tareas</span>
                <span>Inicio</span>
                <span>Fin</span>
                <span>Acciones</span>
              </div>
              {db.sprints.map(s => {
                const tasks = db.tasks.filter(t => t.sprintId === s.id);
                const doneTasks = tasks.filter(t => t.col === 'done');
                const pct = tasks.length ? Math.round(doneTasks.length / tasks.length * 100) : 0;
                const isStarting   = sprintActionId === s.id + '-start';
                const isCompleting = sprintActionId === s.id + '-complete';
                const statusColors: Record<string, [string, string]> = {
                  'Activo':      ['var(--green-bg)', 'var(--green)'],
                  'Planificado': ['var(--blue-50)',  'var(--blue)'],
                  'Completado':  ['#f0f0f0',         'var(--muted)'],
                };
                const [sbg, sfg] = statusColors[s.status] || ['#f0f0f0', 'var(--muted)'];
                return (
                  <div className="sprint-table-row" key={s.id}>
                    <div className="spr-name-cell">
                      <div className="spr-name">{s.name}</div>
                      {s.goal && <div className="spr-goal">{s.goal}</div>}
                    </div>
                    <span>
                      <span className="badge" style={{ background: sbg, color: sfg, fontWeight: 700, fontSize: 11.5 }}>
                        {s.status}
                      </span>
                    </span>
                    <div className="spr-progress-cell">
                      <div className="sprint-progress-bar" style={{ flex: 1 }}>
                        <div className="sprint-progress-fill" style={{ width: pct + '%' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {doneTasks.length}/{tasks.length}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{s.startDate || '—'}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{s.endDate || '—'}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.status === 'Planificado' && !db.activeSprint && (
                        <button className="btn btn-primary btn-sm" onClick={() => startSprint(s.id)} disabled={isStarting}>
                          <Icon name="flag" size={14} />{isStarting ? 'Iniciando…' : 'Iniciar'}
                        </button>
                      )}
                      {s.status === 'Planificado' && db.activeSprint && (
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, alignSelf: 'center' }}>Sprint activo en curso</span>
                      )}
                      {s.status === 'Activo' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => requestCompleteSprint(s.id)} disabled={isCompleting}>
                          <Icon name="check" size={14} />{isCompleting ? 'Cerrando…' : 'Completar'}
                        </button>
                      )}
                      {s.status === 'Completado' && (
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, alignSelf: 'center' }}>Cerrado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {createSprintOpen && (
        <CreateSprintModal
          onClose={() => setCreateSprintOpen(false)}
          onCreated={(msg) => { setCreateSprintOpen(false); }}
        />
      )}

      {completeSprintModal && (() => {
        const sprint = db.sprints.find(s => s.id === completeSprintModal.sprintId)!;
        const sprintTasks = db.tasks.filter(t => t.sprintId === completeSprintModal.sprintId);
        const plannedSprints = db.sprints.filter(s => s.status === 'Planificado' && s.id !== completeSprintModal.sprintId);
        const isLoading = sprintActionId === completeSprintModal.sprintId + '-complete';
        return (
          <CompleteSprintModal
            sprint={sprint}
            sprintTasks={sprintTasks}
            plannedSprints={plannedSprints}
            onConfirm={(targetSprintId) => completeSprint(completeSprintModal.sprintId, targetSprintId)}
            onClose={() => setCompleteSprintModal(null)}
            isLoading={isLoading}
          />
        );
      })()}
    </div>
  );
}

function KanbanCard({ task, onClick, onDragStart, onDragEnd, dragging, projectColor }: {
  task: Task; onClick: () => void; onDragStart: () => void;
  onDragEnd: () => void; dragging: boolean; projectColor: string;
}) {
  return (
    <div className={'kcard' + (dragging ? ' dragging' : '')} draggable
      style={{ borderLeftColor: projectColor }}
      onClick={onClick} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="ktitle">{task.title}</div>
      {task.labels.length > 0 && (
        <div className="klabels">
          {task.labels.slice(0, 2).map(l => <TaskLabel key={l} text={l} />)}
        </div>
      )}
      <div className="kfoot">
        <span className="kid">
          <span className="checkmark"><Icon name="check" size={9} sw={3.5} /></span>
          {task.id}
        </span>
        <div className="kmeta">
          {task.due && (
            <span className={'kdue' + (isLate(task.due) && task.col !== 'done' ? ' late' : '')}>
              <Icon name="clock" size={12} /> {fmtDateShort(task.due)}
            </span>
          )}
          <PrioTag value={task.prio} showLabel={false} />
          {task.assignee && <Avatar id={task.assignee} size={24} />}
        </div>
      </div>
    </div>
  );
}

function TaskListView({ tasks, openTask }: { tasks: Task[]; openTask: (id: string) => void }) {
  const db = useDB();
  return (
    <div className="table-wrap">
      {db.columns.map(col => {
        const rows = tasks.filter(t => t.col === col.id);
        if (!rows.length) return null;
        return (
          <div key={col.id}>
            <div className="list-group-head">
              <span className="lg-dot" style={{ background: col.color }}></span>
              <span className="lg-title">{col.title}</span>
              <span className="lg-count">{rows.length}</span>
            </div>
            {rows.map(t => {
              const p = db.projectById[t.project];
              return (
                <div className="list-row" key={t.id} onClick={() => openTask(t.id)}>
                  <div className="lr-title">
                    <span className="kid"><span className="checkmark"><Icon name="check" size={9} sw={3.5} /></span></span>
                    <span className="ktitle2">{t.title}</span>
                  </div>
                  <span className="kid">{t.id}</span>
                  <span className="flex gap-8" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', minWidth: 0 }}>
                    {p && <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0, display: 'inline-block', alignSelf: 'center' }}></span>}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.code}</span>
                  </span>
                  <PrioTag value={t.prio} />
                  <span className={'kdue' + (isLate(t.due) && t.col !== 'done' ? ' late' : '')}>{fmtDateShort(t.due)}</span>
                  {t.assignee && <Avatar id={t.assignee} size={26} />}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
