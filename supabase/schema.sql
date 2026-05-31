-- Herrera Consulting Admin — Supabase Schema
-- Run this in the Supabase SQL Editor, then run seed.sql

-- Drop all tables in reverse dependency order
drop table if exists activity_log cascade;
drop table if exists monthly_revenue cascade;
drop table if exists invoices cascade;
drop table if exists task_comments cascade;
drop table if exists task_files cascade;
drop table if exists task_links cascade;
drop table if exists subtasks cascade;
drop table if exists tasks cascade;
drop table if exists project_members cascade;
drop table if exists projects cascade;
drop table if exists clients cascade;
drop table if exists sprints cascade;
drop table if exists team_members cascade;

create table if not exists team_members (
  id text primary key,
  name text not null,
  initials text not null,
  role text not null,
  color text not null default '#2A6FDB',
  email text,
  auth_user_id uuid,
  load_pct integer not null default 0 check (load_pct >= 0 and load_pct <= 100),
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id text primary key,
  name text not null,
  sector text not null default 'General',
  color text not null default '#2A6FDB',
  logo text not null,
  since text not null default to_char(now(), 'YYYY'),
  contact text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  country text not null default '',
  notes text not null default '',
  status text not null default 'Activo' check (status in ('Activo', 'Inactivo')),
  billed numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  code text not null,
  name text not null,
  client_id text not null references clients(id),
  color text not null default '#2A6FDB',
  status text not null default 'Planificación'
    check (status in ('Planificación', 'En progreso', 'En revisión', 'Completado')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  lead_id text not null references team_members(id),
  budget numeric not null default 0,
  spent numeric not null default 0,
  start_date date not null default current_date,
  due_date date not null default (current_date + interval '3 months'),
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
-- On existing databases run: ALTER TABLE projects ADD COLUMN IF NOT EXISTS closed boolean NOT NULL DEFAULT false;

create table if not exists project_members (
  project_id text not null references projects(id) on delete cascade,
  member_id text not null references team_members(id) on delete cascade,
  primary key (project_id, member_id)
);

create table if not exists sprints (
  id text primary key,
  name text not null,
  status text not null default 'Planificado'
    check (status in ('Planificado', 'Activo', 'Completado')),
  start_date date,
  end_date date,
  goal text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  project_id text not null references projects(id) on delete cascade,
  assignee_id text references team_members(id),
  sprint_id text references sprints(id) on delete set null,
  priority text not null default 'Media'
    check (priority in ('Urgente', 'Alta', 'Media', 'Baja')),
  col text not null default 'todo'
    check (col in ('todo', 'progress', 'review', 'done')),
  due_date date,
  points integer not null default 0,
  description text not null default '',
  labels text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position integer not null default 0
);

create table if not exists task_links (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references tasks(id) on delete cascade,
  url text not null,
  title text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists task_files (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references tasks(id) on delete cascade,
  name text not null,
  size integer not null default 0,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references tasks(id) on delete cascade,
  member_id text references team_members(id),
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id text primary key,
  client_id text not null references clients(id),
  project_id text references projects(id),
  amount numeric not null check (amount > 0),
  status text not null default 'Pendiente'
    check (status in ('Pagada', 'Pendiente', 'Vencida')),
  issued_date date not null default current_date,
  due_date date not null default (current_date + interval '30 days'),
  concept text not null default '',
  -- Campos para facturación electrónica SUNAT (Nubefact)
  tipo_comprobante smallint not null default 1
    check (tipo_comprobante in (1, 3, 7, 8)),
  serie text not null default 'F001',
  numero_doc integer not null default 1,
  cliente_tipo_doc smallint not null default 6
    check (cliente_tipo_doc in (0, 1, 4, 6, 7)),
  cliente_num_doc text not null default '',
  moneda smallint not null default 1
    check (moneda in (1, 2)),
  total_gravada numeric not null default 0,
  total_igv numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  sunat_estado text check (sunat_estado in ('emitida', 'anulada', 'error')),
  pdf_url text,
  xml_url text,
  cdr_url text,
  hash_cpe text,
  sunat_desc text,
  -- Para notas de crédito / débito
  tipo_nota smallint,
  doc_ref_tipo smallint,
  doc_ref_serie text,
  doc_ref_numero integer,
  created_at timestamptz not null default now()
);
/*
  Para bases de datos existentes ejecutar:
  ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS tipo_comprobante smallint NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS serie text NOT NULL DEFAULT 'F001',
    ADD COLUMN IF NOT EXISTS numero_doc integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS cliente_tipo_doc smallint NOT NULL DEFAULT 6,
    ADD COLUMN IF NOT EXISTS cliente_num_doc text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS moneda smallint NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS total_gravada numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_igv numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS sunat_estado text,
    ADD COLUMN IF NOT EXISTS pdf_url text,
    ADD COLUMN IF NOT EXISTS xml_url text,
    ADD COLUMN IF NOT EXISTS cdr_url text,
    ADD COLUMN IF NOT EXISTS hash_cpe text,
    ADD COLUMN IF NOT EXISTS sunat_desc text,
    ADD COLUMN IF NOT EXISTS tipo_nota smallint,
    ADD COLUMN IF NOT EXISTS doc_ref_tipo smallint,
    ADD COLUMN IF NOT EXISTS doc_ref_serie text,
    ADD COLUMN IF NOT EXISTS doc_ref_numero integer;
*/

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  member_id text references team_members(id),
  action text not null,
  target text not null,
  created_at timestamptz not null default now()
);

create table if not exists monthly_revenue (
  month text primary key,  -- 'YYYY-MM'
  billed numeric not null default 0,
  collected numeric not null default 0
);

-- RLS (open policies — internal tool)
alter table team_members enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table sprints enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table task_links enable row level security;
alter table task_files enable row level security;
alter table task_comments enable row level security;
alter table invoices enable row level security;
alter table activity_log enable row level security;
alter table monthly_revenue enable row level security;

create policy "allow_all" on team_members for all using (true) with check (true);
create policy "allow_all" on clients for all using (true) with check (true);
create policy "allow_all" on projects for all using (true) with check (true);
create policy "allow_all" on project_members for all using (true) with check (true);
create policy "allow_all" on sprints for all using (true) with check (true);
create policy "allow_all" on tasks for all using (true) with check (true);
create policy "allow_all" on subtasks for all using (true) with check (true);
create policy "allow_all" on task_links for all using (true) with check (true);
create policy "allow_all" on task_files for all using (true) with check (true);
create policy "allow_all" on task_comments for all using (true) with check (true);
create policy "allow_all" on invoices for all using (true) with check (true);
create policy "allow_all" on activity_log for all using (true) with check (true);
create policy "allow_all" on monthly_revenue for all using (true) with check (true);
