import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDB, invalidateDB } from '../context/DBContext';
import { supabase } from '../lib/supabase';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import TaskLabel from '../components/TaskLabel';
import PrioTag from '../components/PrioTag';
import RichTextEditor from '../components/RichTextEditor';
import { fmtDate, isLate, formatRelativeTime, LABEL_OPTIONS } from '../lib/utils';
import {
  apiToggleSubtask, apiAddSubtask, apiUpdateTaskCol, apiUpdateTaskPrio,
  apiUpdateTask, apiGetTaskComments, apiAddTaskComment,
  apiAddTaskLink, apiDeleteTaskLink, apiAddTaskFile, apiDeleteTaskFile,
} from '../lib/api';
import type { TaskCol, DB, TaskLink, TaskFile } from '../types';

interface Props {
  taskId: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}

const COL_BG: Record<string, string> = {
  todo: '#eef0f4', progress: '#eef4fe', review: '#fbf0db', done: '#e6f4ec',
};
const COL_FG: Record<string, string> = {
  todo: '#475067', progress: '#1a4fa3', review: '#a8690a', done: '#177a4e',
};

export default function TaskDrawer({ taskId, onClose, onToast }: Props) {
  const db = useDB();
  const queryClient = useQueryClient();
  const task = db.tasks.find(t => t.id === taskId);

  const [tab, setTab] = useState<'comentarios' | 'historial' | 'registro'>('comentarios');
  const [comment, setComment] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task?.title || '');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Inline description editing
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState(task?.desc || '');

  // Label editor
  const [labelInput, setLabelInput] = useState('');
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  // Points inline edit
  const [editingPoints, setEditingPoints] = useState(false);
  const [pointsVal, setPointsVal] = useState(task?.points ?? 0);
  const pointsInputRef = useRef<HTMLInputElement>(null);

  // Link state
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [localLinks, setLocalLinks] = useState<TaskLink[]>([]);

  // File state
  const [localFiles, setLocalFiles] = useState<TaskFile[]>([]);

  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthEmail(data.session?.user?.email || null);
    });
  }, []);

  const me = (authEmail ? db.team.find(m => m.email === authEmail) : null) ?? db.team[0] ?? null;

  useEffect(() => {
    setTab('comentarios');
    setComment('');
    setEditingTitle(false);
    setEditingDesc(false);
    setLinkFormOpen(false);
    setLinkUrl('');
    setLinkTitle('');
    if (task) {
      setTitleVal(task.title);
      setDescVal(task.desc);
      setLocalLinks(task.links || []);
      setLocalFiles(task.files || []);
    }
  }, [taskId]);

  useEffect(() => {
    if (task && !editingTitle) setTitleVal(task.title);
  }, [task?.title]);

  useEffect(() => {
    if (task && !editingDesc) setDescVal(task.desc);
  }, [task?.desc]);

  useEffect(() => {
    if (task && !editingPoints) setPointsVal(task.points);
  }, [task?.points]);

  useEffect(() => {
    if (task) {
      setLocalLinks(task.links || []);
      setLocalFiles(task.files || []);
    }
  }, [task?.links, task?.files]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editingTitle && !editingDesc) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, editingTitle, editingDesc]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) setLabelMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingPoints) { pointsInputRef.current?.focus(); pointsInputRef.current?.select(); }
  }, [editingPoints]);

  // Load comments from DB
  const { data: dbComments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => apiGetTaskComments(taskId),
    enabled: !!taskId,
  });

  const addCommentMut = useMutation({
    mutationFn: (text: string) => apiAddTaskComment(taskId, me?.id || null, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setComment('');
    },
  });

  const updateTitleMut = useMutation({
    mutationFn: (title: string) => apiUpdateTask(taskId, { title }),
    onSuccess: () => { invalidateDB(queryClient); setEditingTitle(false); },
    onError: () => setEditingTitle(false),
  });

  const updateDescMut = useMutation({
    mutationFn: (description: string) => apiUpdateTask(taskId, { description }),
    onSuccess: () => { invalidateDB(queryClient); setEditingDesc(false); },
    onError: () => setEditingDesc(false),
  });

  const updateColMut = useMutation({
    mutationFn: ({ col }: { col: TaskCol }) => apiUpdateTaskCol(taskId, col),
    onMutate: async ({ col }) => {
      await queryClient.cancelQueries({ queryKey: ['db'] });
      const prev = queryClient.getQueryData<DB>(['db']);
      if (prev) queryClient.setQueryData<DB>(['db'], { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, col } : t) });
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) queryClient.setQueryData(['db'], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['db'] }),
  });

  const updatePrioMut = useMutation({
    mutationFn: (priority: string) => apiUpdateTaskPrio(taskId, priority),
    onMutate: async (prio) => {
      await queryClient.cancelQueries({ queryKey: ['db'] });
      const prev = queryClient.getQueryData<DB>(['db']);
      if (prev) queryClient.setQueryData<DB>(['db'], { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, prio: prio as any } : t) });
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) queryClient.setQueryData(['db'], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['db'] }),
  });

  const toggleSubMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => apiToggleSubtask(id, done),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: ['db'] });
      const prev = queryClient.getQueryData<DB>(['db']);
      if (prev) {
        queryClient.setQueryData<DB>(['db'], {
          ...prev,
          tasks: prev.tasks.map(t =>
            t.id === taskId ? { ...t, subs: t.subs.map(s => s.id === id ? { ...s, done } : s) } : t
          ),
        });
      }
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) queryClient.setQueryData(['db'], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['db'] }),
  });

  const addSubMut = useMutation({
    mutationFn: ({ title, position }: { title: string; position: number }) =>
      apiAddSubtask(taskId, title, position),
    onSuccess: () => invalidateDB(queryClient),
  });

  const updateFieldMut = useMutation({
    mutationFn: (fields: Parameters<typeof apiUpdateTask>[1]) => apiUpdateTask(taskId, fields),
    onMutate: async (fields) => {
      await queryClient.cancelQueries({ queryKey: ['db'] });
      const prev = queryClient.getQueryData<DB>(['db']);
      if (prev) {
        queryClient.setQueryData<DB>(['db'], {
          ...prev,
          tasks: prev.tasks.map(t => {
            if (t.id !== taskId) return t;
            const patch: Partial<typeof t> = {};
            if (fields.due_date !== undefined) patch.due = fields.due_date ?? '';
            if (fields.points !== undefined) patch.points = fields.points;
            if (fields.labels !== undefined) patch.labels = fields.labels;
            if (fields.assignee_id !== undefined) patch.assignee = fields.assignee_id ?? '';
            if (fields.project_id !== undefined) patch.project = fields.project_id;
            return { ...t, ...patch };
          }),
        });
      }
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) queryClient.setQueryData(['db'], ctx.prev); },
    onSettled: () => invalidateDB(queryClient),
  });

  if (!task) return null;
  const p = db.projectById[task.project];
  const c = p ? db.clientById[p.client] : null;
  const col = db.columns.find(col => col.id === task.col)!;
  const doneCount = task.subs.filter(s => s.done).length;
  const subPct = task.subs.length ? Math.round(doneCount / task.subs.length * 100) : 0;

  const postComment = () => {
    if (!comment.trim()) return;
    addCommentMut.mutate(comment.trim());
  };

  const saveTitle = () => {
    const trimmed = titleVal.trim();
    if (!trimmed) { setEditingTitle(false); setTitleVal(task.title); return; }
    if (trimmed === task.title) { setEditingTitle(false); return; }
    updateTitleMut.mutate(trimmed);
  };

  const saveDesc = () => {
    if (descVal === task.desc) { setEditingDesc(false); return; }
    updateDescMut.mutate(descVal);
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onToast(`Subiendo "${file.name}"…`);
    try {
      const saved = await apiAddTaskFile(taskId, file);
      setLocalFiles(prev => [...prev, saved]);
      invalidateDB(queryClient);
      onToast(`Archivo "${file.name}" adjuntado`);
    } catch {
      onToast(`Error al adjuntar "${file.name}". Verifica que el bucket "task-files" exista en Supabase Storage.`);
    }
    e.target.value = '';
  };

  const handleRemoveFile = async (fileId: string, fileName: string, url?: string | null) => {
    setLocalFiles(prev => prev.filter(f => f.id !== fileId));
    try {
      await apiDeleteTaskFile(fileId, url);
      invalidateDB(queryClient);
      onToast(`Archivo "${fileName}" eliminado`);
    } catch {
      if (task?.files) setLocalFiles(task.files);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : 'https://' + linkUrl.trim();
    try {
      const saved = await apiAddTaskLink(taskId, url, linkTitle.trim());
      setLocalLinks(prev => [...prev, saved]);
      invalidateDB(queryClient);
      onToast('Enlace agregado');
    } catch {
      onToast('Error al agregar enlace');
    }
    setLinkUrl(''); setLinkTitle(''); setLinkFormOpen(false);
  };

  const handleRemoveLink = async (linkId: string) => {
    setLocalLinks(prev => prev.filter(l => l.id !== linkId));
    try {
      await apiDeleteTaskLink(linkId);
      invalidateDB(queryClient);
    } catch {
      if (task?.links) setLocalLinks(task.links);
    }
  };

  const handleShare = () => {
    const text = `${task.id} — ${task.title}`;
    navigator.clipboard.writeText(text).then(
      () => onToast(`Enlace de ${task.id} copiado`),
      () => onToast(`ID copiado: ${task.id}`),
    );
  };

  const handleArchive = () => {
    updateColMut.mutate({ col: 'done' });
    onToast(`Tarea ${task.id} archivada`);
    setMoreOpen(false);
  };

  return (
    <>
      <div className="overlay show" onClick={onClose}></div>
      <div className="drawer show">
        {/* Cabecera */}
        <div className="drawer-head">
          <span className="kid" style={{ fontSize: 13 }}>
            <span className="checkmark"><Icon name="check" size={9} sw={3.5} /></span>{task.id}
          </span>
          <Icon name="chevR" size={14} cls="muted" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>{p?.name}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <input ref={fileInputRef} type="file" hidden onChange={handleAttach} />
            <button className="icon-btn" style={{ width: 34, height: 34 }} title="Adjuntar archivo"
              onClick={() => fileInputRef.current?.click()}>
              <Icon name="paperclip" size={17} />
            </button>
            <button className="icon-btn" style={{ width: 34, height: 34 }} title="Copiar enlace"
              onClick={handleShare}>
              <Icon name="share" size={17} />
            </button>
            <div className="ctx-wrap" ref={moreRef}>
              <button className="icon-btn" style={{ width: 34, height: 34 }} title="Más opciones"
                onClick={() => setMoreOpen(o => !o)}>
                <Icon name="moreV" size={18} />
              </button>
              {moreOpen && (
                <div className="ctx-menu" style={{ right: 0, minWidth: 200 }}>
                  <button className="ctx-item" onClick={handleShare}>
                    <Icon name="share" size={15} />Copiar enlace
                  </button>
                  <button className="ctx-item" onClick={() => { setMoreOpen(false); fileInputRef.current?.click(); }}>
                    <Icon name="paperclip" size={15} />Adjuntar archivo
                  </button>
                  <div className="ctx-sep" />
                  <button className="ctx-item" onClick={handleArchive}>
                    <Icon name="check" size={15} />Marcar completada
                  </button>
                  <button className="ctx-item danger" onClick={() => { onToast(`Tarea ${task.id} eliminada`); onClose(); setMoreOpen(false); }}>
                    <Icon name="close" size={15} />Eliminar tarea
                  </button>
                </div>
              )}
            </div>
            <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={onClose}>
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {/* Panel principal */}
          <div className="drawer-main">
            {/* Título inline editable */}
            {editingTitle ? (
              <input
                ref={titleInputRef}
                className="dt-title-input"
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(task.title); }
                }}
              />
            ) : (
              <h1
                className="dt-title editable-field"
                onClick={() => setEditingTitle(true)}
                title="Clic para editar"
              >
                {task.title}
              </h1>
            )}

            <div className="flex gap-8" style={{ marginBottom: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { subtaskInputRef.current?.focus(); subtaskInputRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>
                <Icon name="plus" size={15} sw={2.4} />Subtarea
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setLinkFormOpen(o => !o)}>
                <Icon name="link" size={15} />Agregar enlace
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
                <Icon name="paperclip" size={15} />Adjuntar
              </button>
            </div>

            {/* Inline link form */}
            {linkFormOpen && (
              <div className="link-add-form">
                <input
                  className="input"
                  placeholder="URL (ej: https://ejemplo.com)"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') setLinkFormOpen(false); }}
                />
                <input
                  className="input"
                  placeholder="Título (opcional)"
                  value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') setLinkFormOpen(false); }}
                />
                <div className="flex gap-8">
                  <button className="btn btn-primary btn-sm" onClick={handleAddLink} disabled={!linkUrl.trim()}>
                    <Icon name="plus" size={14} />Agregar
                  </button>
                  <button className="btn-subtle" onClick={() => setLinkFormOpen(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Files */}
            {localFiles.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {localFiles.map(f => (
                  <div key={f.id} className="linked-task-chip" style={{ cursor: f.url ? 'pointer' : 'default' }}
                    onClick={() => { if (f.url) window.open(f.url, '_blank'); }}>
                    <Icon name="paperclip" size={13} />
                    <span>{f.name}</span>
                    {f.size > 0 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{(f.size / 1024).toFixed(0)} KB</span>}
                    <button style={{ marginLeft: 'auto', color: 'var(--muted)' }}
                      onClick={e => { e.stopPropagation(); handleRemoveFile(f.id, f.name, f.url); }}>
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Descripción inline editable con TipTap */}
            <div className="dt-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Descripción</span>
              {!editingDesc && (
                <button className="btn-subtle" style={{ fontSize: 11, padding: '1px 8px', height: 22 }}
                  onClick={() => setEditingDesc(true)}>
                  Editar
                </button>
              )}
            </div>

            {editingDesc ? (
              <div className="dt-desc-editor">
                <RichTextEditor
                  content={descVal}
                  onChange={setDescVal}
                  editable={true}
                  autoFocus
                  placeholder="Escribe una descripción detallada…"
                />
                <div className="flex gap-8" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveDesc} disabled={updateDescMut.isPending}>
                    {updateDescMut.isPending ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button className="btn-subtle" onClick={() => { setEditingDesc(false); setDescVal(task.desc); }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="dt-desc editable-field"
                onClick={() => setEditingDesc(true)}
                title="Clic para editar"
              >
                {task.desc
                  ? <div className="rte-content" dangerouslySetInnerHTML={{ __html: task.desc }} />
                  : <p style={{ color: 'var(--muted)' }}>Sin descripción. Clic para agregar.</p>
                }
              </div>
            )}

            {/* Links */}
            {localLinks.length > 0 && (
              <>
                <div className="dt-section-label">Enlaces</div>
                <div className="linked-tasks">
                  {localLinks.map(link => (
                    <div key={link.id} className="linked-task-chip"
                      style={{ cursor: 'pointer' }}
                      onClick={() => window.open(link.url, '_blank')}>
                      <Icon name="link" size={13} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--blue)' }}>
                        {link.title || link.url}
                      </span>
                      <button style={{ marginLeft: 'auto', color: 'var(--muted)' }}
                        onClick={e => { e.stopPropagation(); handleRemoveLink(link.id); }}>
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="dt-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Subtareas</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>{doneCount}/{task.subs.length}</span>
            </div>
            <div className="progressbar" style={{ marginBottom: 12 }}>
              <span style={{ width: subPct + '%' }}></span>
            </div>
            {task.subs.map(s => (
              <div className={'subtask' + (s.done ? ' is-done' : '')} key={s.id}
                onClick={() => toggleSubMut.mutate({ id: s.id, done: !s.done })} style={{ cursor: 'pointer' }}>
                <div className={'check' + (s.done ? ' done' : '')}>
                  {s.done && <Icon name="check" size={12} sw={3} />}
                </div>
                <span className="st-title">{s.title}</span>
              </div>
            ))}
            <div className="subtask-add" style={{ marginTop: 8 }}>
              <input ref={subtaskInputRef} id="subtask-add-input" className="input"
                placeholder="Añadir subtarea y pulsa Enter" style={{ fontSize: 13 }}
                disabled={addSubMut.isPending}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const title = e.currentTarget.value.trim();
                    if (!title) return;
                    const position = task.subs.length;
                    e.currentTarget.value = '';
                    addSubMut.mutate({ title, position });
                  }
                }} />
            </div>

            <div className="dt-section-label">Actividad</div>
            <div className="tabs">
              {(['comentarios', 'historial', 'registro'] as const).map(t => (
                <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
                  {t === 'comentarios' ? `Comentarios${dbComments.length ? ` (${dbComments.length})` : ''}` : t === 'historial' ? 'Historial' : 'Registro'}
                </button>
              ))}
            </div>

            {tab === 'comentarios' && (
              <div>
                {dbComments.length === 0 && (
                  <div style={{ padding: '20px 0 12px', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                    Sin comentarios todavía. Sé el primero en comentar.
                  </div>
                )}
                {dbComments.map(cm => (
                  <div className="comment" key={cm.id}>
                    <Avatar id={cm.memberId || ''} size={32} />
                    <div className="c-body">
                      <div className="c-head">
                        <span className="c-name">{db.byId[cm.memberId || '']?.name || 'Usuario'}</span>
                        <span className="c-time">{formatRelativeTime(cm.createdAt)}</span>
                      </div>
                      <div className="c-text">{cm.text}</div>
                    </div>
                  </div>
                ))}
                <div className="comment-box">
                  {me && <Avatar id={me.id} size={32} />}
                  <div style={{ flex: 1 }}>
                    <textarea
                      className="comment-input"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Añadir un comentario… (Ctrl+Enter para enviar)"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment();
                      }}
                      rows={3}
                    />
                    {comment.trim() && (
                      <div className="flex gap-8" style={{ marginTop: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={postComment} disabled={addCommentMut.isPending}>
                          <Icon name="send" size={14} />{addCommentMut.isPending ? 'Enviando…' : 'Comentar'}
                        </button>
                        <button className="btn-subtle" onClick={() => setComment('')}>Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {tab === 'historial' && (
              <div>
                {task.createdAt && (
                  <div className="comment">
                    <Avatar id={p?.lead || task.assignee} size={28} />
                    <div className="c-body">
                      <div className="c-text">
                        <b>{db.byId[p?.lead || task.assignee]?.name || 'Sistema'}</b> creó esta tarea
                      </div>
                      <div className="c-time" style={{ marginTop: 2 }}>{formatRelativeTime(task.createdAt)}</div>
                    </div>
                  </div>
                )}
                <div style={{ padding: '16px 0 8px', color: 'var(--muted)', fontSize: 12.5, fontWeight: 600 }}>
                  El historial detallado de cambios no está disponible todavía.
                </div>
              </div>
            )}
            {tab === 'registro' && (
              <div className="empty" style={{ padding: '30px 0' }}>Sin registros de tiempo todavía.</div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="drawer-side">
            <div className="dt-section-label" style={{ marginTop: 0 }}>Estado</div>
            <select className="status-select"
              value={task.col} onChange={e => updateColMut.mutate({ col: e.target.value as TaskCol })}
              style={{ background: COL_BG[task.col], color: COL_FG[task.col], width: '100%',
                fontFamily: 'var(--font)', border: '1px solid ' + COL_BG[task.col],
                appearance: 'none', cursor: 'pointer', WebkitAppearance: 'none' }}>
              {db.columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <div style={{ marginTop: 16, border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '4px 14px' }}>
              {/* Responsable */}
              <div className="detail-row">
                <div className="dl">Responsable</div>
                <div className="dv">
                  <select className="select" style={{ height: 32, fontSize: 12.5, width: '100%' }}
                    value={task.assignee}
                    onChange={e => updateFieldMut.mutate({ assignee_id: e.target.value || null })}>
                    <option value="">— Sin asignar —</option>
                    {db.team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Prioridad */}
              <div className="detail-row">
                <div className="dl">Prioridad</div>
                <div className="dv">
                  <select className="select" style={{ height: 32, fontSize: 12.5, width: '100%' }}
                    value={task.prio} onChange={e => updatePrioMut.mutate(e.target.value)}>
                    {db.PRIO.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                </div>
              </div>

              {/* Proyecto */}
              <div className="detail-row">
                <div className="dl">Proyecto</div>
                <div className="dv">
                  <select className="select" style={{ height: 32, fontSize: 12.5, width: '100%' }}
                    value={task.project}
                    onChange={e => updateFieldMut.mutate({ project_id: e.target.value })}>
                    {db.projects.filter(pr => !pr.closed).map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cliente (solo lectura, derivado del proyecto) */}
              {c && (
                <div className="detail-row">
                  <div className="dl">Cliente</div>
                  <div className="dv">
                    <div className="client-logo" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 4, background: c.color }}>{c.logo}</div>
                    {c.name}
                  </div>
                </div>
              )}

              {/* Etiquetas */}
              <div className="detail-row" style={{ alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}>
                <div className="dl" style={{ paddingTop: 2 }}>Etiquetas</div>
                <div className="dv" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    {task.labels.map(l => (
                      <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <TaskLabel text={l} />
                        <button
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: -2 }}
                          onClick={() => updateFieldMut.mutate({ labels: task.labels.filter(x => x !== l) })}>
                          <Icon name="close" size={9} />
                        </button>
                      </span>
                    ))}
                    {/* Botón + */}
                    <div className="ctx-wrap" ref={labelRef}>
                      <button
                        className="icon-btn"
                        style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px dashed var(--line)', color: 'var(--muted)', flexShrink: 0 }}
                        title="Agregar etiqueta"
                        onClick={() => { setLabelMenuOpen(o => !o); setLabelInput(''); }}>
                        <Icon name="plus" size={12} sw={2.5} />
                      </button>
                      {labelMenuOpen && (
                        <div className="ctx-menu" style={{ right: 0, left: 'auto', top: 28, width: 200, padding: 0 }}>
                          <div style={{ padding: '8px 8px 4px' }}>
                            <input
                              className="input"
                              autoFocus
                              style={{ height: 28, fontSize: 12, padding: '0 8px', width: '100%' }}
                              placeholder="Buscar o crear…"
                              value={labelInput}
                              onChange={e => setLabelInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val = labelInput.trim();
                                  if (val && !task.labels.includes(val)) {
                                    updateFieldMut.mutate({ labels: [...task.labels, val] });
                                  }
                                  setLabelInput('');
                                  setLabelMenuOpen(false);
                                }
                                if (e.key === 'Escape') { setLabelMenuOpen(false); setLabelInput(''); }
                              }}
                            />
                          </div>
                          <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid var(--line-2)' }}>
                            {LABEL_OPTIONS
                              .filter(opt => opt.toLowerCase().includes(labelInput.toLowerCase()) && !task.labels.includes(opt))
                              .map(opt => (
                                <button key={opt} className="ctx-item"
                                  onMouseDown={e => { e.preventDefault(); updateFieldMut.mutate({ labels: [...task.labels, opt] }); setLabelInput(''); setLabelMenuOpen(false); }}>
                                  <Icon name="plus" size={12} sw={2.4} />{opt}
                                </button>
                              ))}
                            {labelInput.trim() && !LABEL_OPTIONS.includes(labelInput.trim()) && !task.labels.includes(labelInput.trim()) && (
                              <button className="ctx-item"
                                onMouseDown={e => { e.preventDefault(); updateFieldMut.mutate({ labels: [...task.labels, labelInput.trim()] }); setLabelInput(''); setLabelMenuOpen(false); }}>
                                <Icon name="plus" size={12} sw={2.4} />Crear «{labelInput.trim()}»
                              </button>
                            )}
                            {LABEL_OPTIONS.filter(opt => !opt.toLowerCase().includes(labelInput.toLowerCase()) || task.labels.includes(opt)).length === LABEL_OPTIONS.length && !labelInput.trim() && (
                              <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)' }}>
                                Todas las etiquetas están asignadas
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vencimiento */}
              <div className="detail-row">
                <div className="dl">Vencimiento</div>
                <div className="dv">
                  <input className="input" type="date" style={{ height: 32, fontSize: 12.5, width: '100%',
                    color: isLate(task.due) && task.col !== 'done' ? 'var(--red)' : 'var(--ink)' }}
                    value={task.due || ''}
                    onChange={e => updateFieldMut.mutate({ due_date: e.target.value || null })} />
                </div>
              </div>

              {/* Estimación */}
              <div className="detail-row">
                <div className="dl">Estimación</div>
                <div className="dv">
                  {editingPoints ? (
                    <input
                      ref={pointsInputRef}
                      className="input"
                      type="number" min={0}
                      style={{ height: 28, fontSize: 13, width: 72, textAlign: 'right', padding: '0 8px' }}
                      value={pointsVal}
                      onChange={e => setPointsVal(parseInt(e.target.value) || 0)}
                      onBlur={() => {
                        setEditingPoints(false);
                        if (pointsVal !== task.points) updateFieldMut.mutate({ points: pointsVal });
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') { setEditingPoints(false); setPointsVal(task.points); }
                      }}
                    />
                  ) : (
                    <span
                      className="badge badge-gray editable-field"
                      title="Clic para editar"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => { setPointsVal(task.points); setEditingPoints(true); }}>
                      {task.points} pts
                    </span>
                  )}
                </div>
              </div>

              {/* Sprint */}
              {task.sprintId && (
                <div className="detail-row">
                  <div className="dl">Sprint</div>
                  <div className="dv">
                    <span className="badge" style={{ background: 'var(--blue-50)', color: 'var(--blue)' }}>
                      {db.sprints.find(s => s.id === task.sprintId)?.name || task.sprintId}
                    </span>
                  </div>
                </div>
              )}

              {/* Informador */}
              {p?.lead && (
                <div className="detail-row">
                  <div className="dl">Informador</div>
                  <div className="dv"><Avatar id={p.lead} size={24} />{db.byId[p.lead]?.name}</div>
                </div>
              )}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginTop: 14, lineHeight: 1.7 }}>
              Creado hace 4 días<br />Actualizado hace 2 h
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
