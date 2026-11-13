-- YARUKI: folders for study materials
-- Run this ONCE in the Supabase SQL Editor (safe to run again).

create table if not exists public.material_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now()
);

alter table public.material_folders enable row level security;

drop policy if exists "Users can view their own folders" on public.material_folders;
drop policy if exists "Users can create their own folders" on public.material_folders;
drop policy if exists "Users can update their own folders" on public.material_folders;
drop policy if exists "Users can delete their own folders" on public.material_folders;

create policy "Users can view their own folders"
  on public.material_folders for select
  using (auth.uid() = user_id);

create policy "Users can create their own folders"
  on public.material_folders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own folders"
  on public.material_folders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own folders"
  on public.material_folders for delete
  using (auth.uid() = user_id);

-- A material can sit in one folder. Deleting a folder keeps the files
-- and simply moves them back to "No folder".
alter table public.study_materials
  add column if not exists folder_id uuid
  references public.material_folders (id) on delete set null;

create index if not exists study_materials_folder_id_idx
  on public.study_materials (folder_id);

-- A material can only be placed in a folder that belongs to the same user.
create or replace function public.check_material_folder_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.folder_id is not null and not exists (
    select 1
    from public.material_folders f
    where f.id = new.folder_id
      and f.user_id = new.user_id
  ) then
    raise exception 'Folder does not belong to this user';
  end if;

  return new;
end;
$$;

drop trigger if exists study_materials_folder_owner on public.study_materials;

create trigger study_materials_folder_owner
  before insert or update of folder_id on public.study_materials
  for each row execute function public.check_material_folder_owner();
