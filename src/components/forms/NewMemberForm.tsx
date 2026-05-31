import { useState } from 'react';
import Modal, { Field, ColorPick } from '../Modal';
import Icon from '../Icon';
import { PALETTE, initialsFrom } from '../../lib/utils';

interface CreateMemberInput {
  id: string; name: string; initials: string; role: string; color: string;
  email: string; password: string;
}

interface Props {
  onCreate: (m: CreateMemberInput) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function NewMemberForm({ onCreate, onClose, loading }: Props) {
  const [f, setF] = useState({ name: '', role: '', email: '', color: PALETTE[1], password: '', confirm: '' });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF(p => ({ ...p, [k]: v }));
  const initials = initialsFrom(f.name || '');

  const submit = () => {
    if (!f.name.trim()) { setErr('El nombre es obligatorio.'); return; }
    if (!f.email.trim()) { setErr('El correo es obligatorio.'); return; }
    if (f.password.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (f.password !== f.confirm) { setErr('Las contraseñas no coinciden.'); return; }
    setErr(null);
    const id = initials.toLowerCase() + Date.now().toString().slice(-4);
    onCreate({
      id, name: f.name.trim(), initials, role: f.role.trim() || 'Integrante',
      color: f.color,
      email: f.email.trim(),
      password: f.password,
    });
  };

  return (
    <Modal
      icoName="team" icoBg="var(--purple-bg)" icoColor="var(--purple)"
      title="Agregar persona" subtitle="Crea cuenta y perfil para el integrante"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Agregando…' : <><Icon name="plus" size={16} sw={2.4} />Agregar persona</>}
          </button>
        </>
      }
    >
      {/* Vista previa del avatar */}
      <div className="flex gap-12" style={{ marginBottom: 18 }}>
        <div className="avatar" style={{ width: 48, height: 48, background: f.color, fontSize: 18 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{f.name.trim() || 'Nombre completo'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{f.role.trim() || 'Rol en el equipo'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{f.email.trim() || 'correo@empresa.com'}</div>
        </div>
      </div>

      <div className="form-grid">
        {/* Perfil */}
        <div className="field full" style={{ marginBottom: 2 }}>
          <div className="nm-section-label">Perfil</div>
        </div>
        <Field label="Nombre completo" required full>
          <input
            className="input" autoFocus
            placeholder="Ej. Daniela Castro"
            value={f.name} onChange={e => set('name', e.target.value)}
          />
        </Field>
        <Field label="Rol / Puesto">
          <input className="input" placeholder="Ej. Desarrollador Frontend"
            value={f.role} onChange={e => set('role', e.target.value)} />
        </Field>
        <Field label="Color de avatar">
          <ColorPick value={f.color} onChange={c => set('color', c)} palette={PALETTE} />
        </Field>

        {/* Acceso */}
        <div className="field full" style={{ marginBottom: 2, marginTop: 8 }}>
          <div className="nm-section-label">Acceso al sistema</div>
        </div>
        <Field label="Correo electrónico" required full>
          <input className="input" type="email" placeholder="correo@empresa.com"
            value={f.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Contraseña" required>
          <input className="input" type="password" placeholder="Mínimo 6 caracteres"
            value={f.password} onChange={e => set('password', e.target.value)} />
        </Field>
        <Field label="Confirmar contraseña" required>
          <input className="input" type="password" placeholder="Repite la contraseña"
            value={f.confirm} onChange={e => set('confirm', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          />
        </Field>

        {err && (
          <div className="field full">
            <div className="login-error" style={{ marginTop: 0 }}>{err}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
