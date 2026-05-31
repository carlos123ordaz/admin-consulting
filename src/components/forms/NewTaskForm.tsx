import { useState, useEffect } from 'react';
import { useDB } from '../../context/DBContext';
import Icon from '../Icon';
import Avatar from '../Avatar';
import RichTextEditor from '../RichTextEditor';
import { LABEL_OPTIONS } from '../../lib/utils';
import type { TaskCol, TaskPrio } from '../../types';

const COL_BG: Record<string, string> = { todo: '#e9ebf0', progress: '#dde9fd', review: '#fbf0db', done: '#e6f4ec' };
const COL_FG: Record<string, string> = { todo: '#475067', progress: '#1a4fa3', review: '#a8690a', done: '#177a4e' };

interface CreateTaskInput {
  id: string; title: string; project_id: string; assignee_id: string;
  priority: string; col: string; due_date: string; points: number;
  description: string; labels: string[]; subtitles: string[];
  sprint_id?: string | null;
}

interface Props {
  onCreate: (t: CreateTaskInput) => void;
  onClose: () => void;
  preset?: { col?: TaskCol; project?: string; sprintId?: string };
  loading?: boolean;
}

export default function NewTaskForm({ onCreate, onClose, preset, loading }: Props) {
  const db = useDB();
  const [f, setF] = useState({
    title: '', project: preset?.project || db.projects[0]?.id || '',
    assignee: '', prio: 'Media' as TaskPrio,
    col: preset?.col || 'todo' as TaskCol,
    due: '', points: 5, desc: '', labels: [] as string[],
  });
  const [subs, setSubs] = useState<string[]>([]);
  const [subInput, setSubInput] = useState('');
  const [err, setErr] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF(p => ({ ...p, [k]: v }));
  const toggleLabel = (l: string) =>
    set('labels', f.labels.includes(l) ? f.labels.filter(x => x !== l) : [...f.labels, l]);

  const p = db.projectById[f.project];
  const nums = db.tasks.filter(t => t.project === f.project).map(t => parseInt(t.id.split('-')[1]) || 0);
  const nextKey = p ? `${p.code}-${(nums.length ? Math.max(...nums) : 100) + 1}` : 'NEW-001';

  const addSub = () => { if (subInput.trim()) { setSubs([...subs, subInput.trim()]); setSubInput(''); } };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const submit = () => {
    if (!f.title.trim()) { setErr(true); return; }
    onCreate({
      id: nextKey, title: f.title.trim(), project_id: f.project,
      assignee_id: f.assignee || p?.lead || '', priority: f.prio, col: f.col,
      due_date: f.due || '', points: Number(f.points) || 0,
      description: f.desc.trim() || '', labels: f.labels, subtitles: subs,
      sprint_id: preset?.sprintId || null,
    });
  };

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal issue" role="dialog">
        <div className="issue-head">
          <span className="kid">
            <span className="checkmark" style={{ width: 16, height: 16 }}><Icon name="check" size={10} sw={3.5} /></span>
            {nextKey}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>· Nueva tarea</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="close" size={18} /></button>
          </div>
        </div>

        <div className="issue-body">
          <div className="issue-main">
            <textarea className={'issue-title-input' + (err && !f.title.trim() ? ' invalid' : '')}
              rows={1} autoFocus placeholder="¿Qué hay que hacer?" value={f.title}
              onChange={e => set('title', e.target.value)}
              onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />

            <div className="issue-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => document.getElementById('sub-input')?.focus()}>
                <Icon name="plus" size={15} sw={2.4} />Subtarea
              </button>
            </div>

            <div className="issue-label">Descripción</div>
            <div className="issue-rte">
              <RichTextEditor
                content={f.desc}
                onChange={v => set('desc', v)}
                editable
                placeholder="Agrega una descripción más detallada…"
              />
            </div>

            <div className="issue-label">
              Subtareas {subs.length > 0 && <span style={{ color: 'var(--ink-3)', fontWeight: 700 }}>· {subs.length}</span>}
            </div>
            {subs.map((s, i) => (
              <div className="subtask" key={i}>
                <div className="check"></div>
                <span className="st-title">{s}</span>
                <button className="icon-btn" style={{ width: 26, height: 26 }}
                  onClick={() => setSubs(subs.filter((_, idx) => idx !== i))}><Icon name="close" size={14} /></button>
              </div>
            ))}
            <div className="subtask-add">
              <input id="sub-input" className="input" placeholder="Añadir subtarea y pulsa Enter"
                value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} />
              <button className="btn btn-ghost" type="button" onClick={addSub}><Icon name="plus" size={16} sw={2.4} /></button>
            </div>
          </div>

          <div className="issue-side">
            <div className="dl" style={{ marginBottom: 7 }}>Estado</div>
            <select className="status-pill-select" value={f.col} onChange={e => set('col', e.target.value as TaskCol)}
              style={{ background: COL_BG[f.col], color: COL_FG[f.col] }}>
              {db.columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <div style={{ marginTop: 14, border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '2px 14px', background: 'var(--surface)' }}>
              <div className="detail-row">
                <div className="dl">Proyecto</div>
                <select className="select" style={{ width: '100%', height: 36, fontSize: 12.5 }}
                  value={f.project} onChange={e => set('project', e.target.value)}>
                  {db.projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                </select>
              </div>
              <div className="detail-row">
                <div className="dl">Persona asignada</div>
                <select className="select" style={{ width: '100%', height: 36, fontSize: 12.5 }}
                  value={f.assignee} onChange={e => set('assignee', e.target.value)}>
                  <option value="">Sin asignar</option>
                  {db.team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="detail-row">
                <div className="dl">Prioridad</div>
                <select className="select" style={{ width: '100%', height: 36, fontSize: 12.5 }}
                  value={f.prio} onChange={e => set('prio', e.target.value as TaskPrio)}>
                  {db.PRIO.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </div>
              <div className="detail-row">
                <div className="dl">Fecha de vencimiento</div>
                <input className="input" type="date" style={{ height: 36, fontSize: 12.5 }}
                  value={f.due} onChange={e => set('due', e.target.value)} />
              </div>
              <div className="detail-row">
                <div className="dl">Estimación (pts)</div>
                <input className="input" type="number" min="0" style={{ height: 36, fontSize: 12.5 }}
                  value={f.points} onChange={e => set('points', Number(e.target.value))} />
              </div>
              <div className="detail-row">
                <div className="dl">Etiquetas</div>
                <div className="chips-row">
                  {LABEL_OPTIONS.slice(0, 8).map(l => (
                    <button key={l} type="button"
                      className={'chip-toggle' + (f.labels.includes(l) ? ' on' : '')}
                      style={{ padding: '5px 10px', fontSize: 11.5 }} onClick={() => toggleLabel(l)}>{l}</button>
                  ))}
                </div>
              </div>
              {p?.lead && (
                <div className="detail-row">
                  <div className="dl">Informador</div>
                  <div className="dv" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
                    <Avatar id={p.lead} size={22} />{db.byId[p.lead]?.name}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Creando…' : <><Icon name="plus" size={16} sw={2.4} />Crear tarea</>}
          </button>
        </div>
      </div>
    </div>
  );
}
