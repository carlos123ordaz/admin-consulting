import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DBProvider } from './context/DBContext';
import { supabase } from './lib/supabase';
import Sidebar from './components/Shell/Sidebar';
import Topbar from './components/Shell/Topbar';
import DashboardView from './views/DashboardView';
import BoardView from './views/BoardView';
import ProjectsView from './views/ProjectsView';
import ClientsView from './views/ClientsView';
import TeamView from './views/TeamView';
import BillingView from './views/BillingView';
import TimelineView from './views/TimelineView';
import TaskDrawer from './views/TaskDrawer';
import LoginView from './views/LoginView';
import NewTaskForm from './components/forms/NewTaskForm';
import NewProjectForm from './components/forms/NewProjectForm';
import NewClientForm from './components/forms/NewClientForm';
import NewMemberForm from './components/forms/NewMemberForm';
import NewInvoiceForm from './components/forms/NewInvoiceForm';
import Icon from './components/Icon';
import {
  apiCreateTask, apiCreateProject, apiCreateClient,
  apiCreateMemberWithAuth, apiCreateInvoice,
} from './lib/api';
import { invalidateDB } from './context/DBContext';
import type { ModalType } from './types';

type ModalState = { type: 'task'; preset?: { col?: import('./types').TaskCol; project?: string; sprintId?: string } }
  | { type: 'project' } | { type: 'client' } | { type: 'member' } | { type: 'invoice' };

function AppLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearch(''); setSidebarOpen(false); }, [location.pathname]);

  const openModal = (type: ModalType, preset?: { col?: string; project?: string; sprintId?: string }) =>
    setModal({ type, preset } as ModalState);
  const closeModal = () => setModal(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        (document.querySelector('.search input') as HTMLInputElement | null)?.focus();
      }
      if (e.key === 'Escape' && !modal) setOpenTaskId(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [modal]);

  const taskMutation = useMutation({
    mutationFn: apiCreateTask,
    onSuccess: (t) => { invalidateDB(qc); closeModal(); showToast(`Tarea ${t.id} creada`); },
  });
  const projectMutation = useMutation({
    mutationFn: apiCreateProject,
    onSuccess: (p) => { invalidateDB(qc); closeModal(); showToast(`Proyecto «${p.name}» creado`); },
  });
  const clientMutation = useMutation({
    mutationFn: apiCreateClient,
    onSuccess: (c) => { invalidateDB(qc); closeModal(); showToast(`Cliente «${c.name}» registrado`); },
  });
  const memberMutation = useMutation({
    mutationFn: apiCreateMemberWithAuth,
    onSuccess: (m) => { invalidateDB(qc); closeModal(); showToast(`${m.name} agregado al equipo`); },
    onError: (e: Error) => { showToast(e.message || 'Error al crear el usuario'); },
  });
  const invoiceMutation = useMutation({
    mutationFn: apiCreateInvoice,
    onSuccess: (inv) => { invalidateDB(qc); closeModal(); showToast(`Factura ${inv.id} emitida`); },
  });

  return (
    <div className="app">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar search={search} setSearch={setSearch} openModal={openModal} onToast={showToast} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="content">
          <Routes>
            <Route index element={<Navigate to="/board" replace />} />
            <Route path="dashboard" element={<DashboardView openTask={setOpenTaskId} />} />
            <Route path="board" element={
              <BoardView openTask={setOpenTaskId} search={search} setSearch={setSearch} openModal={openModal} />
            } />
            <Route path="projects" element={
              <ProjectsView search={search} openModal={openModal} onToast={showToast} />
            } />
            <Route path="clients" element={<ClientsView search={search} openModal={openModal} onToast={showToast} />} />
            <Route path="team" element={<TeamView search={search} openModal={openModal} onToast={showToast} />} />
            <Route path="billing" element={<BillingView search={search} openModal={openModal} onToast={showToast} />} />
            <Route path="timeline" element={<TimelineView />} />
            <Route path="*" element={<Navigate to="/board" replace />} />
          </Routes>
        </div>
      </div>

      {openTaskId && (
        <TaskDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} onToast={showToast} />
      )}

      {modal?.type === 'task' && (
        <NewTaskForm
          preset={modal.preset}
          onCreate={(t) => taskMutation.mutate(t)}
          onClose={closeModal}
          loading={taskMutation.isPending}
        />
      )}
      {modal?.type === 'project' && (
        <NewProjectForm
          onCreate={(p) => projectMutation.mutate(p)}
          onClose={closeModal}
          loading={projectMutation.isPending}
        />
      )}
      {modal?.type === 'client' && (
        <NewClientForm
          onCreate={(c) => clientMutation.mutate(c)}
          onClose={closeModal}
          loading={clientMutation.isPending}
        />
      )}
      {modal?.type === 'member' && (
        <NewMemberForm
          onCreate={(m) => memberMutation.mutate(m)}
          onClose={closeModal}
          loading={memberMutation.isPending}
        />
      )}
      {modal?.type === 'invoice' && (
        <NewInvoiceForm
          onCreate={(inv) => invoiceMutation.mutate(inv)}
          onClose={closeModal}
          loading={invoiceMutation.isPending}
        />
      )}

      {toast && (
        <div className="toast-wrap">
          <div className="toast">
            <span className="t-ico"><Icon name="check" size={13} sw={3} /></span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === null) return null;
  if (!session) return <LoginView />;

  return (
    <DBProvider>
      <Routes>
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </DBProvider>
  );
}
