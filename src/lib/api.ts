import { supabase } from './supabase';
import { adminCreateUser, adminDeleteUser, adminUpdateUser } from './supabaseAdmin';
import { formatRelativeTime } from './utils';
import {
  nubefactEmitir, nubefactAnular, getNubefactConfig,
  toNubefactDate, type TipoComprobante,
} from './nubefact';
import type {
  DB, TeamMember, Client, Project, Task, Invoice, InvoiceItem, ActivityItem, RevenueMonth, Column,
  TaskCol, TaskPrio, Sprint, TaskLink, TaskFile, TaskComment,
} from '../types';

export const COLUMNS: Column[] = [
  { id: 'todo', title: 'Por hacer', color: '#8a93a6' },
  { id: 'progress', title: 'En progreso', color: '#2A6FDB' },
  { id: 'review', title: 'En revisión', color: '#c2790b' },
  { id: 'done', title: 'Completado', color: '#1f8a5b' },
];

const MONTH_LABELS: Record<string, string> = {
  '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun',
  '07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic',
};

export async function fetchAll(): Promise<DB> {
  const [teamRes, clientsRes, projectsRes, tasksRes, invoicesRes, activityRes, revenueRes, sprintsRes, linksRes, filesRes] =
    await Promise.all([
      supabase.from('team_members').select('*').order('name'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('projects').select('*, project_members(member_id)').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, subtasks(id, title, done, position)').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('issued_date', { ascending: false }),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('monthly_revenue').select('*').order('month'),
      supabase.from('sprints').select('*').order('created_at', { ascending: false }),
      supabase.from('task_links').select('*'),
      supabase.from('task_files').select('*'),
    ]);

  // Map sprints
  const sprints: Sprint[] = (sprintsRes.data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    startDate: s.start_date || '',
    endDate: s.end_date || '',
    goal: s.goal || '',
  }));

  const activeSprint = sprints.find(s => s.status === 'Activo') || null;

  // Group links and files by task_id
  const linksByTask: Record<string, TaskLink[]> = {};
  (linksRes.data || []).forEach((l: any) => {
    const link: TaskLink = { id: l.id, taskId: l.task_id, url: l.url, title: l.title || '' };
    (linksByTask[l.task_id] ??= []).push(link);
  });

  const filesByTask: Record<string, TaskFile[]> = {};
  (filesRes.data || []).forEach((f: any) => {
    const file: TaskFile = { id: f.id, taskId: f.task_id, name: f.name, size: f.size || 0, url: f.url || null };
    (filesByTask[f.task_id] ??= []).push(file);
  });

  // Map tasks
  const tasks: Task[] = (tasksRes.data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    project: t.project_id,
    assignee: t.assignee_id || '',
    prio: t.priority as TaskPrio,
    col: t.col as TaskCol,
    due: t.due_date || '',
    points: t.points,
    labels: t.labels || [],
    desc: t.description || '',
    subs: ((t.subtasks || []) as any[])
      .sort((a, b) => a.position - b.position)
      .map(s => ({ id: s.id, title: s.title, done: s.done })),
    sprintId: t.sprint_id || null,
    links: linksByTask[t.id] || [],
    files: filesByTask[t.id] || [],
    createdAt: t.created_at || '',
  }));

  // Task counts per project
  const tasksByProject: Record<string, Task[]> = {};
  tasks.forEach(t => { (tasksByProject[t.project] ??= []).push(t); });

  // Map projects
  const projects: Project[] = (projectsRes.data || []).map((p: any) => {
    const pts = tasksByProject[p.id] || [];
    return {
      id: p.id, code: p.code, name: p.name, client: p.client_id, color: p.color,
      status: p.status, progress: p.progress,
      team: (p.project_members || []).map((m: any) => m.member_id),
      lead: p.lead_id, budget: p.budget, spent: p.spent,
      start: p.start_date, due: p.due_date,
      tasks: pts.length, openTasks: pts.filter(t => t.col !== 'done').length,
      closed: p.closed ?? false,
    };
  });

  // Project counts per client
  const projectsByClient: Record<string, number> = {};
  projects.forEach(p => { projectsByClient[p.client] = (projectsByClient[p.client] || 0) + 1; });

  // Map clients
  const clients: Client[] = (clientsRes.data || []).map((c: any) => ({
    id: c.id, name: c.name, sector: c.sector, color: c.color, logo: c.logo,
    since: c.since, projects: projectsByClient[c.id] || 0, billed: c.billed,
    contact: c.contact, email: c.email || '', phone: c.phone || '',
    website: c.website || '', country: c.country || '', notes: c.notes || '',
    status: c.status,
  }));

  // Task/project counts per member
  const tasksByMember: Record<string, number> = {};
  tasks.filter(t => t.col !== 'done').forEach(t => {
    tasksByMember[t.assignee] = (tasksByMember[t.assignee] || 0) + 1;
  });
  const projectsByMember: Record<string, number> = {};
  projects.forEach(p => p.team.forEach(mid => {
    projectsByMember[mid] = (projectsByMember[mid] || 0) + 1;
  }));

  // Map team
  const team: TeamMember[] = (teamRes.data || []).map((m: any) => ({
    id: m.id, name: m.name, initials: m.initials, role: m.role, color: m.color,
    email: m.email || '', load: m.load_pct,
    tasks: tasksByMember[m.id] || 0,
    projects: projectsByMember[m.id] || 0,
    authUserId: m.auth_user_id || undefined,
  }));

  // Map invoices
  const invoices: Invoice[] = (invoicesRes.data || []).map((i: any) => ({
    id: i.id, client: i.client_id, project: i.project_id || '',
    amount: i.amount, status: i.status, issued: i.issued_date, due: i.due_date, concept: i.concept,
    tipoComprobante: i.tipo_comprobante ?? 1,
    serie: i.serie ?? 'F001',
    numeroDoc: i.numero_doc ?? 1,
    clienteTipoDoc: i.cliente_tipo_doc ?? 6,
    clienteNumDoc: i.cliente_num_doc ?? '',
    moneda: i.moneda ?? 1,
    totalGravada: i.total_gravada ?? 0,
    totalIgv: i.total_igv ?? 0,
    items: i.items ?? [],
    sunatEstado: i.sunat_estado ?? null,
    pdfUrl: i.pdf_url ?? null,
    xmlUrl: i.xml_url ?? null,
    cdrUrl: i.cdr_url ?? null,
    sunatDesc: i.sunat_desc ?? null,
    tipoNota: i.tipo_nota ?? null,
    docRefTipo: i.doc_ref_tipo ?? null,
    docRefSerie: i.doc_ref_serie ?? null,
    docRefNumero: i.doc_ref_numero ?? null,
  }));

  // Map activity
  const activity: ActivityItem[] = (activityRes.data || []).map((a: any) => ({
    who: a.member_id || '', action: a.action, target: a.target,
    time: formatRelativeTime(a.created_at),
  }));

  // Map revenue
  const revenue: RevenueMonth[] = (revenueRes.data || []).map((r: any) => ({
    m: MONTH_LABELS[r.month.slice(5, 7)] || r.month,
    billed: r.billed / 1000,
    collected: r.collected / 1000,
  }));

  const byId = Object.fromEntries(team.map(m => [m.id, m]));
  const clientById = Object.fromEntries(clients.map(c => [c.id, c]));
  const projectById = Object.fromEntries(projects.map(p => [p.id, p]));

  return {
    team, byId, clients, clientById, projects, projectById,
    columns: COLUMNS, tasks, invoices, activity, revenue,
    PRIO: ['Baja', 'Media', 'Alta', 'Urgente'],
    sprints, activeSprint,
  };
}

