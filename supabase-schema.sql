-- ============================================================
-- THE HUB — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Public site content
create table if not exists banners (
  id bigint primary key,
  title text, subtitle text, description text,
  image_url text, cta_text text, cta_url text
);

create table if not exists modules (
  id bigint primary key,
  num int, slug text, title text, teacher text,
  duration text, "desc" text, icon text, details jsonb
);

create table if not exists teachers (
  id bigint primary key,
  name text, role text, photo text, bio text, specialties jsonb
);

create table if not exists learnings (
  id bigint primary key,
  title text, description text, module_slug text
);
alter table learnings add column if not exists module_slug text;

create table if not exists testimonials (
  id bigint primary key,
  name text, role text, "text" text, avatar text
);

create table if not exists faqs (
  id bigint primary key,
  question text, answer text
);

-- Hub Settings (tabela própria para não conflitar com a settings existente)
create table if not exists hub_settings (
  id text primary key default 'global',
  data jsonb not null default '{}'::jsonb
);
insert into hub_settings (id, data) values ('global', '{}') on conflict (id) do nothing;

-- Enrollments (public form submissions)
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users on delete set null,
  email text, name text, phone text,
  module text, module_slug text,
  status text default 'Pendente',
  progress int default 0,
  created_at timestamptz default now()
);

-- Profiles (student accounts) — extends existing table
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists role text default 'student';
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists plan text;
alter table profiles add column if not exists status text default 'Ativo';
alter table profiles add column if not exists email text;
alter table profiles add column if not exists created_at timestamptz default now();

-- Student portal: progress / module enrollment
create table if not exists student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users on delete cascade unique,
  module text, module_slug text,
  status text default 'Ativo',
  progress int default 0,
  updated_at timestamptz default now()
);

-- Student portal: messages / notifications
create table if not exists student_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users on delete cascade,
  title text not null,
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Student portal: invoices / financials
create table if not exists student_invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users on delete cascade,
  description text, amount text, due_date text,
  status text default 'Pendente',
  created_at timestamptz default now()
);

-- Student portal: support tickets
create table if not exists student_support (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users on delete cascade,
  subject text, message text, email text, name text,
  status text default 'Aberto',
  admin_reply text default '',
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Student portal: agenda / schedule
create table if not exists student_agenda (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users on delete cascade,
  title text, date text, time text,
  description text, type text default 'Aula',
  created_at timestamptz default now()
);

-- Student activity log
create table if not exists student_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users on delete cascade,
  activity_type text, description text,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS: Disable for now (service_role bypasses anyway)
-- Enable and configure per-table when ready for production
-- ============================================================
alter table banners disable row level security;
alter table modules disable row level security;
alter table teachers disable row level security;
alter table learnings disable row level security;
alter table testimonials disable row level security;
alter table faqs disable row level security;
alter table hub_settings disable row level security;
alter table enrollments disable row level security;
alter table profiles disable row level security;
alter table student_enrollments disable row level security;
alter table student_messages disable row level security;
alter table student_invoices disable row level security;
alter table student_support disable row level security;
alter table student_agenda disable row level security;
alter table student_activity disable row level security;
