import { useState } from 'react';
import Modal, { Field, ColorPick } from '../Modal';
import Avatar from '../Avatar';
import Icon from '../Icon';
import { useDB } from '../../context/DBContext';
import { PALETTE } from '../../lib/utils';

interface CreateProjectInput {
  id: string; code: string; name: string; client_id: string; color: string;
  status: string; lead_id: string; budget: number; start_date: string;
  due_date: string; team: string[];
}

interface Props {
  onCreate: (p: CreateProjectInput) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function NewProjectForm({ onCreate, onClose, loading }: Props) {
  const db = useDB();
  const [f, setF] = useState({
    name: '', code: '', client: db.clients[0]?.id || '', status: 'Planificación',
    lead: db.team[0]?.id || '', team: [] as string[], budget: '', start: '', due: '', color: PALETTE[0],
  });
  const [err, setErr] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF(p => ({ ...p, [k]: v }));
  const toggleMember = (id: string) =>
    set('team', f.team.includes(id) ? f.team.filter(x => x !== id) : [...f.team, id]);

  const submit = () => {
    if (!f.name.trim() || !f.code.trim()) { setErr(true); return; }
    const id = 'p' + Date.now().toString().slice(-6);
    onCreate({
      id, code: f.code.trim().toUpperCase().slice(0, 4), name: f.name.trim(),
      client_id: f.client, color: f.color, status: f.status, lead_id: f.lead,
      budget: Number(f.budget) || 0,
      start_date: f.start || new Date().toISOString().slice(0, 10),
      due_date: f.due || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      team: Array.from(new Set([f.lead, ...f.team])),
    });
  };

  return (
    <Modal icoName="briefcase" icoBg="var(--blue-50)" icoColor="var(--blue)"
      title="Nuevo proyecto" subtitle="Da de alta un proyecto para un cliente"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Creando…' : <><Icon name="plus" size={16} sw={2.4} />Crear proyecto</>}
          </button>
        </>
      }>
      <div className="form-grid">
        <Field label="Nombre del proyecto" required>
          <input className={'input' + (err && !f.name.trim() ? ' invalid' : '')} autoFocus
            placeholder="Ej. App de Reservas" value={f.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Código" required hint="3–4 letras, ej. APR">
          <input className={'input' + (err && !f.code.trim() ? ' invalid' : '')} placeholder="APR"
            maxLength={4} value={f.code}
            onChange={e => set('code', e.target.value.toUpperCase())}
            style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }} />
        </Field>
        <Field label="Cliente" required>
          <select className="select full" value={f.client} onChange={e => set('client', e.target.value)}>
            {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select className="select full" value={f.status} onChange={e => set('status', e.target.value)}>
            {['Planificación', 'En progreso', 'En revisión', 'Completado'].map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Líder de proyecto">
          <select className="select full" value={f.lead} onChange={e => set('lead', e.target.value)}>
            {db.team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Presupuesto (MXN)">
          <div className="input-money">
            <input className="input" type="number" min="0" placeholder="0"
              value={f.budget} onChange={e => set('budget', e.target.value)} />
          </div>
        </Field>
        <Field label="Fecha de inicio">
          <input className="input" type="date" value={f.start} onChange={e => set('start', e.target.value)} />
        </Field>
        <Field label="Fecha de entrega">
          <input className="input" type="date" value={f.due} onChange={e => set('due', e.target.value)} />
        </Field>
        <Field label="Equipo asignado" full hint="Toca para agregar o quitar integrantes">
          <div className="chips-row">
            {db.team.map(m => (
              <button key={m.id} className={'chip-toggle' + (f.team.includes(m.id) ? ' on' : '')}
                onClick={() => toggleMember(m.id)}>
                <Avatar id={m.id} size={20} />{m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color de identificación" full>
          <ColorPick value={f.color} onChange={c => set('color', c)} palette={PALETTE} />
        </Field>
      </div>
    </Modal>
  );
}
