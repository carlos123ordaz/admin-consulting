export type View = 'dashboard' | 'board' | 'projects' | 'clients' | 'team' | 'billing' | 'timeline';
export type ModalType = 'task' | 'project' | 'client' | 'member' | 'invoice';
export type TaskCol = 'todo' | 'progress' | 'review' | 'done';
export type TaskPrio = 'Urgente' | 'Alta' | 'Media' | 'Baja';
export type ProjectStatus = 'Planificación' | 'En progreso' | 'En revisión' | 'Completado';
export type ClientStatus = 'Activo' | 'Inactivo';
export type InvoiceStatus = 'Pagada' | 'Pendiente' | 'Vencida';
export type SprintStatus = 'Planificado' | 'Activo' | 'Completado';

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
  email: string;
  load: number;
  tasks: number;
  projects: number;
  authUserId?: string;
}

export interface Client {
  id: string;
  name: string;
  sector: string;
  color: string;
  logo: string;
  since: string;
  projects: number;
  billed: number;
  contact: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  notes: string;
  status: ClientStatus;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  color: string;
  status: ProjectStatus;
  progress: number;
  team: string[];
  lead: string;
  budget: number;
  spent: number;
  start: string;
  due: string;
  tasks: number;
  openTasks: number;
  closed: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskLink {
  id: string;
  taskId: string;
  url: string;
  title: string;
}

export interface TaskFile {
  id: string;
  taskId: string;
  name: string;
  size: number;
  url: string | null;
}

export interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  goal: string;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  assignee: string;
  prio: TaskPrio;
  col: TaskCol;
  due: string;
  points: number;
  labels: string[];
  desc: string;
  subs: Subtask[];
  sprintId: string | null;
  links: TaskLink[];
  files: TaskFile[];
  createdAt: string;
}

export interface InvoiceItem {
  unidad_de_medida: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  descuento: string;
  subtotal: number;
  tipo_de_igv: number;
  igv: number;
  total: number;
  anticipo_regularizacion: boolean;
  anticipo_documento_serie: string;
  anticipo_documento_numero: string;
}

export interface Invoice {
  id: string;
  client: string;
  project: string;
  amount: number;
  status: InvoiceStatus;
  issued: string;
  due: string;
  concept: string;
  // Facturación electrónica SUNAT
  tipoComprobante: 1 | 3 | 7 | 8;
  serie: string;
  numeroDoc: number;
  clienteTipoDoc: 0 | 1 | 4 | 6 | 7;
  clienteNumDoc: string;
  moneda: 1 | 2;
  totalGravada: number;
  totalIgv: number;
  items: InvoiceItem[];
  sunatEstado: 'emitida' | 'anulada' | 'error' | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  cdrUrl: string | null;
  sunatDesc: string | null;
  tipoNota: number | null;
  docRefTipo: number | null;
  docRefSerie: string | null;
  docRefNumero: number | null;
}

export interface ActivityItem {
  who: string;
  action: string;
  target: string;
  time: string;
}

export interface RevenueMonth {
  m: string;
  billed: number;
  collected: number;
}

export interface Column {
  id: TaskCol;
  title: string;
  color: string;
}

export interface DB {
  team: TeamMember[];
  byId: Record<string, TeamMember>;
  clients: Client[];
  clientById: Record<string, Client>;
  projects: Project[];
  projectById: Record<string, Project>;
  columns: Column[];
  tasks: Task[];
  invoices: Invoice[];
  activity: ActivityItem[];
  revenue: RevenueMonth[];
  PRIO: TaskPrio[];
  sprints: Sprint[];
  activeSprint: Sprint | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  memberId: string | null;
  text: string;
  createdAt: string;
}

export interface ModalState {
  type: ModalType;
  preset?: { col?: TaskCol; project?: string };
}
