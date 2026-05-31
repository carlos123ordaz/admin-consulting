import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../Icon';
import type { ModalType } from '../../types';

const PATH_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/board':     'Tablero',
  '/projects':  'Proyectos',
  '/clients':   'Clientes',
  '/team':      'Equipo',
  '/billing':   'Facturación',
  '/timeline':  'Cronograma',
};

const NOTIFICATIONS = [
  { id: 1, ico: 'board',    bg: 'var(--blue-50)',   c: 'var(--blue)',   text: '<b>Diego Salas</b> movió BAU-128 a <b>En revisión</b>', time: 'hace 12 min', unread: true  },
  { id: 2, ico: 'billing',  bg: 'var(--amber-bg)',  c: 'var(--amber)',  text: 'La factura <b>FAC-0003</b> venció ayer', time: 'hace 1 h',   unread: true  },
  { id: 3, ico: 'team',     bg: 'var(--purple-bg)', c: 'var(--purple)', text: '<b>Valeria Cruz</b> te mencionó en CVA-198', time: 'hace 3 h',   unread: true  },
  { id: 4, ico: 'projects', bg: 'var(--green-bg)',  c: 'var(--green)',  text: 'Proyecto <b>App de Citas</b> llegó al 82% de avance', time: 'hace 1 día',  unread: false },
  { id: 5, ico: 'calendar', bg: 'var(--red-bg)',    c: 'var(--red)',    text: 'Entrega de <b>RetailMax</b> en 3 días', time: 'hace 2 días', unread: false },
];

interface TopbarProps {
  search: string;
  setSearch: (s: string) => void;
  openModal: (type: ModalType) => void;
  onToast: (msg: string) => void;
  onMenuToggle: () => void;
}

export default function Topbar({ search, setSearch, openModal, onToast, onMenuToggle }: TopbarProps) {
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<number[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const unread = NOTIFICATIONS.filter(n => n.unread && !readIds.includes(n.id)).length;
  const markAllRead = () => setReadIds(NOTIFICATIONS.map(n => n.id));

  return (
    <header className="topbar">
      <button className="icon-btn topbar-menu-btn" onClick={onMenuToggle} title="Menú">
        <Icon name="menu" size={20} sw={2} />
      </button>
      <div className="crumbs">
        <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 12.5 }}>Herrera</span>
        <span className="sep">/</span>
        <span className="cur">{PATH_LABELS[location.pathname] ?? ''}</span>
      </div>

      <div className="search-center">
        <label className="search">
          <Icon name="search" size={17} sw={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tareas, proyectos, clientes…"
          />
          <kbd>⌘K</kbd>
        </label>
      </div>

      <div className="topbar-actions">
        <CreateMenu openModal={openModal} />

        <div className="ctx-wrap" ref={notifRef}>
          <button className="icon-btn" title="Notificaciones" onClick={() => setNotifOpen(o => !o)}>
            <Icon name="bell" size={19} />
            {unread > 0 && <span className="dot"></span>}
          </button>
          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-head">
                <span className="notif-head-title">Notificaciones {unread > 0 && <span className="badge badge-blue" style={{ fontSize: 10, padding: '1px 6px' }}>{unread}</span>}</span>
                {unread > 0 && <button className="btn-subtle btn-sm" style={{ fontSize: 11.5, height: 28 }} onClick={markAllRead}>Marcar todo leído</button>}
              </div>
              {NOTIFICATIONS.map(n => {
                const isUnread = n.unread && !readIds.includes(n.id);
                return (
                  <div key={n.id} className={'notif-item' + (isUnread ? ' unread' : '')}
                    onClick={() => setReadIds(p => [...p, n.id])}>
                    <div className="notif-ico" style={{ background: n.bg, color: n.c }}>
                      <Icon name={n.ico} size={15} />
                    </div>
                    <div>
                      <div className="notif-text" dangerouslySetInnerHTML={{ __html: n.text }} />
                      <div className="notif-time">{n.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button className="icon-btn" title="Ajustes" onClick={() => onToast('Configuración próximamente')}>
          <Icon name="settings" size={19} />
        </button>
      </div>
    </header>
  );
}

const CREATE_ITEMS = [
  { type: 'task'    as ModalType, label: 'Tarea',    icon: 'board',     bg: 'var(--blue-50)',   c: 'var(--blue)'   },
  { type: 'project' as ModalType, label: 'Proyecto', icon: 'briefcase', bg: 'var(--blue-50)',   c: 'var(--blue)'   },
  { type: 'client'  as ModalType, label: 'Cliente',  icon: 'clients',   bg: 'var(--green-bg)',  c: 'var(--green)'  },
  { type: 'member'  as ModalType, label: 'Persona',  icon: 'team',      bg: 'var(--purple-bg)', c: 'var(--purple)' },
  { type: 'invoice' as ModalType, label: 'Factura',  icon: 'billing',   bg: 'var(--amber-bg)',  c: 'var(--amber)'  },
];

function CreateMenu({ openModal }: { openModal: (type: ModalType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="create-wrap" ref={ref}>
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(o => !o)}>
        <Icon name="plus" size={16} sw={2.4} />Crear
      </button>
      {open && (
        <div className="create-menu">
          <div className="cm-label">Crear nuevo</div>
          {CREATE_ITEMS.map(it => (
            <button key={it.type} onClick={() => { setOpen(false); openModal(it.type); }}>
              <span className="cm-ico" style={{ background: it.bg, color: it.c }}>
                <Icon name={it.icon} size={16} />
              </span>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