// ---- Mutations ----

export async function apiCreateTask(t: {
  id: string; title: string; project_id: string; assignee_id: string;
  priority: string; col: string; due_date: string; points: number;
  description: string; labels: string[]; subtitles: string[];
  sprint_id?: string | null;
}): Promise<{ id: string; name: string }> {
  const { error } = await supabase.from('tasks').insert({
    id: t.id, title: t.title, project_id: t.project_id,
    assignee_id: t.assignee_id || null, priority: t.priority, col: t.col,
    due_date: t.due_date || null, points: t.points,
    description: t.description, labels: t.labels,
    sprint_id: t.sprint_id || null,
  });
  if (error) throw error;
  if (t.subtitles.length > 0) {
    const { error: se } = await supabase.from('subtasks').insert(
      t.subtitles.map((title, i) => ({ task_id: t.id, title, done: false, position: i }))
    );
    if (se) throw se;
  }
  return { id: t.id, name: t.title };
}

export async function apiUpdateTask(id: string, fields: {
  title?: string;
  description?: string;
  due_date?: string | null;
  points?: number;
  labels?: string[];
  assignee_id?: string | null;
  project_id?: string;
}): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}

export async function apiGetTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((c: any) => ({
    id: c.id, taskId: c.task_id, memberId: c.member_id || null,
    text: c.text, createdAt: c.created_at,
  }));
}

