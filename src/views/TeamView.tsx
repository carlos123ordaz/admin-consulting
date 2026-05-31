import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB, invalidateDB } from '../context/DBContext';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Modal, { Field, ColorPick } from '../components/Modal';
import { apiUpdateMember, apiDeleteMember, apiResetMemberPassword } from '../lib/api';
import type { TeamMember, ModalType } from '../types';

interface Props {
  search: string;
  openModal: (type: ModalType) => void;
  onToast: (msg: string) => void;
}

const PALETTE = ['#2A6FDB','#6d4bd6','#0d8a8a','#d2453d','#c2790b','#1f8a5b','#3457a8','#a8347a'];
const PAGE_SIZE = 10;

type SortKey = 'name' | 'role' | 'tasks' | 'load';

function loadColor(l: number) {
  if (l >= 90) return 'var(--red)';
  if (l >= 75) return 'var(--amber)';
  return 'var(--green)';
}

// ---- Edit Modal ----
function EditMemberModal({ member, onClose, onSaved }: {
  member: TeamMember;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [email, setEmail] = useState(member.email);
  const [color, setColor] = useState(member.color);
  const [load, setLoad] = useState(member.load);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  const saveMut = useMutation({
    mutationFn: async () => {
      await apiUpdateMember({ id: member.id, name: name.trim(), role: role.trim(), email: email.trim(), color, load_pct: load });
      if (newPwd) {
        if (newPwd.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        if (newPwd !== confirmPwd) throw new Error('Las contraseñas no coinciden.');
        if (!member.authUserId) throw new Error('Este integrante no tiene cuenta de acceso vinculada.');
        await apiResetMemberPassword(member.authUserId, newPwd);
      }
    },
    onSuccess: () => {
      invalidateDB(qc);
      onSaved(`${name.trim()} actualizado`);
      onClose();
    },
    onError: (e: Error) => setPwdErr(e.message),
  });

  const save = () => {
    setPwdErr('');
    if (!name.trim()) return;
    saveMut.mutate();
  };

  return (
    <Modal
      icoName="team" icoBg="var(--blue-50)" icoColor="var(--blue)"
      title="Editar integrante" subtitle={member.id}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saveMut.isPending}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        {/* Perfil */}
        <div className="field full" style={{ marginBottom: 2 }}>
          <div className="nm-section-label">Perfil</div>
        </div>
        <Field label="Nombre" required full>
          <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Rol">
          <input className="input" value={role} onChange={e => setRole(e.target.value)} />
        </Field>
        <Field label="Correo">
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
        <Field label={`Carga de trabajo: ${load}%`} full>
          <input
            type="range" min={0} max={100} value={load}
            onChange={e => setLoad(Number(e.target.value))}
            style={{ width: '100%', accentColor: loadColor(load) }}
          />
        </Field>
        <Field label="Color de avatar" full>
          <ColorPick value={color} onChange={setColor} palette={PALETTE} />
        </Field>

        {/* Contraseña */}
        {member.authUserId && (
          <>
            <div className="field full" style={{ marginBottom: 2, marginTop: 8 }}>
              <div className="nm-section-label">Cambiar contraseña <span style={{ fontWeight: 600, color: 'var(--muted)' }}>(opcional)</span></div>
            </div>
            <Field label="Nueva contraseña">
              <input className="input" type="password" placeholder="Mínimo 6 caracteres"
                value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            </Field>
            <Field label="Confirmar contraseña">
              <input className="input" type="password" placeholder="Repite la contraseña"
                value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            </Field>
          </>
        )}

        {pwdErr && (
          <div className="field full">
            <div className="login-error" style={{ marginTop: 0 }}>{pwdErr}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---- Delete Confirm Modal ----
function DeleteMemberModal({ member, onClose, onDeleted }: {
  member: TeamMember;
  onClose: () => void;
  onDeleted: (msg: string) => void;
}) {
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: () => apiDeleteMember(member.id),
    onSuccess: () => {
      invalidateDB(qc);
      onDeleted(`${member.name} eliminado del equipo`);
      onClose();
    },
  });

  return (
    <Modal
      icoName="close" icoBg="#fff0f0" icoColor="var(--red)"
      title="Eliminar integrante"
      subtitle={member.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={deleteMut.isPending}>Cancelar</button>
          <button
            className="btn btn-danger"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? 'Eliminando…' : <><Icon name="close" size={15} />Eliminar</>}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        ¿Estás seguro de que deseas eliminar a <strong>{member.name}</strong>?
        {member.authUserId
          ? ' Se eliminará su perfil y su acceso al sistema.'
          : ' Se eliminará su perfil del equipo.'}
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>Esta acción no se puede deshacer.</p>
    </Modal>
  );
}

// ---- Main TeamView ----
export default function TeamView({ search, openModal, onToast }: Props) {
  const db = useDB();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null);

  const avgLoad = db.team.length
    ? Math.round(db.team.reduce((s, m) => s + m.load, 0) / db.team.length)
    : 0;

  const q = search.trim().toLowerCase();
  const filtered = db.team.filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
  );

  const sorted = [...filtered].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    if (sortKey === 'name') { va = a.name; vb = b.name; }
    else if (sortKey === 'role') { va = a.role; vb = b.role; }
    else if (sortKey === 'tasks') { va = a.tasks; vb = b.tasks; }
    else if (sortKey === 'load') { va = a.load; vb = b.load; }
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
          <div className="page-title">Equipo</div>
          <div className="page-desc">
            {db.team.length} integrantes · carga promedio {avgLoad}%
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openModal('member')}>
            <Icon name="plus" size={16} sw={2.4} />Agregar persona
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className={thClass('name')} onClick={() => handleSort('name')}>
                Integrante <span className="sort-arrow" />
              </th>
              <th className={thClass('role')} onClick={() => handleSort('role')}>
                Rol <span className="sort-arrow" />
              </th>
              <th>Correo</th>
              <th className={thClass('tasks')} onClick={() => handleSort('tasks')}>
                Tareas <span className="sort-arrow" />
              </th>
              <th>Proyectos</th>
              <th className={thClass('load')} onClick={() => handleSort('load')}>
                Carga <span className="sort-arrow" />
              </th>
              <th>Acceso</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id}>
                <td>
                  <div className="flex gap-12" style={{ alignItems: 'center' }}>
                    <Avatar id={m.id} size={34} />
                    <div>
                      <div className="cell-strong">{m.name}</div>
                      <div className="cell-muted" style={{ fontSize: 11.5 }}>{m.id}</div>
                    </div>
                  </div>
                </td>
                <td>{m.role}</td>
                <td style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>{m.email}</td>
                <td>{m.tasks}</td>
                <td>{m.projects}</td>
                <td style={{ minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="progressbar" style={{ flex: 1 }}>
                      <span style={{ width: m.load + '%', background: loadColor(m.load) }}></span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: loadColor(m.load), minWidth: 36, textAlign: 'right' }}>
                      {m.load}%
                    </span>
                  </div>
                </td>
                <td>
                  {m.authUserId
                    ? <span className="badge" style={{ background: 'var(--green-bg)', color: 'var(--green)', fontSize: 11 }}>Activo</span>
                    : <span className="badge badge-gray" style={{ fontSize: 11 }}>Sin acceso</span>
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      className="icon-btn"
                      style={{ width: 30, height: 30 }}
                      title="Editar integrante"
                      onClick={() => setEditMember(m)}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      className="icon-btn danger"
                      style={{ width: 30, height: 30 }}
                      title="Eliminar integrante"
                      onClick={() => setDeleteMember(m)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty" style={{ padding: '32px 0', textAlign: 'center' }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>
          <Icon name="chevL" size={15} />Anterior
        </button>
        <span className="page-info">Página {safePage} de {totalPages} · {filtered.length} integrantes</span>
        <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>
          Siguiente<Icon name="chevR" size={15} />
        </button>
      </div>

      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={msg => { onToast(msg); setEditMember(null); }}
        />
      )}

      {deleteMember && (
        <DeleteMemberModal
          member={deleteMember}
          onClose={() => setDeleteMember(null)}
          onDeleted={msg => { onToast(msg); setDeleteMember(null); }}
        />
      )}
    </div>
  );
}
