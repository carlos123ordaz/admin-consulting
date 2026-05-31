import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDB, invalidateDB } from '../context/DBContext';
import Icon from '../components/Icon';
import AvatarStack from '../components/AvatarStack';
import StatusBadge from '../components/StatusBadge';
import Modal, { Field } from '../components/Modal';
import { money, fmtDateShort, isLate } from '../lib/utils';
import { apiUpdateProject, apiCloseProject } from '../lib/api';
import type { ModalType, Project, ProjectStatus } from '../types';

interface Props {
  search: string;
  openModal: (type: ModalType) => void;
  onToast: (msg: string) => void;
}

const STATUS_TABS = ['Todos', 'En progreso', 'En revisión', 'Planificación', 'Completado', 'Cerrados'];

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const db = useDB();
  const qc = useQueryClient();
  const [name, setName] = useState(project.name);
  const [clientId, setClientId] = useState(project.client);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [leadId, setLeadId] = useState(project.lead);
  const [budget, setBudget] = useState(String(project.budget));
  const [startDate, setStartDate] = useState(project.start);
  const [dueDate, setDueDate] = useState(project.due);
  const [progress, setProgress] = useState(project.progress);

  const mut = useMutation({
    mutationFn: apiUpdateProject,
    onSuccess: () => {
      invalidateDB(qc);
      onSaved(`Proyecto «${name}» actualizado`);
      onClose();
    },
  });

  const save = () => {
    if (!name.trim()) return;
    mut.mutate({
      id: project.id,
      name: name.trim(),
      client_id: clientId,
      status,
      lead_id: leadId,
      budget: Number(budget) || 0,
      start_date: startDate,
      due_date: dueDate,
      progress,
    });
  };

  return (
    <Modal
      icoName="projects"
      icoBg="var(--blue-50)"
      icoColor="var(--blue)"
      title="Editar proyecto"
      subtitle={`${project.code} · ${project.id}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={mut.isPending}>
            {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nombre del proyecto" required full>
          <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Cliente" required>
          <select className="select full" value={clientId} onChange={e => setClientId(e.target.value)}>
            {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Estado" required>
          <select className="select full" value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
            <option value="Planificación">Planificación</option>
            <option value="En progreso">En progreso</option>
            <option value="En revisión">En revisión</option>
            <option value="Completado">Completado</option>
          </select>
        </Field>
        <Field label="Responsable (lead)" required>
          <select className="select full" value={leadId} onChange={e => setLeadId(e.target.value)}>
            {db.team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Presupuesto ($)">
          <input className="input" type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} />
        </Field>
        <Field label="Fecha inicio">
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label="Fecha entrega">
          <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </Field>
        <Field label={`Avance: ${progress}%`} full>
          <input
            type="range" min={0} max={100} value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--blue)' }}
          />
        </Field>
      </div>
    </Modal>
  );
}

export default function ProjectsView({ search, openModal, onToast }: Props) {
  const navigate = useNavigate();
  const db = useDB();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('Todos');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const q = search.trim().toLowerCase();

  const closeMut = useMutation({
    mutationFn: ({ id, closed }: { id: string; closed: boolean }) => apiCloseProject(id, closed),
    onSuccess: (_d, vars) => {
      invalidateDB(qc);
      onToast(vars.closed ? 'Proyecto cerrado · ya no aparece en el cronograma' : 'Proyecto reabierto');
    },
  });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const rows = db.projects.filter(p => {
    if (filter === 'Cerrados') return p.closed && (!q || p.name.toLowerCase().includes(q) || db.clientById[p.client]?.name.toLowerCase().includes(q));
    if (p.closed) return false;
    if (filter !== 'Todos' && p.status !== filter) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(db.clientById[p.client]?.name.toLowerCase().includes(q))) return false;
    return true;
  });

  const closedCount = db.projects.filter(p => p.closed).length;

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-title">Proyectos</div>
          <div className="page-desc">
            {db.projects.filter(p => !p.closed).length} proyectos · {db.projects.filter(p => !p.closed && p.status !== 'Completado').length} activos
            {closedCount > 0 && ` · ${closedCount} cerrados`}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openModal('project')}>
            <Icon name="plus" size={16} sw={2.4} />Nuevo proyecto
          </button>
        </div>
      </div>

      <div className="tabbar">
        {STATUS_TABS.map(t => {
          const n = t === 'Cerrados' ? closedCount
                  : t === 'Todos' ? db.projects.filter(p => !p.closed).length
                  : db.projects.filter(p => !p.closed && p.status === t).length;
          if (t === 'Cerrados' && closedCount === 0) return null;
          return (
            <button key={t} className={'tb' + (filter === t ? ' active' : '')} onClick={() => setFilter(t)}>
              {t} <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="table-wrap" ref={menuRef}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Proyecto</th><th>Cliente</th><th>Estado</th><th>Avance</th>
              <th>Equipo</th><th>Presupuesto</th><th>Entrega</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const c = db.clientById[p.client];
              const spentPct = p.budget ? Math.round(p.spent / p.budget * 100) : 0;
              const late = isLate(p.due) && p.status !== 'Completado';
              return (
                <tr key={p.id} style={{ cursor: 'pointer', opacity: p.closed ? 0.55 : 1 }} onClick={() => setEditProject(p)}>
                  <td>
                    <div className="flex gap-12">
                      <div className="client-logo" style={{ width: 34, height: 34, fontSize: 12.5, borderRadius: 5, background: p.closed ? '#8a93a6' : p.color }}>{p.code}</div>
                      <div>
                        <div className="flex gap-8" style={{ alignItems: 'center' }}>
                          <span className="cell-strong" style={p.closed ? { textDecoration: 'line-through', color: 'var(--ink-3)' } : {}}>{p.name}</span>
                          {p.closed && <span className="badge badge-gray" style={{ fontSize: 10 }}>Cerrado</span>}
                        </div>
                        <div className="cell-muted" style={{ fontSize: 12, marginTop: 1 }}>
                          {p.openTasks} tareas abiertas · {p.tasks} totales
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c && (
                      <div className="flex gap-8">
                        <div className="client-logo" style={{ width: 24, height: 24, fontSize: 10, borderRadius: 4, background: c.color }}>{c.logo}</div>
                        {c.name}
                      </div>
                    )}
                  </td>
                  <td><StatusBadge value={p.status} /></td>
                  <td>
                    <div className="prog-cell">
                      <div className="progressbar" style={{ flex: 1 }}>
                        <span style={{ width: p.progress + '%', background: p.color }}></span>
                      </div>
                      <span className="pct">{p.progress}%</span>
                    </div>
                  </td>
                  <td><AvatarStack ids={p.team} size={26} max={4} /></td>
                  <td>
                    <div className="cell-strong">{money(p.budget)}</div>
                    <div className="cell-muted" style={{ fontSize: 11.5, marginTop: 1 }}>{spentPct}% usado</div>
                  </td>
                  <td>
                    <div style={late ? { color: 'var(--red)', fontWeight: 700 } : { fontWeight: 700 }}>
                      {fmtDateShort(p.due)}
                    </div>
                    <div className="cell-muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                      {new Date(p.due + 'T00:00:00').getFullYear()}
                    </div>
                  </td>
                  <td style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <div className="ctx-wrap">
                      <button className="icon-btn" style={{ width: 30, height: 30 }}
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}>
                        <Icon name="moreV" size={17} />
                      </button>
                      {openMenuId === p.id && (
                        <div className="ctx-menu" style={{ right: 0, top: 38 }}>
                          {!p.closed && (
                            <button className="ctx-item" onClick={() => { navigate('/board'); setOpenMenuId(null); }}>
                              <Icon name="board" size={15} />Ver en tablero
                            </button>
                          )}
                          <button className="ctx-item" onClick={() => { onToast(`Enlace de "${p.name}" copiado`); navigator.clipboard.writeText(p.id).catch(() => {}); setOpenMenuId(null); }}>
                            <Icon name="share" size={15} />Copiar enlace
                          </button>
                          <div className="ctx-sep" />
                          {p.closed ? (
                            <button className="ctx-item" onClick={() => { closeMut.mutate({ id: p.id, closed: false }); setOpenMenuId(null); }}>
                              <Icon name="unlock" size={15} />Reabrir proyecto
                            </button>
                          ) : (
                            <button className="ctx-item danger" onClick={() => { closeMut.mutate({ id: p.id, closed: true }); setOpenMenuId(null); }}>
                              <Icon name="lock" size={15} />Cerrar proyecto
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editProject && (
        <EditProjectModal
          project={editProject}
          onClose={() => setEditProject(null)}
          onSaved={onToast}
        />
      )}
    </div>
  );
}
