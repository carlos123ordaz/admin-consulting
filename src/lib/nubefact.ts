/**
 * Nubefact REST API — facturación electrónica Perú (SUNAT)
 * Docs: https://www.nubefact.com/integracion
 *
 * Credenciales via variables de entorno (ver .env.example):
 *   VITE_NUBEFACT_RUC, VITE_NUBEFACT_TOKEN,
 *   VITE_NUBEFACT_RAZON_SOCIAL, VITE_NUBEFACT_DIRECCION
 */

export const TIPO_COMPROBANTE = {
  FACTURA:       1,
  BOLETA:        3,
  NOTA_CREDITO:  7,
  NOTA_DEBITO:   8,
} as const;

export type TipoComprobante = typeof TIPO_COMPROBANTE[keyof typeof TIPO_COMPROBANTE];

export const TIPO_DOC_IDENTIDAD = {
  SIN_DOC: 0,
  DNI:     1,
  CARNET:  4,
  RUC:     6,
  PASAPORTE: 7,
} as const;

export type TipoDocIdentidad = typeof TIPO_DOC_IDENTIDAD[keyof typeof TIPO_DOC_IDENTIDAD];

export const TIPO_IGV = {
  GRAVADO_ONEROSA:    1,
  GRAVADO_GRATUITO:   2,
  EXONERADO_ONEROSA:  3,
  EXONERADO_GRATUITO: 4,
  INAFECTO_ONEROSA:   5,
  INAFECTO_GRATUITO:  6,
  EXPORTACION:        7,
} as const;

export const TIPO_NOTA_CREDITO: Record<number, string> = {
  1: 'Anulación de la operación',
  2: 'Anulación por error en el RUC',
  3: 'Corrección por error en descripción',
  4: 'Descuento global',
  5: 'Descuento por ítem',
  6: 'Devolución total',
  7: 'Devolución por ítem',
  8: 'Bonificación',
  9: 'Disminución en el valor',
};

export const TIPO_NOTA_DEBITO: Record<number, string> = {
  1: 'Intereses por mora',
  2: 'Aumento en el valor',
  3: 'Penalidades / otros conceptos',
};

export const MONEDA = { PEN: 1, USD: 2 } as const;
export type Moneda = typeof MONEDA[keyof typeof MONEDA];

export interface NubefactConfig {
  ruc: string;
  token: string;
  razonSocial: string;
  direccion: string;
}

export interface NubefactItem {
  unidad_de_medida: string;        // 'NIU'=unidad, 'ZZ'=servicio, 'KGM'=kg
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;          // precio sin IGV
  precio_unitario: number;         // precio con IGV
  descuento: string;
  subtotal: number;                // valor_unitario × cantidad
  tipo_de_igv: number;
  igv: number;
  total: number;                   // precio_unitario × cantidad
  anticipo_regularizacion: boolean;
  anticipo_documento_serie: string;
  anticipo_documento_numero: string;
}

export interface NubefactPayload {
  operacion: 'generar_comprobante' | 'consultar_comprobante' | 'anular_comprobante';
  tipo_de_comprobante: TipoComprobante;
  serie: string;
  numero: number;
  sunat_transaction?: number;
  cliente_tipo_de_documento?: TipoDocIdentidad;
  cliente_numero_de_documento?: string;
  cliente_denominacion?: string;
  cliente_direccion?: string;
  cliente_email?: string;
  cliente_email_1?: string;
  cliente_email_2?: string;
  fecha_de_emision?: string;       // 'DD-MM-YYYY'
  fecha_de_vencimiento?: string;
  moneda?: Moneda;
  tipo_de_cambio?: string;
  porcentaje_de_igv?: number;
  total_gravada?: number;
  total_exonerada?: number;
  total_inafecta?: number;
  total_igv?: number;
  total?: number;
  detraccion?: boolean;
  observaciones?: string;
  // Notas de crédito / débito
  tipo_de_nota?: number;
  documento_que_se_modifica_tipo?: number;
  documento_que_se_modifica_serie?: string;
  documento_que_se_modifica_numero?: number;
  // Anulación
  motivo?: string;
  items?: NubefactItem[];
}

