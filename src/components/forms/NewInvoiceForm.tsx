import { useState } from 'react';
import Modal, { Field } from '../Modal';
import Icon from '../Icon';
import { useDB } from '../../context/DBContext';
import {
  TIPO_COMPROBANTE, TIPO_DOC_IDENTIDAD, LABEL_TIPO,
  serieDefault, calcItem, type TipoComprobante, type TipoDocIdentidad,
} from '../../lib/nubefact';
import type { InvoiceItem } from '../../types';

interface CreateInvoiceInput {
  id: string; client_id: string; project_id: string; amount: number;
  status: string; issued_date: string; due_date: string; concept: string;
  tipo_comprobante: number; serie: string; numero_doc: number;
  cliente_tipo_doc: number; cliente_num_doc: string; moneda: number;
  total_gravada: number; total_igv: number;
  items: InvoiceItem[];
  tipo_nota?: number | null; doc_ref_tipo?: number | null;
  doc_ref_serie?: string | null; doc_ref_numero?: number | null;
}

interface Props {
  onCreate: (inv: CreateInvoiceInput) => void;
  onClose: () => void;
  loading?: boolean;
}

const TIPOS_DOC = [
  { val: 6, label: 'RUC (6)' },
  { val: 1, label: 'DNI (1)' },
  { val: 7, label: 'Pasaporte (7)' },
  { val: 4, label: 'Carnet extranjería (4)' },
  { val: 0, label: 'Sin documento (0)' },
];

const UND_MEDIDA = [
  { val: 'ZZ',  label: 'ZZ — Servicio' },
  { val: 'NIU', label: 'NIU — Unidad' },
  { val: 'KGM', label: 'KGM — Kilogramo' },
  { val: 'MTR', label: 'MTR — Metro' },
  { val: 'HUR', label: 'HUR — Hora' },
];

const IGV_TIPOS = [
  { val: 1, label: 'Gravado' },
  { val: 3, label: 'Exonerado' },
  { val: 5, label: 'Inafecto' },
];

type ItemDraft = {
  unidad: string; codigo: string; descripcion: string;
  cantidad: string; valorUnitario: string; tipoIgv: number;
};

function emptyItem(): ItemDraft {
  return { unidad: 'ZZ', codigo: '', descripcion: '', cantidad: '1', valorUnitario: '', tipoIgv: 1 };
}

function draftToItem(d: ItemDraft): InvoiceItem {
  const qty = parseFloat(d.cantidad) || 1;
  const vu  = parseFloat(d.valorUnitario) || 0;
  const calc = calcItem(vu, qty, 18, d.tipoIgv);
  return {
    unidad_de_medida: d.unidad,
    codigo: d.codigo || 'SRV',
    descripcion: d.descripcion,
    cantidad: qty,
    descuento: '',
    tipo_de_igv: d.tipoIgv,
    anticipo_regularizacion: false,
    anticipo_documento_serie: '',
    anticipo_documento_numero: '',
    ...calc,
  };
}

