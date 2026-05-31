import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../Icon';
import Avatar from '../Avatar';
import { useDB } from '../../context/DBContext';
import { supabase } from '../../lib/supabase';
import type { View } from '../../types';

const NAV = [
  { id: 'dashboard' as View, label: 'Dashboard',   icon: 'dashboard', path: '/dashboard' },
  { id: 'board'     as View, label: 'Tablero',     icon: 'board',     path: '/board'     },
  { id: 'projects'  as View, label: 'Proyectos',   icon: 'projects',  path: '/projects'  },
  { id: 'clients'   as View, label: 'Clientes',    icon: 'clients',   path: '/clients'   },
  { id: 'team'      as View, label: 'Equipo',      icon: 'team',      path: '/team'      },
  { id: 'billing'   as View, label: 'Facturación', icon: 'billing',   path: '/billing'   },
  { id: 'timeline'  as View, label: 'Cronograma',  icon: 'timeline',  path: '/timeline'  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const db = useDB();
  const navigate = useNavigate();
  const location = useLocation();
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthEmail(data.session?.user?.email || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthEmail(s?.user?.email || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const me = (authEmail ? db.team.find(m => m.email === authEmail) : null) ?? db.team[0] ?? null;

  const counts: Partial<Record<View, number>> = {
    board:    db.tasks.filter(t => t.col !== 'done').length,
    projects: db.projects.filter(p => !p.closed && p.status !== 'Completado').length,
    clients:  db.clients.length,
    billing:  db.invoices.filter(i => i.status !== 'Pagada').length,
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
  };

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div className={'sidebar-backdrop' + (isOpen ? ' show' : '')} onClick={onClose} />
      <aside className={'sidebar' + (isOpen ? ' open' : '')}>
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-name">Herrera</div>
            <div className="brand-sub">CONSULTING</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Espacio de trabajo</div>
          {NAV.slice(0, 2).map(n => (
            <NavItem key={n.id} item={n} active={location.pathname === n.path}
              onClick={() => handleNav(n.path)} count={counts[n.id]} />
          ))}
          <div className="nav-label">Gestión</div>
          {NAV.slice(2).map(n => (
            <NavItem key={n.id} item={n} active={location.pathname === n.path}
              onClick={() => handleNav(n.path)} count={counts[n.id]} />
          ))}
        </nav>

        {me && (
          <div className="sidebar-foot">
            <div className="ctx-wrap" ref={menuRef} style={{ width: '100%' }}>
              <button className="user-chip" onClick={() => setMenuOpen(o => !o)}>
                <Avatar id={me.id} size={34} />
                <div className="meta">
                  <div className="n">{me.name}</div>
                  <div className="r">{me.role}</div>
                </div>
                <Icon name="chevD" size={15} cls="muted" />
              </button>
              {menuOpen && (
                <div className="ctx-menu user-menu">
                  <div className="user-menu-info">
                    <Avatar id={me.id} size={36} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5 }}>{me.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginTop: 1, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {authEmail || me.email}
                      </div>
                    </div>
                  </div>
                  <div className="ctx-sep" />
                  <button className="ctx-item" onClick={handleLogout}>
                    <Icon name="logout" size={15} />Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function NavItem({ item, active, onClick, count }: {
  item: typeof NAV[0]; active: boolean; onClick: () => void; count?: number;
}) {
  return (
    <button className={'nav-item' + (active ? ' active' : '')} onClick={onClick}>
      <Icon name={item.icon} size={18} />
      {item.label}
      {count != null && count > 0 && <span className="count">{count}</span>}
    </button>
  );
}
