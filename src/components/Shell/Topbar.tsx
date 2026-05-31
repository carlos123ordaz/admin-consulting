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

interface TopbarProps {
  search: string;
  setSearch: (s: string) => void;
  openModal: (type: ModalType) => void;
  onToast: (msg: string) => void;
  onMenuToggle: () => void;
}

export default function Topbar({ search, setSearch, openModal, onMenuToggle }: TopbarProps) {
  const location = useLocation();

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