export async function apiAddTaskComment(taskId: string, memberId: string | null, text: string): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, member_id: memberId || null, text })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, taskId: data.task_id, memberId: data.member_id || null, text: data.text, createdAt: data.created_at };
}

export async function apiUpdateTaskCol(id: string, col: TaskCol): Promise<void> {
  const { error } = await supabase.from('tasks').update({ col }).eq('id', id);
  if (error) throw error;
}

export async function apiUpdateTaskPrio(id: string, priority: string): Promise<void> {
  const { error } = await supabase.from('tasks').update({ priority }).eq('id', id);
  if (error) throw error;
}

export async function apiToggleSubtask(subtaskId: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('subtasks').update({ done }).eq('id', subtaskId);
  if (error) throw error;
}

export async function apiAddSubtask(taskId: string, title: string, position: number): Promise<void> {
  const { error } = await supabase.from('subtasks').insert({ task_id: taskId, title, done: false, position });
  if (error) throw error;
}

export async function apiCreateProject(p: {
  id: string; code: string; name: string; client_id: string; color: string;
  status: string; lead_id: string; budget: number; start_date: string;
  due_date: string; team: string[];
}): Promise<{ id: string; name: string }> {
  const { error } = await supabase.from('projects').insert({
    id: p.id, code: p.code, name: p.name, client_id: p.client_id, color: p.color,
    status: p.status, lead_id: p.lead_id, budget: p.budget, progress: 0,
    start_date: p.start_date || new Date().toISOString().slice(0, 10),
    due_date: p.due_date || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  });
  if (error) throw error;
  const members = Array.from(new Set([p.lead_id, ...p.team]));
  const { error: me } = await supabase.from('project_members').insert(
    members.map(mid => ({ project_id: p.id, member_id: mid }))
  );
  if (me) throw me;
  return { id: p.id, name: p.name };
}

export async function apiCloseProject(id: string, closed: boolean): Promise<void> {
  const { error } = await supabase.from('projects').update({ closed }).eq('id', id);
  if (error) throw error;
}

export async function apiUpdateProject(p: {
  id: string; name: string; client_id: string; status: string; lead_id: string;
  budget: number; start_date: string; due_date: string; progress: number;
}): Promise<void> {
  const { error } = await supabase.from('projects').update({
    name: p.name, client_id: p.client_id, status: p.status,
    lead_id: p.lead_id, budget: p.budget, start_date: p.start_date,
    due_date: p.due_date, progress: p.progress,
  }).eq('id', p.id);
  if (error) throw error;
}

export async function apiCreateClient(c: {
  id: string; name: string; sector: string; color: string; logo: string;
  since: string; contact: string; email: string; phone: string;
  website: string; country: string; notes: string; status: string;
}): Promise<{ id: string; name: string }> {
  const { error } = await supabase.from('clients').insert(c);
  if (error) throw error;
  return { id: c.id, name: c.name };
}

export async function apiDeleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function apiUpdateClient(c: {
  id: string; name: string; sector: string; contact: string; email: string;
  phone: string; website: string; country: string; notes: string;
  status: string; color: string;
}): Promise<void> {
  const { error } = await supabase.from('clients').update({
    name: c.name, sector: c.sector, contact: c.contact, email: c.email,
    phone: c.phone, website: c.website, country: c.country, notes: c.notes,
    status: c.status, color: c.color,
  }).eq('id', c.id);
  if (error) throw error;
}

export async function apiCreateMember(m: {
  id: string; name: string; initials: string; role: string; color: string; email: string;
}): Promise<{ id: string; name: string }> {
  const { error } = await supabase.from('team_members').insert({ ...m, load_pct: 0 });
  if (error) throw error;
  return { id: m.id, name: m.name };
}