export default function NewInvoiceForm({ onCreate, onClose, loading }: Props) {
  const db = useDB();
  const today = new Date().toISOString().slice(0, 10);

  const [tipo, setTipo] = useState<TipoComprobante>(TIPO_COMPROBANTE.FACTURA);
  const [serie, setSerie] = useState('F001');
  const [numeroDoc, setNumeroDoc] = useState(() => {
    const nums = db.invoices.map(i => i.numeroDoc || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  });
  const [clienteId, setClienteId] = useState(db.clients[0]?.id || '');
  const [projectId, setProjectId] = useState('');
  const [concept, setConcept] = useState('');
  const [clienteTipoDoc, setClienteTipoDoc] = useState<TipoDocIdentidad>(TIPO_DOC_IDENTIDAD.RUC);
  const [clienteNumDoc, setClienteNumDoc] = useState('');
  const moneda = 1 as const;
  const [issued, setIssued] = useState(today);
  const [due, setDue] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [status, setStatus] = useState('Pendiente');
  // Para notas
  const [tipoNota, setTipoNota] = useState(1);
  const [docRefTipo, setDocRefTipo] = useState(1);
  const [docRefSerie, setDocRefSerie] = useState('F001');
  const [docRefNumero, setDocRefNumero] = useState('');
  // Items
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [err, setErr] = useState(false);

  const esNota = tipo === TIPO_COMPROBANTE.NOTA_CREDITO || tipo === TIPO_COMPROBANTE.NOTA_DEBITO;

  const handleTipo = (t: TipoComprobante) => {
    setTipo(t);
    setSerie(serieDefault(t));
    if (t === TIPO_COMPROBANTE.FACTURA) setClienteTipoDoc(TIPO_DOC_IDENTIDAD.RUC);
    if (t === TIPO_COMPROBANTE.BOLETA)  setClienteTipoDoc(TIPO_DOC_IDENTIDAD.DNI);
  };

  const projects = db.projects.filter(p => p.client === clienteId && !p.closed);

  const setItem = (i: number, k: keyof ItemDraft, v: string | number) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const addItem    = () => setItems(p => [...p, emptyItem()]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));

  const builtItems = items.map(draftToItem);
  const totalGravada = builtItems.filter(it => it.tipo_de_igv === 1).reduce((s, it) => s + it.subtotal, 0);
  const totalIgv     = builtItems.reduce((s, it) => s + it.igv, 0);
  const totalAmount  = builtItems.reduce((s, it) => s + it.total, 0);

  const TIPO_NOTA_OPTS = tipo === TIPO_COMPROBANTE.NOTA_CREDITO
    ? [
        { val: 1, label: 'Anulación de la operación' },
        { val: 2, label: 'Anulación por error en RUC' },
        { val: 3, label: 'Corrección en descripción' },
        { val: 4, label: 'Descuento global' },
        { val: 5, label: 'Descuento por ítem' },
        { val: 6, label: 'Devolución total' },
        { val: 7, label: 'Devolución por ítem' },
        { val: 8, label: 'Bonificación' },
        { val: 9, label: 'Disminución en el valor' },
      ]
    : [
        { val: 1, label: 'Intereses por mora' },
        { val: 2, label: 'Aumento en el valor' },
        { val: 3, label: 'Penalidades / otros conceptos' },
      ];

  const submit = () => {
    const hasItems = items.some(it => it.descripcion.trim() && parseFloat(it.valorUnitario) > 0);
    if (!concept.trim() || !clienteNumDoc.trim() || !hasItems) { setErr(true); return; }

    const nums = db.invoices.map(i => parseInt(i.id.split('-')[1]) || 0);
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    const prefix = LABEL_TIPO[tipo].slice(0, 3).toUpperCase();

    onCreate({
      id: `${prefix}-${String(n).padStart(4, '0')}`,
      client_id: clienteId,
      project_id: projectId || '',
      amount: parseFloat(totalAmount.toFixed(2)),
      status,
      issued_date: issued,
      due_date: due,
      concept: concept.trim(),
      tipo_comprobante: tipo,
      serie,
      numero_doc: numeroDoc,
      cliente_tipo_doc: clienteTipoDoc,
      cliente_num_doc: clienteNumDoc.trim(),
      moneda,
      total_gravada: parseFloat(totalGravada.toFixed(2)),
      total_igv: parseFloat(totalIgv.toFixed(2)),
      items: builtItems,
      ...(esNota ? {
        tipo_nota: tipoNota,
        doc_ref_tipo: docRefTipo,
        doc_ref_serie: docRefSerie,
        doc_ref_numero: parseInt(docRefNumero) || null,
      } : {
        tipo_nota: null, doc_ref_tipo: null, doc_ref_serie: null, doc_ref_numero: null,
      }),
    });
  };

  const fmt = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Modal
      icoName="billing" icoBg="var(--amber-bg)" icoColor="var(--amber)"
      title="Nuevo comprobante" subtitle="Crea y emite un comprobante electrónico"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Guardando…' : <><Icon name="plus" size={16} sw={2.4} />Crear comprobante</>}
          </button>
        </>
      }
    >
      {/* ── Tipo de comprobante ── */}
      <div className="field full" style={{ marginBottom: 18 }}>
        <label>Tipo de comprobante</label>
        <div className="chips-row">
          {([1, 3, 7, 8] as TipoComprobante[]).map(t => (
            <button key={t}
              className={'chip-toggle' + (tipo === t ? ' on' : '')}
              onClick={() => handleTipo(t)}>
              {LABEL_TIPO[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid">
        {/* Serie y número */}
        <Field label="Serie">
          <input className="input" value={serie} onChange={e => setSerie(e.target.value.toUpperCase())} />
        </Field>
        <Field label="Número">
          <input className="input" type="number" min={1} value={numeroDoc}
            onChange={e => setNumeroDoc(parseInt(e.target.value) || 1)} />
        </Field>

        {/* Cliente */}
        <Field label="Cliente" required>
          <select className="select full" value={clienteId}
            onChange={e => { setClienteId(e.target.value); setProjectId(''); }}>
            {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Proyecto">
          <select className="select full" value={projectId}
            onChange={e => setProjectId(e.target.value)}>
            <option value="">— Ninguno —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        {/* Datos SUNAT del cliente */}
        <Field label="Tipo de documento">
          <select className="select full" value={clienteTipoDoc}
            onChange={e => setClienteTipoDoc(Number(e.target.value) as TipoDocIdentidad)}>
            {TIPOS_DOC.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
          </select>
        </Field>
        <Field label={clienteTipoDoc === 6 ? 'RUC' : clienteTipoDoc === 1 ? 'DNI' : 'N° documento'} required>
          <input className={'input' + (err && !clienteNumDoc.trim() ? ' invalid' : '')}
            placeholder={clienteTipoDoc === 6 ? '20123456789' : '12345678'}
            value={clienteNumDoc} onChange={e => setClienteNumDoc(e.target.value)} />
        </Field>

        {/* Concepto y moneda */}
        <Field label="Concepto / descripción general" required full>
          <input className={'input' + (err && !concept.trim() ? ' invalid' : '')}
            placeholder="Ej. Hito 3 · Desarrollo backend"
            value={concept} onChange={e => setConcept(e.target.value)} />
        </Field>

        <Field label="Estado de cobro">
          <select className="select full" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagada">Pagada</option>
            <option value="Vencida">Vencida</option>
          </select>
        </Field>
        <Field label="Fecha de emisión">
          <input className="input" type="date" value={issued} onChange={e => setIssued(e.target.value)} />
        </Field>
        <Field label="Fecha de vencimiento">
          <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} />
        </Field>
      </div>

      {/* ── Datos del documento de referencia (solo para notas) ── */}
      {esNota && (
        <div style={{ marginTop: 20, padding: '16px 18px', background: 'var(--amber-bg)', borderRadius: 'var(--r-md)', border: '1px solid var(--amber)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--amber)', marginBottom: 12 }}>
            Documento que modifica
          </div>
          <div className="form-grid">
            <Field label="Tipo de nota">
              <select className="select full" value={tipoNota} onChange={e => setTipoNota(Number(e.target.value))}>
                {TIPO_NOTA_OPTS.map(o => <option key={o.val} value={o.val}>{o.val}. {o.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo doc. referencia">
              <select className="select full" value={docRefTipo} onChange={e => setDocRefTipo(Number(e.target.value))}>
                <option value={1}>01 — Factura</option>
                <option value={3}>03 — Boleta</option>
              </select>
            </Field>
            <Field label="Serie referencia">
              <input className="input" placeholder="F001" value={docRefSerie}
                onChange={e => setDocRefSerie(e.target.value.toUpperCase())} />
            </Field>
            <Field label="Número referencia">
              <input className="input" type="number" min={1} placeholder="1"
                value={docRefNumero} onChange={e => setDocRefNumero(e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {/* ── Líneas de detalle ── */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
            Líneas de detalle {err && !items.some(it => it.descripcion.trim() && parseFloat(it.valorUnitario) > 0) && (
              <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 12 }}> — Agrega al menos un ítem</span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={addItem}>
            <Icon name="plus" size={15} sw={2.4} />Agregar línea
          </button>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 70px 90px 70px 80px', gap: 0, background: 'var(--surface-2)', padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
            {['Unidad', 'Código', 'Descripción', 'Cant.', 'V. Unit. (sin IGV)', 'IGV', ''].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
            ))}
          </div>

          {items.map((it, i) => {
            const calc = it.valorUnitario && it.cantidad ? calcItem(parseFloat(it.valorUnitario) || 0, parseFloat(it.cantidad) || 1, 18, it.tipoIgv) : null;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 70px 90px 70px 80px', gap: 0, padding: '8px 10px', borderBottom: i < items.length - 1 ? '1px solid var(--line-2)' : 'none', alignItems: 'center' }}>
                <select className="select" style={{ height: 32, fontSize: 11, padding: '0 4px' }} value={it.unidad}
                  onChange={e => setItem(i, 'unidad', e.target.value)}>
                  {UND_MEDIDA.map(u => <option key={u.val} value={u.val}>{u.val}</option>)}
                </select>
                <input className="input" style={{ height: 32, fontSize: 12, padding: '0 7px' }}
                  placeholder="SRV001" value={it.codigo} onChange={e => setItem(i, 'codigo', e.target.value)} />
                <input className="input" style={{ height: 32, fontSize: 12, padding: '0 7px' }}
                  placeholder="Descripción del servicio"
                  value={it.descripcion} onChange={e => setItem(i, 'descripcion', e.target.value)} />
                <input className="input" style={{ height: 32, fontSize: 12, padding: '0 7px', textAlign: 'right' }}
                  type="number" min="0.01" step="0.01" placeholder="1"
                  value={it.cantidad} onChange={e => setItem(i, 'cantidad', e.target.value)} />
                <input className="input" style={{ height: 32, fontSize: 12, padding: '0 7px', textAlign: 'right' }}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={it.valorUnitario} onChange={e => setItem(i, 'valorUnitario', e.target.value)} />
                <select className="select" style={{ height: 32, fontSize: 11, padding: '0 4px' }} value={it.tipoIgv}
                  onChange={e => setItem(i, 'tipoIgv', Number(e.target.value))}>
                  {IGV_TIPOS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
                <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', background: 'none', border: 'none', cursor: items.length > 1 ? 'pointer' : 'not-allowed', opacity: items.length > 1 ? 1 : 0.3 }}
                  onClick={() => items.length > 1 && removeItem(i)}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Totales ── */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 240, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--ink-2)' }}>
            <span>Subtotal gravado</span>
            <span style={{ fontWeight: 700 }}>{fmt(totalGravada)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>
            <span>IGV (18%)</span>
            <span style={{ fontWeight: 700 }}>{fmt(totalIgv)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
            <span>Total</span>
            <span>S/ {fmt(totalAmount)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
