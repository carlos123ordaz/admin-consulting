import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB, invalidateDB } from '../context/DBContext';
import Icon from '../components/Icon';
import StatusBadge from '../components/StatusBadge';
import Modal, { Field } from '../components/Modal';
import { money, fmtDateShort } from '../lib/utils';
import { apiUpdateInvoiceStatus, apiEmitirSUNAT, apiAnularSUNAT } from '../lib/api';
import { LABEL_TIPO, type TipoComprobante } from '../lib/nubefact';
import type { Invoice, ModalType } from '../types';

interface Props {
  search: string;
  openModal: (type: ModalType) => void;
  onToast: (msg: string) => void;
}

const STATUS_TABS = ['Todas', 'Pagada', 'Pendiente', 'Vencida'];

const SUNAT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  emitida:  { label: 'SUNAT ✓', bg: 'var(--green-bg)',  color: 'var(--green)'  },
  anulada:  { label: 'Anulada',  bg: 'var(--red-bg)',    color: 'var(--red)'    },
  error:    { label: 'Error',    bg: 'var(--red-bg)',    color: 'var(--red)'    },
};

const TIPO_BADGE: Record<TipoComprobante, { label: string; bg: string; color: string }> = {
  1: { label: 'FAC', bg: 'var(--blue-50)',   color: 'var(--blue-700)' },
  3: { label: 'BOL', bg: 'var(--purple-bg)', color: 'var(--purple)'   },
  7: { label: 'N/C', bg: 'var(--amber-bg)',  color: 'var(--amber)'    },
  8: { label: 'N/D', bg: 'var(--teal-bg)',   color: 'var(--teal)'     },
};