export async function apiCreateMemberWithAuth(m: {
  id: string; name: string; initials: string; role: string; color: string;
  email: string; password: string;
}): Promise<{ id: string; name: string }> {
  const authUser = await adminCreateUser(m.email, m.password);

  const { error } = await supabase.from('team_members').insert({
    id: m.id, name: m.name, initials: m.initials, role: m.role,
    color: m.color, email: m.email, load_pct: 0,
    auth_user_id: authUser.id,
  });
  if (error) {
    await adminDeleteUser(authUser.id).catch(() => {});
    throw error;
  }
  return { id: m.id, name: m.name };
}

export async function apiDeleteMember(memberId: string): Promise<void> {
  const { data } = await supabase
    .from('team_members')
    .select('auth_user_id')
    .eq('id', memberId)
    .single();

  const { error } = await supabase.from('team_members').delete().eq('id', memberId);
  if (error) throw error;

  if (data?.auth_user_id) {
    await adminDeleteUser(data.auth_user_id).catch(() => {});
  }
}

export async function apiResetMemberPassword(authUserId: string, newPassword: string): Promise<void> {
  await adminUpdateUser(authUserId, { password: newPassword });
}

export async function apiUpdateMember(m: {
  id: string; name: string; role: string; email: string; color: string; load_pct: number;
}): Promise<void> {
  const { error } = await supabase.from('team_members').update({
    name: m.name, role: m.role, email: m.email, color: m.color, load_pct: m.load_pct,
  }).eq('id', m.id);
  if (error) throw error;
}

export async function apiCreateInvoice(inv: {
  id: string; client_id: string; project_id: string; amount: number; status: string;
  issued_date: string; due_date: string; concept: string;
  tipo_comprobante?: number; serie?: string; numero_doc?: number;
  cliente_tipo_doc?: number; cliente_num_doc?: string; moneda?: number;
  total_gravada?: number; total_igv?: number;
  items?: InvoiceItem[];
  tipo_nota?: number | null; doc_ref_tipo?: number | null;
  doc_ref_serie?: string | null; doc_ref_numero?: number | null;
}): Promise<{ id: string; name: string }> {
  const { error } = await supabase.from('invoices').insert({
    id: inv.id, client_id: inv.client_id, project_id: inv.project_id || null,
    amount: inv.amount, status: inv.status, issued_date: inv.issued_date,
    due_date: inv.due_date, concept: inv.concept,
    tipo_comprobante: inv.tipo_comprobante ?? 1,
    serie: inv.serie ?? 'F001',
    numero_doc: inv.numero_doc ?? 1,
    cliente_tipo_doc: inv.cliente_tipo_doc ?? 6,
    cliente_num_doc: inv.cliente_num_doc ?? '',
    moneda: inv.moneda ?? 1,
    total_gravada: inv.total_gravada ?? inv.amount,
    total_igv: inv.total_igv ?? 0,
    items: inv.items ?? [],
    tipo_nota: inv.tipo_nota ?? null,
    doc_ref_tipo: inv.doc_ref_tipo ?? null,
    doc_ref_serie: inv.doc_ref_serie ?? null,
    doc_ref_numero: inv.doc_ref_numero ?? null,
  });
  if (error) throw error;
  return { id: inv.id, name: inv.id };
}

export async function apiUpdateInvoiceStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function apiEmitirSUNAT(invoice: Invoice, clienteName: string, clienteDireccion: string): Promise<void> {
  const cfg = getNubefactConfig();
  if (!cfg.ruc || !cfg.token) throw new Error('Configura VITE_NUBEFACT_RUC y VITE_NUBEFACT_TOKEN en .env');

  const resp = await nubefactEmitir(cfg, {
    tipo_de_comprobante: invoice.tipoComprobante as TipoComprobante,
    serie: invoice.serie,
    numero: invoice.numeroDoc,
    sunat_transaction: 1,
    cliente_tipo_de_documento: invoice.clienteTipoDoc,
    cliente_numero_de_documento: invoice.clienteNumDoc,
    cliente_denominacion: clienteName,
    cliente_direccion: clienteDireccion,
    cliente_email: '',
    cliente_email_1: '',
    cliente_email_2: '',
    fecha_de_emision: toNubefactDate(invoice.issued),
    fecha_de_vencimiento: toNubefactDate(invoice.due),
    moneda: invoice.moneda,
    tipo_de_cambio: '',
    porcentaje_de_igv: 18,
    total_gravada: invoice.totalGravada,
    total_igv: invoice.totalIgv,
    total: invoice.amount,
    detraccion: false,
    observaciones: invoice.concept,
    ...(invoice.tipoComprobante >= 7 ? {
      tipo_de_nota: invoice.tipoNota ?? 1,
      documento_que_se_modifica_tipo: invoice.docRefTipo ?? 1,
      documento_que_se_modifica_serie: invoice.docRefSerie ?? '',
      documento_que_se_modifica_numero: invoice.docRefNumero ?? 1,
    } : {}),
    items: invoice.items,
  });

  const { error } = await supabase.from('invoices').update({
    sunat_estado: 'emitida',
    pdf_url: resp.enlace_del_pdf ?? null,
    xml_url: resp.enlace_del_xml ?? null,
    cdr_url: resp.enlace_del_cdr ?? null,
    hash_cpe: resp.codigo_hash ?? null,
    sunat_desc: resp.sunat_description ?? null,
  }).eq('id', invoice.id);
  if (error) throw error;
}

