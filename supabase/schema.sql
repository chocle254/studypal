-- Study Pal database. Run once in the Supabase SQL editor (or applied by Claude through the Supabase connection).
-- Row Level Security is ON with no policies: the browser can't read these tables directly.
-- Only the Vercel server functions (using the service key) can.

create table if not exists students (
  id uuid primary key,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  name text not null,
  level text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  name text not null,
  current_topic int not null default 0,
  material_text text not null default '',
  style text,
  topics jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  topic_index int not null,
  kind text not null check (kind in ('baseline', 'check', 'final', 'quick')),
  score numeric not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists courses_student_idx on courses(student_id);
create index if not exists units_student_idx on units(student_id);
create index if not exists attempts_unit_idx on attempts(unit_id);

alter table students enable row level security;
alter table courses enable row level security;
alter table units enable row level security;
alter table attempts enable row level security;
