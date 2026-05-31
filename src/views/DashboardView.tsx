import { useNavigate } from 'react-router-dom';
import { useDB } from '../context/DBContext';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import AvatarStack from '../components/AvatarStack';
import PrioTag from '../components/PrioTag';
import { money, fmtDateShort, isLate } from '../lib/utils';

interface Props {
  openTask: (id: string) => void;
}

export default function DashboardView({ openTask }: Props) {
  const navigate = useNavigate();
  const db = useDB();

  const activeProjects = db.projects.filter(p => p.status !== 'Completado').length;
  const openTasks = db.tasks.filter(t => t.col !== 'done').length;
  const monthBilled = db.invoices
    .filter(i => i.issued.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, i) => s + i.amount, 0);
  const pending = db.invoices.filter(i => i.status !== 'Pagada').reduce((s, i) => s + i.amount, 0);

  const kpis = [
    { label: 'Proyectos activos',  val: activeProjects,    ico: 'briefcase', color: 'var(--blue)',   bg: 'var(--blue-50)',   delta: '+1',  up: true,  sub: 'vs. mes pasado' },
    { label: 'Tareas abiertas',    val: openTasks,         ico: 'board',     color: 'var(--purple)', bg: 'var(--purple-bg)', delta: '-4',  up: true,  sub: 'esta semana'    },
    { label: 'Facturado este mes', val: money(monthBilled),ico: 'dollar',    color: 'var(--green)',  bg: 'var(--green-bg)',  delta: '+18%',up: true,  sub: 'vs. mes anterior'},
    { label: 'Por cobrar',         val: money(pending),    ico: 'clock',     color: 'var(--amber)',  bg: 'var(--amber-bg)',  delta: `${db.invoices.filter(i => i.status !== 'Pagada').length} facturas`, up: null, sub: 'pendientes' },
  ];

  const maxRev = Math.max(...db.revenue.map(r => r.billed), 1);
  const dist = db.columns.map(c => ({ ...c, n: db.tasks.filter(t => t.col === c.id).length }));
  const totalTasks = db.tasks.length || 1;
  let acc = 0;
  const segments = dist.map(d => {
    const from = acc / totalTasks * 100;
    acc += d.n;
    return `${d.color} ${from}% ${acc / totalTasks * 100}%`;
  });
  const donePct = Math.round((dist.find(d => d.id === 'done')?.n || 0) / totalTasks * 100);
  const upcoming = [...db.tasks].filter(t => t.col !== 'done' && t.due)
    .sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const me = db.byId['mh'] || db.team[0];

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-title">
            Buenas {greeting()}, {me?.name.split(' ')[0] || 'Admin'} 👋
          </div>
          <div className="page-desc">
            Herrera Consulting · {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm"><Icon name="calendar" size={15} />Últimos 30 días</button>
          <button className="btn btn-primary btn-sm"><Icon name="download" size={15} />Reporte</button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map(k => (
          <div className="card kpi" key={k.label}>
            <div className="kpi-top">
              <div className="kpi-ico" style={{ background: k.bg, color: k.color }}>
                <Icon name={k.ico} size={20} />
              </div>
            </div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val">{k.val}</div>
            <div className={'kpi-delta ' + (k.up === null ? '' : k.up ? 'up' : 'down')}>
              {k.up !== null && <Icon name={k.up ? 'arrowUp' : 'arrowDown'} size={13} sw={2.6} />}
              {k.delta} <span>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad">
            <div className="section-head">
              <div className="section-title">Ingresos</div>
              <div className="flex gap-12" style={{ fontSize: 12, fontWeight: 700 }}>
                <span className="flex gap-8">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--blue)', display:'inline-block' }}></span>Facturado
                </span>
                <span className="flex gap-8">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: '#c5d6f7', display:'inline-block' }}></span>Cobrado
                </span>
              </div>
            </div>
            <div className="chart">
              {db.revenue.map(r => (
                <div className="bar-col" key={r.m}>
                  <div className="bar-stack" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                    <div className="bar" style={{ height: (r.billed / maxRev * 100) + '%', background: 'var(--blue)' }}
                      title={`Facturado: ${money(r.billed * 1000)}`} />
                    <div className="bar" style={{ height: (r.collected / maxRev * 100) + '%', background: '#c5d6f7' }}
                      title={`Cobrado: ${money(r.collected * 1000)}`} />
                  </div>
                  <div className="bar-label">{r.m}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 6 }}>
              Montos en miles de pesos (MXN)
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-head">
              <div className="section-title">Proyectos en curso</div>
              <button className="btn-subtle" onClick={() => navigate('/projects')}>
                Ver todos <Icon name="chevR" size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {db.projects.filter(p => p.status !== 'Completado').slice(0, 5).map(p => {
                const c = db.clientById[p.client];
                return (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 90px', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: '1px solid var(--line-2)' }}>
                    <div className="flex gap-12" style={{ minWidth: 0 }}>
                      <div className="client-logo" style={{ width: 32, height: 32, fontSize: 12, borderRadius: 8, background: p.color }}>{p.code}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{c?.name}</div>
                      </div>
                    </div>
                    <div className="prog-cell">
                      <div className="progressbar" style={{ flex: 1 }}>
                        <span style={{ width: p.progress + '%', background: p.color }}></span>
                      </div>
                      <span className="pct">{p.progress}%</span>
                    </div>
                    <div style={{ justifySelf: 'end' }}>
                      <AvatarStack ids={p.team} size={26} max={3} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 18 }}>Distribución de tareas</div>
            <div className="donut-wrap">
              <div className="donut" style={{ background: `conic-gradient(${segments.join(', ')})` }}>
                <div className="donut-center">
                  <div className="dc-val">{donePct}%</div>
                  <div className="dc-label">completado</div>
                </div>
              </div>
              <div className="legend">
                {dist.map(d => (
                  <div className="legend-row" key={d.id}>
                    <span className="ldot" style={{ background: d.color }}></span>
                    <span className="ln">{d.title}</span>
                    <span className="lv">{d.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 8 }}>Próximos vencimientos</div>
            {upcoming.map(t => {
              const p = db.projectById[t.project];
              if (!p) return null;
              const d = new Date(t.due + 'T00:00:00');
              return (
                <div className="deadline-item" key={t.id} onClick={() => openTask(t.id)} style={{ cursor: 'pointer' }}>
                  <div className="deadline-date">
                    <div className="dd-day" style={{ color: isLate(t.due) ? 'var(--red)' : 'var(--ink)' }}>
                      {d.getDate()}
                    </div>
                    <div className="dd-mon">{d.toLocaleDateString('es-MX', { month: 'short' })}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div className="flex gap-8" style={{ marginTop: 3 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }}></span>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{p.code}</span>
                      <PrioTag value={t.prio} showLabel={false} />
                    </div>
                  </div>
                  {t.assignee && <Avatar id={t.assignee} size={26} />}
                </div>
              );
            })}
          </div>

          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 8 }}>Actividad reciente</div>
            {db.activity.slice(0, 6).map((a, i) => (
              <div className="activity-item" key={i}>
                <Avatar id={a.who} size={30} />
                <div style={{ flex: 1 }}>
                  <div className="a-text">
                    <b>{db.byId[a.who]?.name || a.who}</b> {a.action} <b>{a.target}</b>
                  </div>
                  <div className="a-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'buenos días';
  if (h < 19) return 'buenas tardes';
  return 'buenas noches';
}
