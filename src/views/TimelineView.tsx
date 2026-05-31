import { useState, useMemo } from 'react';
import { useDB } from '../context/DBContext';
import Icon from '../components/Icon';
import { TODAY } from '../lib/utils';
import type { Project } from '../types';

type GranMode = 'month' | 'quarter';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'En progreso':  { bg: 'var(--blue-50)',    color: 'var(--blue-700)' },
  'En revisión':  { bg: 'var(--amber-bg)',   color: 'var(--amber)' },
  'Completado':   { bg: 'var(--green-bg)',   color: 'var(--green)' },
  'Planificación':{ bg: 'var(--purple-bg)',  color: 'var(--purple)' },
};

const RANGE_START = new Date(2025, 8, 1);  // Sep 2025
const RANGE_END   = new Date(2026, 11, 31); // Dec 2026
const SPAN = RANGE_END.getTime() - RANGE_START.getTime();

function datePct(iso: string) {
  return (new Date(iso + 'T00:00:00').getTime() - RANGE_START.getTime()) / SPAN * 100;
}

function isDelayed(p: Project) {
  return p.status !== 'Completado' && new Date(p.due + 'T00:00:00') < TODAY;
}

export default function TimelineView() {
  const db = useDB();
  const [mode, setMode] = useState<GranMode>('month');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  const periods = useMemo(() => {
    if (mode === 'month') {
      return Array.from({ length: 16 }, (_, i) => {
        const d = new Date(2025, 8 + i, 1);
        const label = d.toLocaleDateString('es-MX', { month: 'short' });
        const showYear = i === 0 || label.toLowerCase().startsWith('ene');
        return { label: showYear ? `${label} '${String(d.getFullYear()).slice(2)}` : label, date: d };
      });
    }
    return [
      { label: 'Q4 2025', date: new Date(2025, 9, 1) },
      { label: 'Q1 2026', date: new Date(2026, 0, 1) },
      { label: 'Q2 2026', date: new Date(2026, 3, 1) },
      { label: 'Q3 2026', date: new Date(2026, 6, 1) },
      { label: 'Q4 2026', date: new Date(2026, 9, 1) },
    ];
  }, [mode]);

  const todayPct = (TODAY.getTime() - RANGE_START.getTime()) / SPAN * 100;

  const openProjects = db.projects.filter(p => !p.closed);

  const filtered = openProjects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (clientFilter !== 'all' && p.client !== clientFilter) return false;
    return true;
  });

  // Stats
  const total = openProjects.length;
  const inProgress = openProjects.filter(p => p.status === 'En progreso').length;
  const completed  = openProjects.filter(p => p.status === 'Completado').length;
  const delayed    = openProjects.filter(p => isDelayed(p)).length;

  const hasFilters = statusFilter !== 'all' || clientFilter !== 'all';

  return (
    <div className="page fade-in">
      {/* ─── Header ─── */}
      <div className="page-head">
        <div>
          <div className="page-title">Cronograma</div>
          <div className="page-desc">
            Línea de tiempo de {total} proyectos activos · sep 2025 – dic 2026
          </div>
        </div>
        <div className="page-actions">
          <div className="seg">
            <button className={mode === 'month' ? 'on' : ''} onClick={() => setMode('month')}>Mes</button>
            <button className={mode === 'quarter' ? 'on' : ''} onClick={() => setMode('quarter')}>Trimestre</button>
          </div>
        </div>
      </div>

      {/* ─── Stats cards ─── */}
      <div className="tl-stats">
        <div className="tl-stat">
          <div className="tl-stat-val">{total}</div>
          <div className="tl-stat-label">Total proyectos</div>
        </div>
        <div className="tl-stat tl-stat-blue">
          <div className="tl-stat-val" style={{ color: 'var(--blue)' }}>{inProgress}</div>
          <div className="tl-stat-label">En progreso</div>
        </div>
        <div className="tl-stat tl-stat-green">
          <div className="tl-stat-val" style={{ color: 'var(--green)' }}>{completed}</div>
          <div className="tl-stat-label">Completados</div>
        </div>
        <div className="tl-stat tl-stat-red">
          <div className="tl-stat-val" style={{ color: delayed > 0 ? 'var(--red)' : 'var(--ink-3)' }}>{delayed}</div>
          <div className="tl-stat-label">Retrasados</div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="tl-filters">
        <Icon name="search" size={15} cls="muted" />
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="En progreso">En progreso</option>
          <option value="En revisión">En revisión</option>
          <option value="Completado">Completado</option>
          <option value="Planificación">Planificación</option>
        </select>
        <select className="select" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="all">Todos los clientes</option>
          {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {hasFilters && (
          <button className="btn-subtle" onClick={() => { setStatusFilter('all'); setClientFilter('all'); }}>
            <Icon name="close" size={14} />Limpiar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>
          {filtered.length} de {total} proyectos
        </span>
      </div>

      {/* ─── Gantt ─── */}
      <div className="gantt" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 980 }}>
          {/* Header row */}
          <div className="gantt-head">
            <div className="gh-name">Proyecto</div>
            <div className="gantt-months" style={{ gridTemplateColumns: `repeat(${periods.length}, 1fr)`, position: 'relative' }}>
              {periods.map((p, i) => (
                <div className="gm" key={i}>{p.label}</div>
              ))}
            </div>
          </div>

          {/* Project rows */}
          {filtered.length === 0 && (
            <div className="empty" style={{ padding: '48px 0' }}>
              No hay proyectos con los filtros seleccionados.
            </div>
          )}

          {filtered.map(p => {
            const client  = db.clientById[p.client];
            const delayed = isDelayed(p);
            const barColor = delayed ? 'var(--red)' : p.color;
            const left  = Math.max(0,   datePct(p.start));
            const right = Math.min(100, datePct(p.due));
            const width = Math.max(0, right - left);
            const ss = STATUS_STYLE[p.status] ?? { bg: 'var(--line-2)', color: 'var(--ink-2)' };
            const budgetPct = p.budget > 0 ? Math.min(100, Math.round(p.spent / p.budget * 100)) : 0;

            return (
              <div className="gantt-row tl-project-row" key={p.id}>
                {/* Label */}
                <div className="gantt-label tl-project-label">
                  <div
                    className="client-logo"
                    style={{ width: 34, height: 34, fontSize: 11, borderRadius: 7, background: p.color, flexShrink: 0 }}
                  >
                    {p.code}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="gl-name">{p.name}</div>
                    <div className="gl-client">{client?.name}</div>
                    <div className="tl-badges">
                      <span className="tl-status-badge" style={{ background: ss.bg, color: ss.color }}>
                        {p.status}
                      </span>
                      {delayed && (
                        <span className="tl-status-badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
                          Retrasado
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Budget indicator */}
                  <div className="tl-budget-col">
                    <div className="tl-budget-pct" style={{ color: budgetPct > 90 ? 'var(--red)' : budgetPct > 70 ? 'var(--amber)' : 'var(--green)' }}>
                      {budgetPct}%
                    </div>
                    <div className="tl-budget-label">presup.</div>
                  </div>
                </div>

                {/* Track */}
                <div
                  className="gantt-track"
                  style={{ gridTemplateColumns: `repeat(${periods.length}, 1fr)`, position: 'relative', height: 72 }}
                >
                  {periods.map((_, i) => <div className="grid-line" key={i} />)}

                  {/* Today line */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="gantt-today" style={{ left: todayPct + '%' }} />
                  )}

                  {/* Bar */}
                  {width > 0 && (
                    <div
                      className="gantt-bar tl-bar"
                      style={{ left: left + '%', width: width + '%', background: barColor }}
                      title={`${p.name}\n${p.start} → ${p.due}\nProgreso: ${p.progress}%\nPresupuesto consumido: ${budgetPct}%`}
                    >
                      <div className="gbar-fill" style={{ width: p.progress + '%' }} />
                      <span className="tl-bar-label">{p.progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Legend ─── */}
      <div className="tl-legend">
        <div className="tl-leg-item">
          <span className="tl-leg-swatch" style={{ background: 'var(--blue)' }} />
          Duración del proyecto
        </div>
        <div className="tl-leg-item">
          <span className="tl-leg-swatch" style={{ background: 'rgba(255,255,255,.3)', border: '1px solid rgba(255,255,255,.5)' }} />
          Avance completado
        </div>
        <div className="tl-leg-item">
          <span className="tl-leg-swatch" style={{ background: 'var(--red)' }} />
          Retrasado
        </div>
        <div className="tl-leg-item">
          <span className="tl-leg-line-swatch" />
          Hoy
        </div>
      </div>
    </div>
  );
}
