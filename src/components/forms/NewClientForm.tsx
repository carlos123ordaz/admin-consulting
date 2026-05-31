import { useState } from 'react';
import Modal, { Field, ColorPick } from '../Modal';
import Icon from '../Icon';
import { PALETTE, initialsFrom } from '../../lib/utils';

interface CreateClientInput {
  id: string; name: string; sector: string; color: string; logo: string;
  since: string; contact: string; email: string; phone: string;
  website: string; country: string; notes: string; status: string;
}

interface Props {
  onCreate: (c: CreateClientInput) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function NewClientForm({ onCreate, onClose, loading }: Props) {
  const [f, setF] = useState({
    name: '', sector: '', contact: '', email: '', phone: '',
    website: '', country: '', notes: '', status: 'Activo', color: PALETTE[0],
  });
  const [err, setErr] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF(p => ({ ...p, [k]: v }));
  const logo = initialsFrom(f.name || '');

  const submit = () => {
    if (!f.name.trim()) { setErr(true); return; }
    const id = f.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) + Date.now().toString().slice(-3);
    onCreate({
      id, name: f.name.trim(), sector: f.sector.trim() || 'General', color: f.color, logo,
      since: String(new Date().getFullYear()), contact: f.contact.trim() || '—',
      email: f.email.trim(), phone: f.phone.trim(), website: f.website.trim(),
      country: f.country.trim(), notes: f.notes.trim(), status: f.status,
    });
  };

  return (
    <Modal icoName="clients" icoBg="var(--green-bg)" icoColor="var(--green)"
      title="Nuevo cliente" subtitle="Registra una nueva cuenta"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Creando…' : <><Icon name="plus" size={16} sw={2.4} />Crear cliente</>}
          </button>
        </>
      }>
      <div className="flex gap-12" style={{ marginBottom: 18 }}>
        <div className="client-logo" style={{ background: f.color }}>{logo}</div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{f.name.trim() || 'Nombre del cliente'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{f.sector.trim() || 'Sector'}</div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field full" style={{ marginBottom: 2 }}>
          <div className="nm-section-label">Empresa</div>
        </div>
        <Field label="Nombre / Empresa" required full>
          <input className={'input' + (err && !f.name.trim() ? ' invalid' : '')} autoFocus
            placeholder="Ej. Banco Aurora" value={f.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Sector">
          <input className="input" placeholder="Ej. Fintech / Banca"
            value={f.sector} onChange={e => set('sector', e.target.value)} />
        </Field>
        <Field label="País">
          <input className="input" placeholder="Ej. México"
            value={f.country} onChange={e => set('country', e.target.value)} />
        </Field>
        <Field label="Sitio web">
          <input className="input" placeholder="Ej. https://empresa.com"
            value={f.website} onChange={e => set('website', e.target.value)} />
        </Field>
        <Field label="Color" full>
          <ColorPick value={f.color} onChange={c => set('color', c)} palette={PALETTE} />
        </Field>

        <div className="field full" style={{ marginBottom: 2, marginTop: 8 }}>
          <div className="nm-section-label">Contacto</div>
        </div>
        <Field label="Persona de contacto">
          <input className="input" placeholder="Ej. Ricardo Vélez"
            value={f.contact} onChange={e => set('contact', e.target.value)} />
        </Field>
        <Field label="Correo del contacto">
          <input className="input" type="email" placeholder="Ej. ricardo@empresa.com"
            value={f.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Teléfono" full>
          <input className="input" placeholder="Ej. +52 55 1234 5678"
            value={f.phone} onChange={e => set('phone', e.target.value)} />
        </Field>

        <div className="field full" style={{ marginBottom: 2, marginTop: 8 }}>
          <div className="nm-section-label">Notas internas</div>
        </div>
        <Field label="Notas" full>
          <textarea className="input" rows={3} placeholder="Información adicional, preferencias, acuerdos…"
            value={f.notes} onChange={e => set('notes', e.target.value)}
            style={{ resize: 'vertical', minHeight: 72 }} />
        </Field>

        <Field label="Estado" full>
          <div className="seg">
            {['Activo', 'Inactivo'].map(s => (
              <button key={s} className={f.status === s ? 'on' : ''} onClick={() => set('status', s)}>{s}</button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