export interface NubefactResponse {
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  cadena_para_codigo_qr?: string;
  codigo_hash?: string;
  sunat_description?: string;
  sunat_responsecode?: string;
  numero?: number;
  serie?: string;
  errors?: string[];
  accepted_by_sunat?: boolean;
}

const BASE = 'https://api.nubefact.com/api/v1';

async function request(config: NubefactConfig, body: NubefactPayload): Promise<NubefactResponse> {
  const url = `${BASE}/${config.ruc}/${config.token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: NubefactResponse = await res.json().catch(() => ({}));
  if (!res.ok || (data.errors && data.errors.length > 0)) {
    throw new Error(data.errors?.join('\n') || data.sunat_description || `Error ${res.status}`);
  }
  return data;
}

export async function nubefactEmitir(
  config: NubefactConfig,
  payload: Omit<NubefactPayload, 'operacion'>
): Promise<NubefactResponse> {
  return request(config, { ...payload, operacion: 'generar_comprobante' });
}

export async function nubefactConsultar(
  config: NubefactConfig,
  tipo: TipoComprobante, serie: string, numero: number
): Promise<NubefactResponse> {
  return request(config, { operacion: 'consultar_comprobante', tipo_de_comprobante: tipo, serie, numero });
}

export async function nubefactAnular(
  config: NubefactConfig,
  tipo: TipoComprobante, serie: string, numero: number, motivo: string
): Promise<NubefactResponse> {
  return request(config, { operacion: 'anular_comprobante', tipo_de_comprobante: tipo, serie, numero, motivo });
}

/** Convierte 'YYYY-MM-DD' → 'DD-MM-YYYY' requerido por Nubefact */
export function toNubefactDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

/** Calcula IGV e item totals dado precio sin IGV y cantidad */
export function calcItem(
  valorUnitario: number,
  cantidad: number,
  pctIgv = 18,
  tipoIgv = 1
): Pick<NubefactItem, 'valor_unitario' | 'precio_unitario' | 'subtotal' | 'igv' | 'total'> {
  const gravado = tipoIgv === 1;
  const subtotal = parseFloat((valorUnitario * cantidad).toFixed(2));
  const igv = gravado ? parseFloat((subtotal * pctIgv / 100).toFixed(2)) : 0;
  const precioUnitario = gravado
    ? parseFloat((valorUnitario * (1 + pctIgv / 100)).toFixed(2))
    : valorUnitario;
  return {
    valor_unitario: valorUnitario,
    precio_unitario: precioUnitario,
    subtotal,
    igv,
    total: parseFloat((subtotal + igv).toFixed(2)),
  };
}

/** Lee config desde variables de entorno Vite */
export function getNubefactConfig(): NubefactConfig {
  return {
    ruc:         import.meta.env.VITE_NUBEFACT_RUC          ?? '',
    token:       import.meta.env.VITE_NUBEFACT_TOKEN         ?? '',
    razonSocial: import.meta.env.VITE_NUBEFACT_RAZON_SOCIAL  ?? '',
    direccion:   import.meta.env.VITE_NUBEFACT_DIRECCION     ?? '',
  };
}

/** Serie sugerida por tipo de comprobante */
export function serieDefault(tipo: TipoComprobante, esFactura = true): string {
  switch (tipo) {
    case 1: return 'F001';
    case 3: return 'B001';
    case 7: return esFactura ? 'FC01' : 'BC01';
    case 8: return esFactura ? 'FD01' : 'BD01';
  }
}

export const LABEL_TIPO: Record<TipoComprobante, string> = {
  1: 'Factura',
  3: 'Boleta',
  7: 'Nota de Crédito',
  8: 'Nota de Débito',
};
