import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB, invalidateDB } from '../context/DBContext';
import Icon from '../components/Icon';
import StatusBadge from '../components/StatusBadge';
import Modal, { Field, ColorPick } from '../components/Modal';
import { money } from '../lib/utils';
import { apiUpdateClient, apiDeleteClient } from '../lib/api';
import type { Client, ModalType, ClientStatus } from '../types';

interface Props {
  search: string;
  openModal: (type: ModalType) => void;
  onToast: (msg: string) => void;
}

const PALETTE = ['#2A6FDB','#6d4bd6','#0d8a8a','#d2453d','#c2790b','#1f8a5b','#3457a8','#a8347a'];
const PAGE_SIZE = 10;

type SortKey = 'name' | 'sector' | 'contact' | 'status' | 'billed' | 'projects';

function DeleteClientModal({ client, onClose, onDeleted }: {
  client: Client;
  onClose: () => void;
  onDeleted: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => apiDeleteClient(client.id),
    onSuccess: () => { invalidateDB(qc); onDeleted(`Cliente «${client.name}» eliminado`); onClose(); },
  });

  return (
    <Modal
      icoName="close" icoBg="#fff0f0" icoColor="var(--red)"
      title="Eliminar cliente" subtitle={client.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={mut.isPending}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? 'Eliminando…' : <><Icon name="trash" size={15} />Eliminar</>}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        ¿Estás seguro de que deseas eliminar a <strong>{client.name}</strong>?
        {client.projects > 0 && (
          <span style={{ color: 'var(--red)', display: 'block', marginTop: 6 }}>
            Este cliente tiene {client.projects} proyecto(s) asociado(s). Elimínalo(s) primero.
          </span>
        )}
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>Esta acción no se puede deshacer.</p>
    </Modal>
  );
}