// ── Modal de emisión a SUNAT ──────────────────────────────────────────────────
function EmitirModal({ invoice, onClose, onDone }: {
  invoice: Invoice; onClose: () => void; onDone: (msg: string) => void;
}) {
  const db = useDB();
  const qc = useQueryClient();
  const client = db.clientById[invoice.client];
  const [nombre, setNombre]  = useState(client?.name || '');
  const [dir, setDir]        = useState(client?.country ? `${client.country}` : '');

  const mut = useMutation({
    mutationFn: () => apiEmitirSUNAT(invoice, nombre, dir),
    onSuccess: () => { invalidateDB(qc); onDone(`${invoice.id} emitida a SUNAT correctamente`); onClose(); },
    onError: (e: Error) => onDone(`Error SUNAT: ${e.message}`),
  });

  return (
    <Modal
      icoName="send" icoBg="var(--blue-50)" icoColor="var(--blue)"
      title="Emitir a SUNAT" subtitle={`${LABEL_TIPO[invoice.tipoComprobante]} ${invoice.serie}-${String(invoice.numeroDoc).padStart(8, '0')}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={mut.isPending}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? 'Enviando a SUNAT…' : <><Icon name="send" size={15} />Emitir</>}
          </button>
        </>
      }
    >
      <div style={{ padding: '4px 0 10px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14 }}>
        Se enviará el comprobante a <b>Nubefact → SUNAT</b>. Asegúrate de que los datos del cliente coincidan con el RUC/DNI registrado en SUNAT.
      </div>
      <div className="form-grid">
        <Field label="Razón social / nombre" required full>
          <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} />
        </Field>
        <Field label="Dirección" required full>
          <input className="input" placeholder="Av. Lima 123, Lima" value={dir} onChange={e => setDir(e.target.value)} />
        </Field>
      </div>
      <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--blue-50)', borderRadius: 'var(--r-md)', fontSize: 12.5, color: 'var(--blue-700)' }}>
        <b>Tipo:</b> {LABEL_TIPO[invoice.tipoComprobante]} ·{' '}
        <b>Serie:</b> {invoice.serie}-{String(invoice.numeroDoc).padStart(8, '0')} ·{' '}
        <b>Doc. cliente:</b> {invoice.clienteNumDoc} ·{' '}
        <b>Total:</b> {invoice.moneda === 2 ? '$ ' : 'S/ '}{money(invoice.amount).replace('$', '').trim()}
      </div>
    </Modal>
  );
}

// ── Modal de anulación ────────────────────────────────────────────────────────
function AnularModal({ invoice, onClose, onDone }: {
  invoice: Invoice; onClose: () => void; onDone: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const mut = useMutation({
    mutationFn: () => apiAnularSUNAT(invoice, motivo.trim()),
    onSuccess: () => { invalidateDB(qc); onDone(`${invoice.id} anulada en SUNAT`); onClose(); },
    onError: (e: Error) => onDone(`Error anulación: ${e.message}`),
  });
  return (
    <Modal
      icoName="close" icoBg="var(--red-bg)" icoColor="var(--red)"
      title="Anular comprobante" subtitle={`${invoice.id} · ${LABEL_TIPO[invoice.tipoComprobante]}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={mut.isPending}>Cancelar</button>
          <button className="btn btn-primary" style={{ background: 'var(--red)' }}
            onClick={() => mut.mutate()} disabled={mut.isPending || !motivo.trim()}>
            {mut.isPending ? 'Anulando…' : 'Anular comprobante'}
          </button>
        </>
      }
    >
      <Field label="Motivo de anulación" required full>
        <input className="input" autoFocus placeholder="Ej. Error en datos del cliente"
          value={motivo} onChange={e => setMotivo(e.target.value)} />
      </Field>
      <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--red)', fontWeight: 600 }}>
        Esta acción comunica la anulación a SUNAT y no puede revertirse.
      </p>
    </Modal>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export default function BillingView({ search, openModal, onToast }: Props) {
  const db = useDB();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('Todas');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [emitirInv, setEmitirInv] = useState<Invoice | null>(null);
  const [anularInv, setAnularInv] = useState<Invoice | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const q = search.trim().toLowerCase();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markPaidMut = useMutation({
    mutationFn: (id: string) => apiUpdateInvoiceStatus(id, 'Pagada'),
    onSuccess: () => { invalidateDB(qc); onToast('Factura marcada como pagada'); },
  });

  const total   = db.invoices.reduce((s, i) => s + i.amount, 0);
  const paid    = db.invoices.filter(i => i.status === 'Pagada').reduce((s, i) => s + i.amount, 0);
  const pending = db.invoices.filter(i => i.status === 'Pendiente').reduce((s, i) => s + i.amount, 0);
  const overdue = db.invoices.filter(i => i.status === 'Vencida').reduce((s, i) => s + i.amount, 0);

  const emitidas = db.invoices.filter(i => i.sunatEstado === 'emitida').length;

  const summary = [
    { label: 'Facturado total', val: total,   ico: 'billing',     bg: 'var(--line-2)',   ic: 'var(--ink-2)'  },
    { label: 'Cobrado',         val: paid,    ico: 'checkCircle', bg: 'var(--green-bg)', ic: 'var(--green)'  },
    { label: 'Pendiente',       val: pending, ico: 'clock',       bg: 'var(--amber-bg)', ic: 'var(--amber)'  },
    { label: 'Vencido',         val: overdue, ico: 'flag',        bg: 'var(--red-bg)',   ic: 'var(--red)'    },
  ];

  const rows = db.invoices.filter(inv => {
    if (filter !== 'Todas' && inv.status !== filter) return false;
    const c = db.clientById[inv.client];
    if (q && !inv.id.toLowerCase().includes(q) && !c?.name.toLowerCase().includes(q) && !inv.concept.toLowerCase().includes(q)) return false;
    return true;
  });

  const exportCSV = () => {
    const header = 'ID,Tipo,Serie,Num,Cliente,Concepto,Emitida,Vencimiento,Estado,SUNAT,Monto';
    const body = rows.map(inv => {
      const c = db.clientById[inv.client];
      return `${inv.id},${LABEL_TIPO[inv.tipoComprobante]},${inv.serie},${inv.numeroDoc},${c?.name || ''},${inv.concept},${inv.issued},${inv.due},${inv.status},${inv.sunatEstado || ''},${inv.amount}`;
    }).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'comprobantes.csv'; a.click();
    URL.revokeObjectURL(url);
    onToast('Comprobantes exportados a CSV');
  };

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-title">Facturación</div>
          <div className="page-desc">
            {db.invoices.length} comprobantes · {emitidas} emitidos a SUNAT
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
            <Icon name="download" size={15} />Exportar CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('invoice')}>
            <Icon name="plus" size={16} sw={2.4} />Nuevo comprobante
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        {summary.map(s => (
          <div className="card kpi" key={s.label}>
            <div className="kpi-top">
              <div className="kpi-ico" style={{ background: s.bg, color: s.ic }}>
                <Icon name={s.ico} size={20} />
              </div>
            </div>
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-val">{money(s.val)}</div>
          </div>
        ))}
      </div>

      <div className="tabbar">
        {STATUS_TABS.map(t => {
          const n = t === 'Todas' ? db.invoices.length : db.invoices.filter(i => i.status === t).length;
          return (
            <button key={t} className={'tb' + (filter === t ? ' active' : '')} onClick={() => setFilter(t)}>
              {t} <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="table-wrap" ref={menuRef}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Comprobante</th><th>Cliente</th><th>Concepto</th>
              <th>Emitida</th><th>Vencimiento</th><th>Estado pago</th>
              <th>SUNAT</th>
              <th style={{ textAlign: 'right' }}>Monto</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(inv => {
              const c = db.clientById[inv.client];
              const tipoBadge = TIPO_BADGE[inv.tipoComprobante] ?? TIPO_BADGE[1];
              const sunat = inv.sunatEstado ? SUNAT_BADGE[inv.sunatEstado] : null;
              const serieNum = `${inv.serie}-${String(inv.numeroDoc).padStart(8, '0')}`;
              return (
                <tr key={inv.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span className="badge" style={{ background: tipoBadge.bg, color: tipoBadge.color, fontSize: 10, padding: '2px 6px' }}>
                          {tipoBadge.label}
                        </span>
                        <span className="cell-mono cell-strong" style={{ fontSize: 12 }}>{serieNum}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{inv.id}</span>
                    </div>
                  </td>
                  <td>
                    {c && (
                      <div className="flex gap-8">
                        <div className="client-logo" style={{ width: 24, height: 24, fontSize: 10, borderRadius: 4, background: c.color }}>{c.logo}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {inv.clienteNumDoc && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{inv.clienteNumDoc}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="cell-muted">{inv.concept}</td>
                  <td className="cell-muted">{fmtDateShort(inv.issued)}</td>
                  <td style={inv.status === 'Vencida' ? { color: 'var(--red)', fontWeight: 700 } : { color: 'var(--ink-3)' }}>
                    {fmtDateShort(inv.due)}
                  </td>
                  <td><StatusBadge value={inv.status} /></td>
                  <td>
                    {sunat ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="badge" style={{ background: sunat.bg, color: sunat.color, fontSize: 10, padding: '2px 7px', width: 'fit-content' }}>
                          {sunat.label}
                        </span>
                        {inv.pdfUrl && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                              onClick={e => e.stopPropagation()}>
                              <Icon name="eye" size={12} />PDF
                            </a>
                            {inv.xmlUrl && (
                              <a href={inv.xmlUrl} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                                onClick={e => e.stopPropagation()}>
                                <Icon name="download" size={12} />XML
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>No emitida</span>
                    )}
                  </td>
                  <td className="cell-strong" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    <div>{inv.moneda === 2 ? '$ ' : 'S/ '}{money(inv.amount).replace('$', '').trim()}</div>
                    {inv.totalIgv > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>IGV: S/ {inv.totalIgv.toFixed(2)}</div>
                    )}
                  </td>
                  <td style={{ position: 'relative' }}>
                    <div className="ctx-wrap">
                      <button className="icon-btn" style={{ width: 30, height: 30 }}
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === inv.id ? null : inv.id); }}>
                        <Icon name="moreV" size={16} />
                      </button>
                      {openMenuId === inv.id && (
                        <div className="ctx-menu" style={{ right: 0, top: 36 }}>
                          {/* Emitir a SUNAT */}
                          {inv.sunatEstado !== 'emitida' && inv.sunatEstado !== 'anulada' && (
                            <button className="ctx-item" onClick={() => { setEmitirInv(inv); setOpenMenuId(null); }}>
                              <Icon name="send" size={14} />Emitir a SUNAT
                            </button>
                          )}
                          {/* Ver PDF */}
                          {inv.pdfUrl && (
                            <a className="ctx-item" href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}
                              onClick={() => setOpenMenuId(null)}>
                              <Icon name="eye" size={14} />Ver PDF
                            </a>
                          )}
                          {/* Marcar pagada */}
                          {inv.status !== 'Pagada' && (
                            <button className="ctx-item" onClick={() => { markPaidMut.mutate(inv.id); setOpenMenuId(null); }}>
                              <Icon name="check" size={14} />Marcar pagada
                            </button>
                          )}
                          {/* Copiar ID */}
                          <button className="ctx-item" onClick={() => { navigator.clipboard.writeText(serieNum).catch(() => {}); onToast(`${serieNum} copiado`); setOpenMenuId(null); }}>
                            <Icon name="share" size={14} />Copiar número
                          </button>
                          {/* Anular */}
                          {inv.sunatEstado === 'emitida' && (
                            <>
                              <div className="ctx-sep" />
                              <button className="ctx-item danger" onClick={() => { setAnularInv(inv); setOpenMenuId(null); }}>
                                <Icon name="close" size={14} />Anular en SUNAT
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {emitirInv && (
        <EmitirModal invoice={emitirInv} onClose={() => setEmitirInv(null)} onDone={msg => { onToast(msg); }} />
      )}
      {anularInv && (
        <AnularModal invoice={anularInv} onClose={() => setAnularInv(null)} onDone={msg => { onToast(msg); }} />
      )}
    </div>
  );
}
