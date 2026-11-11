-- YARUKI database schema (tables, Row Level Security, storage)
--
-- Reconstructed from BACKEND.md and the policies in the live project.
-- Run in the Supabase SQL Editor on a NEW project. On the existing project,
-- compare it against your live schema before running anything.

-- ---------------------------------------------------------------- tables

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  code        text,
  credits     numeric,
  created_at  timestamptz not null default now()
);

create table if not exists public.marks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  subject_id       uuid not null references public.subjects (id) on delete cascade,
  assessment_name  text not null,
  marks_obtained   numeric not null,
  max_marks        numeric not null check (max_marks > 0),
  assessment_date  date,
  created_at       timestamptz not null default now()
);

create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject_id  uuid references public.subjects (id) on delete set null,
  title       text not null,
  exam_date   timestamptz not null,
  syllabus    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_id   uuid references public.subjects (id) on delete set null,
  title        text not null,
  description  text,
  due_date     timestamptz,
  completed    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  subject_id        uuid references public.subjects (id) on delete set null,
  topic             text,
  duration_minutes  integer,
  session_date      date not null,
  completed         boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists public.study_materials (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject_id  uuid references public.subjects (id) on delete set null,
  title       text not null,
  file_name   text,
  file_path   text,
  file_type   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.study_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  plan_date     date,
  description   text,
  ai_generated  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Create a profile row automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------ Row Level Security

alter table public.profiles        enable row level security;
alter table public.subjects        enable row level security;
alter table public.marks           enable row level security;
alter table public.exams           enable row level security;
alter table public.assignments     enable row level security;
alter table public.study_sessions  enable row level security;
alter table public.study_materials enable row level security;
alter table public.study_plans     enable row level security;

-- profiles: a user can read and update only their own row
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- subjects and study_plans: plain ownership
create policy "Users can view their own subjects"
  on public.subjects for select using (auth.uid() = user_id);
create policy "Users can create their own subjects"
  on public.subjects for insert with check (auth.uid() = user_id);
create policy "Users can update their own subjects"
  on public.subjects for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own subjects"
  on public.subjects for delete using (auth.uid() = user_id);

create policy "Users can view their own study plans"
  on public.study_plans for select using (auth.uid() = user_id);
create policy "Users can create their own study plans"
  on public.study_plans for insert with check (auth.uid() = user_id);
create policy "Users can update their own study plans"
  on public.study_plans for update using (auth.uid() = user_id);
create policy "Users can delete their own study plans"
  on public.study_plans for delete using (auth.uid() = user_id);

-- marks: owner, and the subject must also belong to the same user
create policy "Users can view their own marks"
  on public.marks for select using (auth.uid() = user_id);
create policy "Users can insert their own marks"
  on public.marks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.subjects
      where subjects.id = marks.subject_id and subjects.user_id = auth.uid()
    )
  );
create policy "Users can update their own marks"
  on public.marks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.subjects
      where subjects.id = marks.subject_id and subjects.user_id = auth.uid()
    )
  );
create policy "Users can delete their own marks"
  on public.marks for delete using (auth.uid() = user_id);

-- exams, assignments, study_sessions, study_materials:
-- owner, and if a subject is set it must belong to the same user
do $$
declare
  t text;
begin
  foreach t in array array['exams', 'assignments', 'study_sessions', 'study_materials']
  loop
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      'Users can view their own ' || replace(t, '_', ' '), t);

    execute format(
      'create policy %I on public.%I for insert with check (
         auth.uid() = user_id
         and (subject_id is null or exists (
           select 1 from public.subjects
           where subjects.id = %I.subject_id and subjects.user_id = auth.uid()
         ))
       )',
      'Users can insert their own ' || replace(t, '_', ' '), t, t);

    execute format(
      'create policy %I on public.%I for update
         using (auth.uid() = user_id)
         with check (
           auth.uid() = user_id
           and (subject_id is null or exists (
             select 1 from public.subjects
             where subjects.id = %I.subject_id and subjects.user_id = auth.uid()
           ))
         )',
      'Users can update their own ' || replace(t, '_', ' '), t, t);

    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      'Users can delete their own ' || replace(t, '_', ' '), t);
  end loop;
end
$$;

-- ----------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do nothing;

-- Files live under "<user id>/<file>"; users can only touch their own folder.
create policy "Users can upload their own study materials"
  on storage.objects for insert
  with check (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "Users can view their own study materials"
  on storage.objects for select
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "Users can delete their own study materials"
  on storage.objects for delete
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