export async function apiAnularSUNAT(invoice: Invoice, motivo: string): Promise<void> {
  const cfg = getNubefactConfig();
  if (!cfg.ruc || !cfg.token) throw new Error('Configura VITE_NUBEFACT_RUC y VITE_NUBEFACT_TOKEN en .env');

  await nubefactAnular(cfg, invoice.tipoComprobante as TipoComprobante, invoice.serie, invoice.numeroDoc, motivo);

  const { error } = await supabase.from('invoices').update({
    sunat_estado: 'anulada',
    sunat_desc: motivo,
  }).eq('id', invoice.id);
  if (error) throw error;
}

export async function apiAddComment(taskId: string, memberId: string, text: string): Promise<void> {
  await supabase.from('activity_log').insert({
    member_id: memberId, action: `comentó en`, target: `${taskId}: ${text.slice(0, 80)}`,
  });
}

// ---- Sprint APIs ----

export async function apiCreateSprint(s: {
  id: string; name: string; status: string; start_date: string; end_date: string; goal: string;
}): Promise<Sprint> {
  const { error } = await supabase.from('sprints').insert(s);
  if (error) throw error;
  return {
    id: s.id, name: s.name, status: s.status as any,
    startDate: s.start_date, endDate: s.end_date, goal: s.goal,
  };
}

export async function apiUpdateSprint(s: {
  id: string; name?: string; status?: string; start_date?: string; end_date?: string; goal?: string;
}): Promise<void> {
  const { id, ...rest } = s;
  const { error } = await supabase.from('sprints').update(rest).eq('id', id);
  if (error) throw error;
}

export async function apiAssignTaskToSprint(taskId: string, sprintId: string | null): Promise<void> {
  const { error } = await supabase.from('tasks').update({ sprint_id: sprintId }).eq('id', taskId);
  if (error) throw error;
}

// ---- Task Link APIs ----

export async function apiAddTaskLink(taskId: string, url: string, title: string): Promise<TaskLink> {
  const { data, error } = await supabase.from('task_links').insert({ task_id: taskId, url, title }).select().single();
  if (error) throw error;
  return { id: data.id, taskId: data.task_id, url: data.url, title: data.title || '' };
}

export async function apiDeleteTaskLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('task_links').delete().eq('id', linkId);
  if (error) throw error;
}

// ---- Task File APIs ----

export async function apiAddTaskFile(taskId: string, file: File): Promise<TaskFile> {
  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${taskId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: upErr } = await supabase.storage.from('task-files').upload(path, file, { upsert: false });
  if (upErr) throw upErr;

  const { data: { publicUrl } } = supabase.storage.from('task-files').getPublicUrl(path);

  const { data, error } = await supabase
    .from('task_files')
    .insert({ task_id: taskId, name: file.name, size: file.size, url: publicUrl })
    .select().single();
  if (error) throw error;
  return { id: data.id, taskId: data.task_id, name: data.name, size: data.size || 0, url: data.url || null };
}

export async function apiDeleteTaskFile(fileId: string, url?: string | null): Promise<void> {
  // Remove from storage if we have the path
  if (url) {
    const match = url.match(/task-files\/(.+)$/);
    if (match) await supabase.storage.from('task-files').remove([decodeURIComponent(match[1])]);
  }
  const { error } = await supabase.from('task_files').delete().eq('id', fileId);
  if (error) throw error;
}