function EditClientModal({
  client,
  onClose,
  onSaved,
  onDelete,
}: {
  client: Client;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(client.name);
  const [sector, setSector] = useState(client.sector);
  const [contact, setContact] = useState(client.contact === '—' ? '' : client.contact);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone);
  const [website, setWebsite] = useState(client.website);
  const [country, setCountry] = useState(client.country);
  const [notes, setNotes] = useState(client.notes);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [color, setColor] = useState(client.color);

  const mut = useMutation({
    mutationFn: apiUpdateClient,
    onSuccess: () => {
      invalidateDB(qc);
      onSaved(`Cliente «${name}» actualizado`);
      onClose();
    },
  });

  const save = () => {
    if (!name.trim()) return;
    mut.mutate({
      id: client.id, name: name.trim(), sector: sector.trim() || 'General',
      contact: contact.trim() || '—', email: email.trim(), phone: phone.trim(),
      website: website.trim(), country: country.trim(), notes: notes.trim(),
      status, color,
    });
  };

  return (
    <Modal
      icoName="clients"
      icoBg="var(--blue-50)"
      icoColor="var(--blue)"
      title="Editar cliente"
      subtitle={client.id}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger" onClick={onDelete} disabled={mut.isPending} style={{ marginRight: 'auto' }}>
            <Icon name="trash" size={14} />Eliminar
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={mut.isPending}>
            {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full" style={{ marginBottom: 2 }}>
          <div className="nm-section-label">Empresa</div>
        </div>
        <Field label="Nombre / Empresa" required full>
          <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Sector">
          <input className="input" value={sector} onChange={e => setSector(e.target.value)} />
        </Field>
        <Field label="País">
          <input className="input" placeholder="Ej. México" value={country} onChange={e => setCountry(e.target.value)} />
        </Field>
        <Field label="Sitio web">
          <input className="input" placeholder="https://…" value={website} onChange={e => setWebsite(e.target.value)} />
        </Field>
        <Field label="Estado">
          <select className="select full" value={status} onChange={e => setStatus(e.target.value as ClientStatus)}>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </Field>
        <Field label="Color" full>
          <ColorPick value={color} onChange={setColor} palette={PALETTE} />
        </Field>

        <div className="field full" style={{ marginBottom: 2, marginTop: 8 }}>
          <div className="nm-section-label">Contacto</div>
        </div>
        <Field label="Persona de contacto">
          <input className="input" value={contact} onChange={e => setContact(e.target.value)} />
        </Field>
        <Field label="Correo del contacto">
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
        <Field label="Teléfono" full>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
        </Field>

        <div className="field full" style={{ marginBottom: 2, marginTop: 8 }}>
          <div className="nm-section-label">Notas internas</div>
        </div>
        <Field label="Notas" full>
          <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Preferencias, acuerdos, información relevante…"
            style={{ resize: 'vertical', minHeight: 72 }} />
        </Field>
      </div>
    </Modal>
  );
}

export default function ClientsView({ search, openModal, onToast }: Props) {
  const db = useDB();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  const q = search.trim().toLowerCase();

  const filtered = db.clients.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
      || c.contact.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  );

  const sorted = [...filtered].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    if (sortKey === 'name') { va = a.name; vb = b.name; }
    else if (sortKey === 'sector') { va = a.sector; vb = b.sector; }
    else if (sortKey === 'contact') { va = a.contact; vb = b.contact; }
    else if (sortKey === 'status') { va = a.status; vb = b.status; }
    else if (sortKey === 'billed') { va = a.billed; vb = b.billed; }
    else if (sortKey === 'projects') { va = a.projects; vb = b.projects; }
    const cmp = typeof va === 'number' ? va - (vb as number) : (va as string).localeCompare(vb as string);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const thClass = (key: SortKey) =>
    'th-sort' + (sortKey === key ? (sortDir === 'asc' ? ' sort-asc' : ' sort-desc') : '');

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-desc">
            {db.clients.length} cuentas · {db.clients.filter(c => c.status === 'Activo').length} activas
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openModal('client')}>
            <Icon name="plus" size={16} sw={2.4} />Nuevo cliente
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className={thClass('name')} onClick={() => handleSort('name')}>
                Cliente <span className="sort-arrow" />
              </th>
              <th className={thClass('sector')} onClick={() => handleSort('sector')}>
                Sector <span className="sort-arrow" />
              </th>
              <th className={thClass('contact')} onClick={() => handleSort('contact')}>
                Contacto <span className="sort-arrow" />
              </th>
              <th>País</th>
              <th className={thClass('status')} onClick={() => handleSort('status')}>
                Estado <span className="sort-arrow" />
              </th>
              <th className={thClass('billed')} onClick={() => handleSort('billed')}>
                Facturado <span className="sort-arrow" />
              </th>
              <th className={thClass('projects')} onClick={() => handleSort('projects')}>
                Proyectos <span className="sort-arrow" />
              </th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setEditClient(c)}>
                <td>
                  <div className="flex gap-12">
                    <div className="client-logo" style={{ width: 34, height: 34, fontSize: 12.5, borderRadius: 5, background: c.color }}>{c.logo}</div>
                    <div>
                      <div className="cell-strong">{c.name}</div>
                      <div className="cell-muted" style={{ fontSize: 11.5 }}>{c.id}</div>
                    </div>
                  </div>
                </td>
                <td>{c.sector}</td>
                <td>
                  <div>
                    <div>{c.contact}</div>
                    {c.email && (
                      <div className="cell-muted" style={{ fontSize: 11.5 }}>{c.email}</div>
                    )}
                    {c.phone && (
                      <div className="cell-muted" style={{ fontSize: 11.5 }}>{c.phone}</div>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--ink-3)', fontSize: 13 }}>{c.country || '—'}</td>
                <td><StatusBadge value={c.status} /></td>
                <td><span className="cell-strong">{money(c.billed)}</span></td>
                <td>{c.projects}</td>
                <td style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{c.since}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="empty" style={{ padding: '32px 0', textAlign: 'center' }}>Sin clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          className="page-btn"
          disabled={safePage === 1}
          onClick={() => setPage(p => p - 1)}
        >
          <Icon name="chevL" size={15} />Anterior
        </button>
        <span className="page-info">Página {safePage} de {totalPages} · {filtered.length} registros</span>
        <button
          className="page-btn"
          disabled={safePage === totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Siguiente<Icon name="chevR" size={15} />
        </button>
      </div>

      {editClient && !deleteClient && (
        <EditClientModal
          client={editClient}
          onClose={() => setEditClient(null)}
          onSaved={onToast}
          onDelete={() => { setDeleteClient(editClient); setEditClient(null); }}
        />
      )}

      {deleteClient && (
        <DeleteClientModal
          client={deleteClient}
          onClose={() => setDeleteClient(null)}
          onDeleted={msg => { onToast(msg); setDeleteClient(null); }}
        />
      )}
    </div>
  );
}
